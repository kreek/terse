"""The terse-arm agent classes load the whole plugin.

Needs Harbor importable, so it skips under a plain python3. Run it with
Harbor's interpreter:

  PYTHONPATH=eval/agents "$(uv tool dir)/harbor/bin/python" -m unittest discover eval/verifier/tests
"""

from __future__ import annotations

import asyncio
import tempfile
import unittest
from pathlib import Path

from helpers import EVAL_DIR

try:
    import sys

    sys.path.insert(0, str(EVAL_DIR / "agents"))
    import terse_agents as ta
except ImportError:  # Harbor is not installed in this interpreter.
    ta = None


class FakeResult:
    def __init__(self, return_code):
        self.return_code = return_code


class FakeEnvironment:
    def __init__(self, probe_code=0):
        self.uploads = []
        self.commands = []
        self.probe_code = probe_code

    async def upload_dir(self, source, target):
        self.uploads.append((source, target))

    async def exec(self, command):
        self.commands.append(command)
        return FakeResult(self.probe_code)


@unittest.skipIf(ta is None, "harbor is not importable")
class TerseAgentsTest(unittest.TestCase):
    def make(self, cls, **kwargs):
        return cls(logs_dir=Path(tempfile.mkdtemp()), model_name="anthropic/claude-opus-5-5", **kwargs)

    def test_claude_code_loads_the_plugin_dir(self):
        agent = self.make(ta.TerseClaudeCode, terse_marketplace="/snap", reasoning_effort="high")
        self.assertTrue(agent.build_cli_flags().endswith(f"--plugin-dir {ta.REMOTE_PLUGIN_ROOT}"))
        self.assertIn("--effort high", agent.build_cli_flags())

    def test_codex_installs_from_the_local_marketplace(self):
        agent = self.make(ta.TerseCodex, terse_marketplace="/snap")
        command = agent._build_register_skills_command()
        self.assertIn(f"codex plugin marketplace add {ta.REMOTE_MARKETPLACE}", command)
        self.assertIn("codex plugin add terse@terse-local", command)

    def test_upload_sends_the_snapshot_to_the_remote_marketplace(self):
        agent = self.make(ta.TerseClaudeCode, terse_marketplace="/snap")
        env = FakeEnvironment()
        asyncio.run(ta.upload_marketplace(agent, env))
        self.assertEqual(env.uploads, [("/snap", ta.REMOTE_MARKETPLACE)])

    def test_an_upload_the_container_cannot_see_fails_the_trial(self):
        agent = self.make(ta.TerseClaudeCode, terse_marketplace="/snap")
        with self.assertRaisesRegex(RuntimeError, "upload missing"):
            asyncio.run(ta.upload_marketplace(agent, FakeEnvironment(probe_code=1)))

    def test_a_missing_snapshot_fails_loudly(self):
        agent = self.make(ta.TerseClaudeCode)
        with self.assertRaisesRegex(ValueError, "terse_marketplace"):
            asyncio.run(ta.upload_marketplace(agent, FakeEnvironment()))


if __name__ == "__main__":
    unittest.main()
