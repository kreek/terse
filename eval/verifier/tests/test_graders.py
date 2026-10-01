"""Fact graders accept the wordings a correct deliverable uses.

Moved from test/plugin-contract.test.js when the cases became Harbor tasks.
Each case is prose a model produced or could produce with every fact intact.
"""

from __future__ import annotations

import unittest

from helpers import EVAL_DIR

import terse_lib as tl


def grader(task: str, name: str) -> dict:
    meta = tl.load_task_meta(EVAL_DIR / "tasks" / task / "tests")
    return next(g for g in meta["graders"] if g["name"] == name)


def passes(task: str, name: str, prose: str) -> bool:
    g = grader(task, name)
    return tl.grade_text(prose, g["pattern"], g["match"])


class FactGraderTest(unittest.TestCase):
    def test_accepts_equivalent_batch_and_deduplication_word_order(self):
        for prose in (
            "Customer change\nfeeds retry, then batch writes and deduplicate them. Cache\nhit rates increase throughput.",
            "Customer change feeds retry, then batch and deduplicate writes. Cache hit rates increase throughput.",
        ):
            self.assertTrue(passes("claudism-removal", "facts-present", prose), prose)

    def test_accepts_semantic_readme_wording_for_input_and_exit_codes(self):
        prose = " ".join([
            "Logsift reads files or standard\ninput.",
            "Use --level, --since, --until, --where, --format, --config, and ~/.logsift.toml.",
            "Install with brew\ninstall logsift or a release\nbinary.",
            "Exit `0` means records matched; `1` means no logs matched; `2` means invalid input or a read error.",
            "License: MIT.",
        ])
        self.assertTrue(passes("generation-readme", "facts-present", prose))

    def test_accepts_wrapped_explainer_facts(self):
        for prose in (
            "A B-tree avoids a full\ntable scan. Writes cost more\nwork, so do\nnot add an index without a measured query.",
            "A B-tree means the engine need not inspect every row. Extra indexes slow writes, so do not automatically index every column.",
            "Without an index, the database may inspect every row. A B-tree narrows the search. More indexes mean write speed falls. Skip one for tiny tables.",
            "A B-tree avoids a full table scan. Indexes make writes more expensive and increase write work. Avoid unused indexes.",
            "An index uses a B-tree instead of reading every table row. Indexes add work to writes. Do not add an index by default.",
        ):
            self.assertTrue(passes("generation-explainer", "facts-present", prose), prose)

    def test_accepts_wrapped_launch_facts(self):
        prose = " ".join([
            "QueueLens\n1.0 reads RabbitMQ dead-letter queues and groups by exception\ntype.",
            "It shows the first and latest\noccurrence and exports newline-delimited\nJSON.",
            "Use --confirm and ~/.queuelens.toml. There is no hosted\ncontrol\nplane.",
            "Install with brew\ninstall queuelens. MIT.",
        ])
        self.assertTrue(passes("generation-launch", "facts-present", prose))


class LengthAndTellGraderTest(unittest.TestCase):
    def test_under_length_fails_at_201_words(self):
        self.assertTrue(passes("generation-readme", "under-length", " ".join(["word"] * 200)))
        self.assertFalse(passes("generation-readme", "under-length", " ".join(["word"] * 201)))

    def test_no_ai_tells_catches_an_em_dash(self):
        self.assertFalse(passes("generation-launch", "no-ai-tells", "Fast — and local."))


if __name__ == "__main__":
    unittest.main()
