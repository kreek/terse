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



GOOD_ISSUE = """# Export invoices to CSV

Finance users copy invoice rows by hand. Add a CSV export to the invoice list.

The export respects the list's current filters and includes the invoice number,
customer name, issue date, due date, amount, currency, and status. Dates use
ISO 8601. Only the Billing Admin role can export. An export over 10,000 rows
arrives as an emailed download link.

## Acceptance criteria

- A Billing Admin can export the filtered list to CSV.
- Other roles see no export action.
- An export over 10,000 rows sends an email with a download link.
"""

GOOD_SLACK = ("Payments deploy moved from 14:00 today to 10:00 UTC tomorrow. The DB migration failed "
              "its staging dry run; production is fine. Priya is fixing it. Please hold merges to the "
              "payments repo until it ships.\n")

GOOD_EMAIL = """Subject: Moving our renewal to April 1

Dana, can we move our contract renewal from March 1 to April 1 on the same terms?
Our budget approval meeting is on March 20, so we cannot sign before then.
Could you let me know by February 14 so I can tell finance?
"""

GOOD_VOICE_EMAIL = """Subject: Final logo files by Thursday

Can you send the final logo files in SVG, with the one-colour version, by
Thursday? The print vendor needs them Friday morning for the trade-show banners.
"""


def failing(task: str, prose: str) -> list[str]:
    meta = tl.load_task_meta(EVAL_DIR / "tasks" / task / "tests")
    return [g["name"] for g in meta["graders"] if not tl.grade_text(prose, g["pattern"], g["match"])]


class LengthTaskGraderTest(unittest.TestCase):
    def test_a_person_sized_deliverable_passes_every_grader(self):
        for task, prose in (("generation-issue", GOOD_ISSUE), ("generation-slack", GOOD_SLACK),
                            ("generation-email", GOOD_EMAIL), ("voice-email-length", GOOD_VOICE_EMAIL)):
            self.assertEqual(failing(task, prose), [], task)

    def test_a_user_story_fails_the_issue(self):
        story = GOOD_ISSUE + "\nAs a finance user, I want to export invoices so that I stop copying rows.\n"
        self.assertEqual(failing("generation-issue", story), ["no-user-story"])

    def test_a_sixth_acceptance_criterion_fails_the_issue(self):
        extra = "".join(f"- Criterion {n} holds.\n" for n in range(4, 7))
        self.assertEqual(failing("generation-issue", GOOD_ISSUE + extra), ["at-most-five-criteria"])
        self.assertEqual(failing("generation-issue", GOOD_ISSUE + extra.split("\n", 2)[-1]), [])

    def test_a_loose_or_paren_numbered_criteria_list_still_counts(self):
        loose = "\n\n".join(f"- Criterion {n} holds." for n in range(1, 7))
        numbered = "\n".join(f"{n}) Criterion {n} holds." for n in range(1, 7))
        for criteria in (loose, numbered):
            issue = GOOD_ISSUE.split("## Acceptance criteria")[0] + "## Acceptance criteria\n\n" + criteria + "\n"
            self.assertIn("at-most-five-criteria", failing("generation-issue", issue), criteria)

    def test_a_memo_shaped_slack_message_fails(self):
        self.assertIn("no-headings", failing("generation-slack", "## Deploy update\n\n" + GOOD_SLACK))
        self.assertIn("under-length", failing("generation-slack", GOOD_SLACK + GOOD_SLACK))

    def test_a_padded_email_fails_the_length(self):
        padded = GOOD_EMAIL + "\n" + " ".join(["More background about the account history."] * 15)
        self.assertEqual(failing("generation-email", padded), ["under-length"])

    def test_the_default_email_shape_fails_the_voice(self):
        default = ("Hi Sam,\n\nThanks for all your great work on this project. The board really liked the "
                   "last round.\n\n" + GOOD_VOICE_EMAIL.split("\n", 2)[2] +
                   "\nLet me know if anything gets in the way.\n\nThanks,\nAlastair\n")
        self.assertEqual(failing("voice-email-length", default),
                         ["under-voice-length", "no-greeting", "no-sign-off"])

    def test_a_list_after_the_criteria_is_not_a_criterion(self):
        fields = "\n## Fields\n\n- invoice number\n- customer name\n- issue date\n"
        self.assertEqual(failing("generation-issue", GOOD_ISSUE + fields), [])

    def test_code_and_markdown_symbols_do_not_count_as_words(self):
        code = "\n```\n" + " ".join(["token"] * 300) + "\n```\n"
        table = "\n| Field | Type |\n|---|---|\n| amount | decimal |\n"
        self.assertEqual(failing("generation-issue", GOOD_ISSUE + code + table), [])

    def test_user_story_variants(self):
        for story in ("As finance users, we want to export invoices.", "As a Billing Admin I'd like a CSV button."):
            self.assertIn("no-user-story", failing("generation-issue", GOOD_ISSUE + story + "\n"), story)
        plain = GOOD_ISSUE + "As a result, I can stop copying rows.\n"
        self.assertNotIn("no-user-story", failing("generation-issue", plain))

    def test_common_slack_wordings_keep_the_facts(self):
        for hold in ("Please don't merge to the payments repo", "Avoid merging to payments", "Merge freeze on payments"):
            message = ("Payments deploy rescheduled to 10:00 UTC tomorrow. The migration failed its staging dry "
                       f"run; production is fine. Priya is on it. {hold} until then.\n")
            self.assertEqual(failing("generation-slack", message), [], hold)

    def test_ordinal_dates_keep_the_email_facts(self):
        email = GOOD_EMAIL.replace("March 1 to April 1", "1st March to 1st April")
        self.assertEqual(failing("generation-email", email), [])

    def test_voice_sign_off_and_greeting_variants(self):
        body = GOOD_VOICE_EMAIL.split("\n", 2)[2]
        self.assertIn("no-greeting", failing("voice-email-length", "Sam,\n\n" + body))
        self.assertIn("no-sign-off", failing("voice-email-length", body + "\nThanks for turning these around fast.\n"))
        self.assertIn("no-sign-off", failing("voice-email-length", body + "\nAlastair\n"))
        self.assertEqual(failing("voice-email-length", "Subject: Logo\n\nBest format is SVG.\n" + body), [])


if __name__ == "__main__":
    unittest.main()
