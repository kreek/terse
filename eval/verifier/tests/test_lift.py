"""lift.py and preflight.py over fake Harbor job directories, with the real checker."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from helpers import claude_skill_steps

import lift
import preflight

CLEAN = "# logsift\n\nlogsift filters log records by level and time. Install it with Homebrew.\n"
TELLS = "# logsift\n\nIt is worth noting that logsift filters log records. Here is the thing: it delves into every line.\n"


def make_trial(job: Path, task: str, n: int, text: str | None, skills: list[str], criteria: dict,
               judged: bool = True, error: str | None = None) -> None:
    trial = job / f"{task}__{n}"
    (trial / "verifier" / "deliverables").mkdir(parents=True)
    (trial / "agent").mkdir()
    reward = sum(criteria.values()) / len(criteria) if criteria else 0.0
    result = {"task_name": f"terse/{task}", "verifier_result": {"rewards": {"reward": reward}}}
    if error:
        result = {"task_name": f"terse/{task}", "exception_info": {"exception_type": error}}
    (trial / "result.json").write_text(json.dumps(result))
    details = {"graders": {"criteria": [{"name": k, "value": 1.0 if v else 0.0} for k, v in criteria.items()]}}
    if judged:
        details["judge"] = {"criteria": [{"name": "accurate_content", "value": 1.0}]}
    (trial / "verifier" / "reward-details.json").write_text(json.dumps(details))
    steps = [s for skill in skills for s in claude_skill_steps(skill)]
    (trial / "agent" / "trajectory.json").write_text(json.dumps({"steps": steps}))
    if text is not None:
        (trial / "verifier" / "deliverables" / "README.md").write_text(text)


def run_lift(bare: dict, terse: dict) -> tuple[list[dict], list[str]]:
    root = Path(tempfile.mkdtemp())
    jobs = {}
    for arm, spec in (("bare", bare), ("terse", terse)):
        make_trial(root / arm, "generation-readme", 0, **spec)
        jobs[arm] = lift.load_job(root / arm)
    files = [f for job in jobs.values() for ts in job.values() for t in ts for f in t["deliverables"]]
    rows = lift.task_rows(jobs, sorted(jobs["terse"]), lift.run_checker(files))
    return rows, lift.acceptance(rows)


GOOD_TERSE = {"text": CLEAN, "skills": ["draft"], "criteria": {"facts-present": True}}
BARE = {"text": TELLS, "skills": [], "criteria": {"facts-present": False}}


class AcceptanceTest(unittest.TestCase):
    def test_clean_terse_output_beating_bare_passes(self):
        rows, failures = run_lift(BARE, GOOD_TERSE)
        self.assertEqual(failures, [])
        self.assertEqual(rows[0]["reward"], {"bare": 0.0, "terse": 1.0})
        self.assertEqual(rows[0]["checker"]["terse"]["aiTells"], 0)
        self.assertGreater(rows[0]["checker"]["bare"]["aiTells"], 0)

    def test_ai_tells_in_the_terse_arm_fail(self):
        _, failures = run_lift(BARE, {**GOOD_TERSE, "text": TELLS})
        self.assertTrue(any("AI tell" in f for f in failures), failures)

    def test_a_failed_grader_in_the_terse_arm_fails(self):
        _, failures = run_lift(BARE, {**GOOD_TERSE, "criteria": {"facts-present": False}})
        self.assertTrue(any("failed facts-present" in f for f in failures), failures)

    def test_a_terse_trial_that_loaded_no_skill_fails(self):
        _, failures = run_lift(BARE, {**GOOD_TERSE, "skills": []})
        self.assertTrue(any("loaded no intended skill" in f for f in failures), failures)

    def test_a_bare_trial_that_loaded_terse_fails(self):
        _, failures = run_lift({**BARE, "skills": ["style"]}, GOOD_TERSE)
        self.assertTrue(any("bare trial" in f and "style" in f for f in failures), failures)

    def test_a_missing_deliverable_fails(self):
        _, failures = run_lift(BARE, {**GOOD_TERSE, "text": None})
        self.assertTrue(any("produced no deliverables" in f for f in failures), failures)

    def test_an_errored_trial_is_named_as_an_error(self):
        _, failures = run_lift(BARE, {**GOOD_TERSE, "error": "AgentTimeoutError"})
        self.assertTrue(any("errored (AgentTimeoutError)" in f for f in failures), failures)

    def test_a_trial_scored_without_its_judge_fails(self):
        _, failures = run_lift({**BARE, "judged": False}, GOOD_TERSE)
        self.assertTrue(any("bare trial" in f and "without the judge" in f for f in failures), failures)


class FlowGateTest(unittest.TestCase):
    def row(self, tags, bare, terse):
        trial = lambda score: {"trial": "t__0", "criteria": {}, "skills": ["draft"], "flow": score}  # noqa: E731
        return {"tags": tags, "intended": {"draft"},
                "trials": {"bare": [trial(s) for s in bare], "terse": [trial(s) for s in terse]}}

    def test_flow_tasks_need_a_higher_terse_mean(self):
        self.assertEqual(lift.flow_failures(self.row(["flow"], [2, 3], [4, 4])), [])
        failures = lift.flow_failures(self.row(["flow"], [3, 4], [3, 3]))
        self.assertTrue(any("not above bare" in f for f in failures), failures)

    def test_other_tasks_report_flow_without_gating(self):
        self.assertEqual(lift.flow_failures(self.row(["generation"], [4, 4], [2, 2])), [])

    def test_the_flow_score_is_read_back_onto_the_1_to_5_scale(self):
        details = {"judge": {"criteria": [{"name": "flow", "value": 0.75}, {"name": "accurate", "value": 1.0}]}}
        self.assertEqual(lift.flow_score(details), 4.0)
        self.assertEqual(lift.criteria(details), {"accurate": True})


class BootstrapTest(unittest.TestCase):
    def test_interval_brackets_a_constant_lift(self):
        trial = lambda r: {"reward": r}  # noqa: E731
        jobs = {"bare": {"t": [trial(0.2), trial(0.2)]}, "terse": {"t": [trial(0.7), trial(0.7)]}}
        self.assertAlmostEqual(lift.suite_lift(jobs, ["t"]), 0.5)
        low, high = lift.bootstrap_interval(jobs, ["t"])
        self.assertAlmostEqual(low, 0.5)
        self.assertAlmostEqual(high, 0.5)

    def test_one_attempt_gives_no_interval(self):
        jobs = {"bare": {"t": [{"reward": 0.2}]}, "terse": {"t": [{"reward": 0.7}]}}
        self.assertIsNone(lift.bootstrap_interval(jobs, ["t"]))
        self.assertIn("at least 2 attempts", lift.interval_text(None))


class PreflightTest(unittest.TestCase):
    def test_loading_rate_counts_trials_that_read_a_terse_skill(self):
        job = Path(tempfile.mkdtemp())
        make_trial(job, "claudism-removal", 0, CLEAN, ["edit", "style"], {})
        make_trial(job, "claudism-removal", 1, CLEAN, [], {})
        rows = preflight.loading_rows(job)
        self.assertEqual(rows[0]["loaded"], 1)
        self.assertEqual(preflight.loading_rate(rows), 0.5)
        self.assertIn("edit (1)", preflight.render(rows))


if __name__ == "__main__":
    unittest.main()
