"""Harbor agents that install the whole Terse plugin, as a real install does.

Harbor's `skills` injection copies skill folders into the agent's skills
directory. Terse's skills find the checker two directories above their
SKILL.md, and Claude Code's hook lives in hooks/hooks.json, so copying the
skills alone would leave both behind. These subclasses upload a marketplace
snapshot (eval/scripts/run.py builds it) and load the plugin from it:

- Claude Code: `--plugin-dir`, so skills appear as `terse:*` and the hook fires.
- Codex: `codex plugin marketplace add` and `codex plugin add`, run where
  Harbor would register skills, after it creates CODEX_HOME.

run.py selects these through `import_path` for the terse arm only, with
eval/agents on PYTHONPATH. The bare arm uses Harbor's own agents.
"""

from __future__ import annotations

import shlex

from pydantic import Field

from harbor.agents.installed.claude_code import ClaudeCode, ClaudeCodeOptions
from harbor.agents.installed.codex import Codex, CodexOptions
from harbor.environments.base import BaseEnvironment

REMOTE_MARKETPLACE = "/opt/terse-marketplace"
REMOTE_PLUGIN_ROOT = f"{REMOTE_MARKETPLACE}/plugins/terse"
MARKETPLACE_NAME = "terse-local"

PLUGIN_FIELD = Field(default=None, description="Host path of the Terse marketplace snapshot to upload.")


class TerseClaudeCodeOptions(ClaudeCodeOptions):
    terse_marketplace: str | None = PLUGIN_FIELD


class TerseCodexOptions(CodexOptions):
    terse_marketplace: str | None = PLUGIN_FIELD


async def upload_marketplace(agent, environment: BaseEnvironment) -> None:
    source = agent.options.terse_marketplace
    if not source:
        raise ValueError(f"{type(agent).__name__} needs kwargs.terse_marketplace; run it through eval/scripts/run.py")
    await environment.upload_dir(source, REMOTE_MARKETPLACE)
    # A failed upload would leave the terse arm measuring the bare agent; stop the trial instead.
    probe = f"test -f {shlex.quote(REMOTE_PLUGIN_ROOT)}/scripts/style-check.mjs"
    result = await environment.exec(command=probe)
    if result.return_code != 0:
        raise RuntimeError(f"Terse plugin upload missing from {REMOTE_PLUGIN_ROOT}")


class TerseClaudeCode(ClaudeCode):
    options_model = TerseClaudeCodeOptions

    async def setup(self, environment: BaseEnvironment) -> None:
        await super().setup(environment)
        await upload_marketplace(self, environment)

    def build_cli_flags(self) -> str:
        return " ".join(filter(None, [super().build_cli_flags(), f"--plugin-dir {shlex.quote(REMOTE_PLUGIN_ROOT)}"]))


class TerseCodex(Codex):
    options_model = TerseCodexOptions

    async def setup(self, environment: BaseEnvironment) -> None:
        await super().setup(environment)
        await upload_marketplace(self, environment)

    def _build_register_skills_command(self) -> str | None:
        install = (f"codex plugin marketplace add {shlex.quote(REMOTE_MARKETPLACE)} && "
                   f"codex plugin add terse@{MARKETPLACE_NAME} "
                   '|| { echo "terse: plugin install failed" >&2; exit 1; }')
        return "\n".join(filter(None, [super()._build_register_skills_command(), install]))
