"""Skill-loading preflight: does the terse arm load Terse at all?

A full run is meaningless when the agent never reads a Terse skill. run.py
calls this before the arms. It reads which skills each preflight trial's
trajectory loaded. Standard library only, so the tests run in CI.
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from itertools import chain
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(EVAL_DIR / "verifier" / "shared"))
import terse_lib as tl  # noqa: E402


def trial_task(trial_dir: Path) -> str:
    result = trial_dir / "result.json"
    name = json.loads(result.read_text()).get("task_name") if result.is_file() else None
    return (name or trial_dir.name.split("__")[0]).split("/")[-1]


def trial_skills(trial_dir: Path) -> list[str]:
    return tl.read_skill_names(tl.load_trajectory(trial_dir / "agent" / "trajectory.json"))


def loading_rows(job_dir: Path) -> list[dict]:
    """Per task: trials run, trials that read any Terse skill, and how often each skill was read."""
    by_task: dict[str, list[list[str]]] = {}
    for trial_dir in sorted(p.parent for p in job_dir.glob("*/result.json")):
        by_task.setdefault(trial_task(trial_dir), []).append(trial_skills(trial_dir))
    return [
        {"task": task, "trials": len(runs), "loaded": sum(1 for skills in runs if skills),
         "skills": Counter(chain.from_iterable(runs))}
        for task, runs in sorted(by_task.items())
    ]


def loading_rate(rows: list[dict]) -> float:
    trials = sum(r["trials"] for r in rows)
    return sum(r["loaded"] for r in rows) / trials if trials else 0.0


def render(rows: list[dict]) -> str:
    lines = ["| task | loaded Terse | skills read (trials) |", "| --- | ---: | --- |"]
    for row in rows:
        skills = ", ".join(f"{name} ({n})" for name, n in row["skills"].most_common()) or "none"
        lines.append(f"| {row['task']} | {row['loaded']}/{row['trials']} | {skills} |")
    lines.append(f"\nLoading rate: {loading_rate(rows):.0%}")
    return "\n".join(lines)
