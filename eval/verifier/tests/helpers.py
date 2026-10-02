"""Shared paths and trajectory fixtures for the eval unit tests.

Fixtures follow real Harbor ATIF trajectories: Claude Code invokes a skill with
the Skill tool and injects the body as a user message; Codex reads SKILL.md
with a shell command.
"""

from __future__ import annotations

import sys
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = EVAL_DIR.parent
for sub in ("verifier/shared", "scripts"):
    sys.path.insert(0, str(EVAL_DIR / sub))


def claude_skill_steps(skill: str) -> list[dict]:
    return [
        {"source": "agent", "message": "", "tool_calls": [
            {"tool_call_id": "c1", "function_name": "Skill", "arguments": {"skill": f"terse:{skill}"}}]},
        {"source": "user",
         "message": f"Base directory for this skill: /opt/terse-marketplace/plugins/terse/skills/{skill}\n\n# Body"},
    ]


def codex_read_step(skill: str) -> dict:
    path = f"/tmp/codex-home/plugins/cache/terse-local/terse/0.13.1/skills/{skill}/SKILL.md"
    return {"source": "agent", "message": "", "tool_calls": [
        {"tool_call_id": "c1", "function_name": "exec_command", "arguments": {"cmd": f"sed -n 1,200p {path}"}}]}
