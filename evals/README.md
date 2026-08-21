# Terse eval suite

Proves the plugin's claim with an A/B test. `claude plugin eval` runs each
case twice, once with the plugin and once without, and reports the score
delta. Ablation is the tool's default whenever a plugin resolves. The
suite must show better prose with the plugin on, and above all that no
claudisms or AI tells survive.

Note: `claude plugin eval` is in early access. If it prints an
early-access message, ask an Anthropic contact for enablement. The case
files here match the documented format and run unchanged once enabled.

Until then, `npm run eval:fallback` runs the same cases through
headless `claude -p` sessions. The with arm loads the plugin via
`--plugin-dir`; the without arm runs `--bare`. Regex graders score both
arms; llm and tool_used graders wait for the real tool. The runner
needs `ANTHROPIC_API_KEY` exported: `--bare` sessions never read OAuth,
so a subscription login cannot carry them.

## Run it

```
npm run eval          # full suite, 3 runs per case, cost-capped
npm run eval:quick    # one run of the headline case
node scripts/eval-score.mjs evals/results/latest.json   # re-score a past run
```

This spends real tokens. It is a local or nightly job, not per-push CI.

## Cases

| Case | Proves | Deterministic graders |
|---|---|---|
| `claudism-removal` | Editing strips every tell family | regex not_contains per family (phrases, vocabulary, structures) on the edited file |
| `grammar-repair` | Grammar-assistant parity with scope discipline | 16 planted errors gone (recall), original style intact (precision), comma splice fixed |
| `generation-readme` | Fresh prose comes out clean and short | no tells in the produced README; under 350 words |
| `generation-explainer` | Same, different genre | no tells in the produced explainer; under 600 words |

Each case adds two more graders. An `llm` grader judges what patterns
cannot: facts preserved, content accurate. A `tool_used: Skill` indicator
shows whether a terse skill fired in the with-arm. Ablation leaves the
indicator out of the score. If it never fires, the case measured nothing;
fix the skill descriptions, not the prose.

Prompts never mention terse or its skills by name. Auto-triggering is
part of what is under test.

## Reading results

`aggregate-result.json` holds per-arm grader scores, and the eval's own
summary shows the delta per case. `scripts/eval-score.mjs` then runs the
checker over every produced document. It prints flags per thousand words,
AI-tell count, and grade per arm.

Acceptance bar:

- with-arm AI tells equal zero on every produced document
- with-arm flags per thousand words below the without-arm mean, per case
- grammar-repair recall and precision graders pass in the with-arm
- the skill-fired indicator is positive in every with-arm run

The without-arm should fail the tell graders. That contrast is the
demonstration.
