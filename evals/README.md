# Terse eval suite

Proves the plugin's claim with A/B tests on both supported hosts. Each case
runs once with Terse and once without it. The suite must show better prose
with the plugin on, with no AI-tell editing signals in a plugin-on output.

Note: `claude plugin eval` is in early access. If it prints an
early-access message, ask an Anthropic contact for enablement. The case
files here match the documented format and run unchanged once enabled.

Until then, `npm run eval:fallback` runs the same cases through
headless `claude -p` sessions. The with arm loads the plugin via
`--plugin-dir`; the without arm runs `--bare`. Regex graders score both
arms; llm and tool_used graders wait for the real tool. The runner
needs `ANTHROPIC_API_KEY` exported: `--bare` sessions never read OAuth,
so a subscription login cannot carry them.

`npm run eval:codex` runs four approved genres through the active Codex
default model: README, explainer, launch post, and planted-tell edit. It uses
ephemeral temporary workspaces with project rules disabled. The with arm sets
`plugins."terse@terse".enabled=true`; the without arm changes only that value
to `false`. Each arm uses an isolated Codex home that shares the installed
plugin and authentication. This avoids CLI builds that ignore a nested `-c`
plugin override. The report records the provider, CLI version, model slug, date,
files, graders, and checker metrics. It requires a logged-in Codex CLI and a
local `terse@terse` install. A failed preflight prints the install or login
command needed to continue.

## Run it

```
npm run eval          # full suite, 3 runs per case, cost-capped
npm run eval:quick    # one run of the headline case
npm run eval:codex    # four Codex genres, one run per arm
npm run eval:codex:quick  # planted-tell Codex smoke evaluation
node scripts/eval-score.mjs evals/results/latest.json   # re-score a past run
```

Set `CODEX_BIN` when the executable to test is not first on `PATH`. The report
records the version returned by that exact executable.

This spends real tokens. It is a local or nightly job, not per-push CI.

## Cases

| Case | Proves | Deterministic graders |
|---|---|---|
| `claudism-removal` | Editing strips every tell family | regex not_contains per family (phrases, vocabulary, structures) on the edited file |
| `grammar-repair` | Grammar-assistant parity with scope discipline | 16 planted errors gone (recall), original style intact (precision), comma splice fixed |
| `generation-readme` | Fresh prose comes out clean and short | no tells in the produced README; under 200 words |
| `generation-explainer` | Same, different genre | no tells in the produced explainer; under 200 words |
| `generation-launch` | Fresh launch copy avoids model defaults | no tells in the produced post; under 200 words |
| `quote-verification` | The gate catches altered and invented quotes | tampered wording gone, invented quote gone, verbatim quote kept |

Each case adds two more graders. An `llm` grader judges what patterns
cannot: facts preserved, content accurate. A `tool_used: Skill` indicator
shows whether a terse skill fired in the with-arm. Ablation leaves the
indicator out of the score. If it never fires, the case measured nothing;
fix the skill descriptions, not the prose.

Prompts never mention Terse or its skills by name. Automatic activation is
part of what is under test. Direct invocation belongs in the separate CLI and
Desktop smoke checks.

## Reading results

`aggregate-result.json` holds per-arm grader scores, and the eval's own
summary shows the delta per case. `scripts/eval-score.mjs` then runs the
checker over every produced document. It prints flags per thousand words,
AI-tell count, and grade per arm.

Acceptance bar:

- with-arm AI tells equal zero on every produced document
- a clean with-arm never has more flags than its paired output; a zero/zero
  tie passes because no result can improve below zero
- at least one style case in the full suite has fewer total flags with Terse
- grammar-repair recall and precision graders pass in the with-arm
- the skill-fired indicator is positive in every with-arm run
- all supplied facts survive the planted edit and generation content graders

The without-arm need not fail every individual tell grader. The required
contrast is fewer total flags in each with-arm output. If authentication or
skill telemetry is unavailable, the runner fails with an actionable message
and the live A/B claim remains unproven.
