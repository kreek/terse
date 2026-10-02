"""Shared verifier helpers for Terse Harbor tasks.

Synced from eval/verifier/shared/terse_lib.py into every task's tests/ by
eval/scripts/sync_tests.py. Do not edit the copy under tests/.

Standard library only, so the verifier runs it in the container and the host
scripts (preflight, lift) and unit tests import it directly.

  python3 terse_lib.py collect [workspace] [tests_dir]   copy deliverables and build the judge bundle
  python3 terse_lib.py prepare [tests_dir]               drop or inline the judge for this trial
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
from pathlib import Path

TESTS_DIR = Path("/tests")
VERIFIER_DIR = Path("/logs/verifier")
TRAJECTORY_PATH = Path("/logs/agent/trajectory.json")
# RewardKit passes the judge prompt as one `claude -p` argument, and Linux caps
# a single argument at 128 KiB. A larger bundle stays on disk for the judge to read.
INLINE_BUNDLE_LIMIT = 100_000

# The directory names under skills/. The verifier runs where the repo is absent;
# test_terse_lib.py fails when this set drifts from the plugin.
TERSE_SKILLS = frozenset({"brainstorm", "draft", "edit", "outline", "style", "write"})
SKILL_PATH_RE = re.compile(r"skills/([a-z][a-z0-9-]*)/SKILL\.md")
# Claude Code injects this line and the skill body as a user message once a Skill
# call resolves. A failed call injects nothing.
SKILL_BASE_DIR_RE = re.compile(r"Base directory for this skill: \S*/skills/([a-z][a-z0-9-]*)(?![\w/.-])")


def load_task_meta(tests_dir: Path = TESTS_DIR) -> dict:
    return json.loads((tests_dir / "terse.json").read_text())


FENCED_CODE_RE = re.compile(r"^[ \t]*(```|~~~).*?^[ \t]*\1[^\n]*$", re.MULTILINE | re.DOTALL)
WORD_RE = re.compile(r"\S*[^\W_]\S*")


def prose_words(text: str) -> int:
    """Words as document-lengths.md counts them: no fenced code, and no bare Markdown symbols."""
    return len(WORD_RE.findall(FENCED_CODE_RE.sub("", text)))


def grade_text(text: str | None, pattern: str, match: str) -> bool:
    """A missing file fails either way, as the old runner graded it.

    `max_words` reads `pattern` as the word limit; the other matches read it as a regex.
    """
    if text is None:
        return False
    if match == "max_words":
        return prose_words(text) <= int(pattern)
    hit = re.search(pattern, text) is not None
    return not hit if match == "not_contains" else hit


def grade_file(path: Path, pattern: str, match: str) -> bool:
    return grade_text(path.read_text(errors="replace") if path.is_file() else None, pattern, match)


def load_trajectory(path: Path | None = None) -> list[dict]:
    """The ATIF steps, or none when the agent left no trajectory."""
    path = path or TRAJECTORY_PATH
    if not path.is_file():
        return []
    return json.loads(path.read_text()).get("steps") or []


def read_skill_names(steps: list[dict]) -> list[str]:
    """Terse skills whose body reached the agent.

    Claude Code: the skill directory in the body it injects after a Skill call.
    Codex: a SKILL.md path in a tool call's arguments. Tool results are not
    read, so a file listing that shows a SKILL.md path is not a load.
    """
    names = set()
    for step in steps:
        if step.get("source") == "user":
            message = step.get("message")
            names.update(SKILL_BASE_DIR_RE.findall(message if isinstance(message, str) else json.dumps(message)))
        for call in step.get("tool_calls") or []:
            names.update(SKILL_PATH_RE.findall(json.dumps(call.get("arguments"))))
    return sorted(names & TERSE_SKILLS)


def final_agent_message(steps: list[dict]) -> str:
    messages = [str(s.get("message") or "").strip() for s in steps if s.get("source") == "agent"]
    return next((m for m in reversed(messages) if m), "")


def collect(workspace: Path, tests_dir: Path, out_dir: Path = VERIFIER_DIR) -> None:
    """Copy each deliverable out of the workspace and write the judge bundle beside it.

    Harbor downloads /logs/verifier with the trial, so lift.py can run the
    checker on the deliverables from the host.
    """
    deliverables = load_task_meta(tests_dir)["deliverables"]
    copies = out_dir / "deliverables"
    copies.mkdir(parents=True, exist_ok=True)
    sections = ["# The agent's deliverables", ""]
    for rel in deliverables:
        source = workspace / rel
        text = source.read_text(errors="replace") if source.is_file() else None
        if text is not None:
            shutil.copyfile(source, copies / rel)
        sections += [f"## {rel}", "", "```markdown", text if text is not None else "(missing)", "```", ""]
    final = final_agent_message(load_trajectory())
    sections += ["## Final agent message", "", final or "No final message was captured.", ""]
    (out_dir / "judge-bundle.md").write_text("\n".join(sections))


def judge_credentials_present() -> bool:
    judge = os.environ.get("REWARDKIT_JUDGE", "claude-code")
    if judge.startswith("anthropic/") or judge.lower().startswith("claude"):
        return bool(os.environ.get("CLAUDE_CODE_OAUTH_TOKEN") or os.environ.get("ANTHROPIC_API_KEY"))
    if judge.startswith("openai/") or judge.startswith("gpt"):
        return bool(os.environ.get("OPENAI_API_KEY"))
    return True


def prepare(tests_dir: Path, bundle_path: Path = VERIFIER_DIR / "judge-bundle.md") -> None:
    """Adjust the uploaded tests dir to what this trial can score.

    Without judge credentials, or with TERSE_EVAL_SKIP_JUDGE set, the judge is
    removed and its weight dropped, so the regex graders still produce a reward.
    Otherwise the claude-code judge gets its inputs inline and scores in one turn.
    """
    judge_dir = tests_dir / "judge"
    if not judge_dir.exists():
        return
    if os.environ.get("TERSE_EVAL_SKIP_JUDGE") or not judge_credentials_present():
        shutil.rmtree(judge_dir)
        reward = tests_dir / "reward.toml"
        reward.write_text(re.sub(r",\s*judge\s*=\s*[0-9.]+", "", reward.read_text()))
        sys.stderr.write("terse: judge skipped (no credentials or TERSE_EVAL_SKIP_JUDGE); reward excludes judge\n")
        return
    if os.environ.get("REWARDKIT_JUDGE", "claude-code") != "claude-code":
        return
    if bundle_path.is_file() and bundle_path.stat().st_size > INLINE_BUNDLE_LIMIT:
        sys.stderr.write("terse: judge bundle over the inline limit; the judge reads it from disk\n")
        return
    prompt = judge_dir / "prompt.md"
    instruction = (judge_dir / "instruction.md").read_text()
    bundle = bundle_path.read_text() if bundle_path.is_file() else "No bundle was built."
    prompt.write_text("\n".join([prompt.read_text().rstrip(), "", "# Task instruction", "",
                                 instruction.strip(), "", bundle.strip(), ""]))


def main(argv: list[str]) -> int:
    if argv[1:2] == ["collect"]:
        collect(Path(argv[2]) if len(argv) > 2 else Path("/app"), Path(argv[3]) if len(argv) > 3 else TESTS_DIR)
        return 0
    if argv[1:2] == ["prepare"]:
        prepare(Path(argv[2]) if len(argv) > 2 else TESTS_DIR)
        return 0
    sys.stderr.write("usage: terse_lib.py collect [workspace] [tests_dir] | prepare [tests_dir]\n")
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
