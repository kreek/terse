"""sync_tests.py rejects a terse.json that would score nothing or score wrongly."""

from __future__ import annotations

import unittest
from pathlib import Path

import sync_tests

GOOD = {
    "task": "demo",
    "deliverables": ["out.md"],
    "intended_skills": ["draft"],
    "graders": [{"name": "short", "path": "out.md", "match": "not_contains", "pattern": r"(?:\S+\s+){50}\S+"}],
    "judge": [],
}


def problems(**changes) -> str:
    meta = {**GOOD, **changes}
    try:
        sync_tests.validate(Path("demo"), meta)
    except SystemExit as exc:
        return str(exc)
    return ""


class ValidateTest(unittest.TestCase):
    def test_a_well_formed_task_passes(self):
        self.assertEqual(problems(), "")

    def test_rejects_a_grader_on_a_file_that_is_not_a_deliverable(self):
        grader = {**GOOD["graders"][0], "path": "other.md"}
        self.assertIn("is not a deliverable", problems(graders=[grader]))

    def test_rejects_a_pattern_python_cannot_compile(self):
        grader = {**GOOD["graders"][0], "pattern": "(unclosed"}
        self.assertIn("does not compile", problems(graders=[grader]))

    def test_rejects_an_unknown_skill(self):
        self.assertIn("unknown", problems(intended_skills=["workflow"]))

    def test_rejects_a_task_with_nothing_to_score(self):
        self.assertIn("score nothing", problems(graders=[], judge=[]))

    def test_a_file_sync_no_longer_writes_is_stale(self):
        task = sync_tests.TASKS_DIR / "generation-readme"
        planned = {dest for _, dest in sync_tests.planned_copies(task)}
        self.assertEqual(sync_tests.stale_files(task, planned), [])
        without_judge = {d for d in planned if "judge" not in d.parts}
        stale = sync_tests.stale_files(task, without_judge)
        self.assertIn(task / "tests" / "judge" / "quality.toml", stale)

    def test_the_committed_tasks_are_in_sync(self):
        self.assertEqual(sync_tests.sync(check=True), 0)


if __name__ == "__main__":
    unittest.main()
