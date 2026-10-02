"""The verifier's shared helpers: grading, skill detection, deliverable collection, judge preparation.

  python3 -m unittest discover eval/verifier/tests
"""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from helpers import REPO_DIR, claude_skill_steps, codex_read_step

import terse_lib as tl


class GradeTextTest(unittest.TestCase):
    def test_contains_passes_on_a_match(self):
        self.assertTrue(tl.grade_text("License: MIT.", r"MIT", "contains"))

    def test_not_contains_fails_on_a_match(self):
        self.assertFalse(tl.grade_text("It is robust.", r"(?i)\brobust\b", "not_contains"))

    def test_a_missing_file_fails_both_ways(self):
        self.assertFalse(tl.grade_text(None, r"x", "contains"))
        self.assertFalse(tl.grade_text(None, r"x", "not_contains"))

    def test_inline_flags_apply_as_in_the_old_runner(self):
        self.assertTrue(tl.grade_text("First line\nsecond LINE", r"(?is)first.*line", "contains"))


class SkillDetectionTest(unittest.TestCase):
    def test_terse_skills_match_the_plugin(self):
        on_disk = {p.parent.name for p in (REPO_DIR / "skills").glob("*/SKILL.md")}
        self.assertEqual(tl.TERSE_SKILLS, on_disk)

    def test_claude_code_injected_skill_counts(self):
        self.assertEqual(tl.read_skill_names(claude_skill_steps("draft")), ["draft"])

    def test_codex_skill_read_counts(self):
        self.assertEqual(tl.read_skill_names([codex_read_step("edit")]), ["edit"])

    def test_a_listing_in_a_tool_result_is_not_a_load(self):
        step = {"source": "agent", "tool_calls": [{"tool_call_id": "c1", "function_name": "Bash",
                                                    "arguments": {"command": "ls"}}],
                "observation": {"results": [{"source_call_id": "c1", "content": "skills/style/SKILL.md"}]}}
        self.assertEqual(tl.read_skill_names([step]), [])

    def test_another_plugins_skill_does_not_count(self):
        step = {"source": "user", "message": "Base directory for this skill: /x/skills/workflow"}
        self.assertEqual(tl.read_skill_names([step]), [])


class CollectTest(unittest.TestCase):
    def test_copies_deliverables_and_bundles_them_with_the_final_message(self):
        root = Path(tempfile.mkdtemp())
        (root / "app").mkdir()
        (root / "tests").mkdir()
        (root / "app" / "README.md").write_text("# Tool\n")
        (root / "tests" / "terse.json").write_text(json.dumps({"deliverables": ["README.md", "missing.md"]}))
        trajectory = root / "trajectory.json"
        trajectory.write_text(json.dumps({"steps": [{"source": "agent", "message": "Done."}]}))
        with mock.patch.object(tl, "TRAJECTORY_PATH", trajectory):
            tl.collect(root / "app", root / "tests", root / "out")
        self.assertEqual((root / "out" / "deliverables" / "README.md").read_text(), "# Tool\n")
        bundle = (root / "out" / "judge-bundle.md").read_text()
        self.assertIn("# Tool", bundle)
        self.assertIn("## missing.md\n\n```markdown\n(missing)", bundle)
        self.assertIn("Done.", bundle)


class PrepareTest(unittest.TestCase):
    def tests_dir(self) -> Path:
        tests = Path(tempfile.mkdtemp())
        (tests / "judge").mkdir()
        (tests / "judge" / "prompt.md").write_text("Judge this.\n")
        (tests / "judge" / "instruction.md").write_text("Write a README.\n")
        (tests / "reward.toml").write_text("weights = { graders = 0.6, judge = 0.4, skill_triggering = 0.0 }\n")
        return tests

    def test_without_credentials_the_judge_and_its_weight_go(self):
        tests = self.tests_dir()
        with mock.patch.dict(os.environ, {}, clear=True):
            tl.prepare(tests, tests / "absent-bundle.md")
        self.assertFalse((tests / "judge").exists())
        self.assertEqual((tests / "reward.toml").read_text(),
                         "weights = { graders = 0.6, skill_triggering = 0.0 }\n")

    def test_with_credentials_the_inputs_are_inlined(self):
        tests = self.tests_dir()
        bundle = tests / "bundle.md"
        bundle.write_text("## README.md\n")
        with mock.patch.dict(os.environ, {"CLAUDE_CODE_OAUTH_TOKEN": "t"}, clear=True):
            tl.prepare(tests, bundle)
        prompt = (tests / "judge" / "prompt.md").read_text()
        self.assertIn("Write a README.", prompt)
        self.assertIn("## README.md", prompt)


if __name__ == "__main__":
    unittest.main()
