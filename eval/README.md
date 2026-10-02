# Terse evals

This suite measures whether an agent writes better prose with Terse installed
than without it. Each task runs twice on the same agent, model, and settings:
once bare and once with the plugin. It runs on
[Harbor](https://docs.harborframework.com), which sandboxes each trial in
Docker and records the agent's trajectory.
[RewardKit](https://docs.harborframework.com/core-concepts/rewardkit/quick-start)
scores the result.

The number to read is lift: the terse arm's reward minus the bare arm's, per
task and for the suite. Absolute rewards drift with model versions, so compare
the two arms of one run.

## Setup

```sh
uv tool install harbor            # 0.23.0 at the time of writing
docker info                       # Docker must be running
```

The driver scripts use the Python standard library, so `python3` (3.9 or
later) runs them with no install step.

Auth uses subscriptions, not API keys:

- Claude Code and the judge: run `claude setup-token` and export the result as
  `CLAUDE_CODE_OAUTH_TOKEN`. The driver sets `CLAUDE_FORCE_OAUTH=true`, so the
  agent bills the subscription and fails when the token is missing.
- Codex: a ChatGPT-authenticated `~/.codex/auth.json`. The driver sets
  `CODEX_FORCE_AUTH_JSON=true`, which uploads that file into the sandbox.

The driver exports those two `FORCE` flags into the `harbor` process rather
than the job config. Harbor scrubs the value of every credential-named agent
variable from the trial files, and a literal `true` there would rewrite every
`true` in `trajectory.json`.

## Run

```sh
python3 eval/scripts/run.py --suite smoke --agent claude-code --install-only   # wiring only, no model call
python3 eval/scripts/run.py --suite all --agent claude-code                    # both arms, lift report
python3 eval/scripts/run.py --suite all --agent codex --attempts 3
python3 eval/scripts/run.py --suite all --agent claude-code --preflight-only   # does the terse arm load Terse?
harbor view eval/runs                                                           # browse trials and rewards
```

`run.py` writes one Harbor job per arm under `eval/runs/`, runs them in order,
then calls `eval/scripts/lift.py <bare-job> <terse-job>`. That script prints
the report and writes it to `eval/runs/lift/`. Pass `--concurrency` to change
how many trials run at once; the default of 2 suits subscription rate limits.

A run with the terse arm starts with a preflight. The preflight runs the terse
arm on the suite's first task with verification off and lists the Terse skills
each trial loaded. When fewer than `--preflight-min` (default 0.5) of those
trials loaded one, `run.py` stops before the arms, because the terse arm would
measure the bare agent. `--skip-preflight` runs the arms anyway.

## How the terse arm loads the plugin

Harbor's skill injection copies skill folders into the agent's skills
directory. Terse's skills find the checker two directories above their
`SKILL.md`, and Claude Code's hook lives in `hooks/hooks.json`. Copying the
skills alone would leave both behind.

At the start of a run, `run.py` copies the plugin into
`eval/runs/terse-marketplace/<run>/` as a local marketplace. The agent classes
in `eval/agents/terse_agents.py` upload that copy to `/opt/terse-marketplace`.
They then load it the way a real install does:

- Claude Code starts with `--plugin-dir`, so skills appear as `terse:*` and
  the hook fires.
- Codex runs `codex plugin marketplace add` and `codex plugin add` before the
  task.

A skill edit made during a run reaches no trial. A failed upload stops the
trial with an error, so it cannot pass for a bare result.

## Tasks

Each task lives under `eval/tasks/<name>/`:

- `instruction.md`: the prompt. It never names Terse, because automatic
  activation is part of what the suite tests.
- `environment/workspace/`: files the agent starts with, copied to `/app`.
- `tests/terse.json`: the deliverables, the skills a terse trial should load,
  the regex graders, and the judge criteria.

| Task | Tests | Regex graders |
|---|---|---|
| `claudism-removal` | Editing strips every tell family | no tell phrases, vocabulary, or structures; facts present |
| `grammar-repair` | Grammar repair stays in scope | 16 planted errors gone, the comma splice fixed, the original style intact |
| `quote-verification` | The gate catches altered and invented quotes | tampered wording gone, invented quote gone, verbatim quote kept |
| `generation-readme` | Fresh prose comes out clean and short | no tells, under 200 words, facts present |
| `generation-explainer` | The same, for an explainer | no tells, under 200 words, facts present |
| `generation-launch` | The same, for launch copy | no tells, under 200 words, facts present |
| `generation-issue` | A feature request stays issue-sized | no user story, at most five acceptance criteria, under 200 words, facts present |
| `generation-slack` | A status update stays Slack-sized | under 50 words, no headings, facts present |
| `generation-email` | A request email stays short | under 125 words, facts present |
| `voice-email-length` | An approved voice's genre length replaces the default | under 50 words, no greeting, no sign-off, facts present |
| `generation-schema-explainer` | Facts supplied as a list come out as connected reasoning | facts present, under 300 words, prose not a list, no tells |
| `flow-repair` | An edit links a stack of true claims without losing one | facts present, under 230 words, no tells, prose not a list |

Most tasks also have judge criteria for what a pattern cannot check, such as
facts preserved or content accurate. A task whose `terse.json` sets
`judge_flow` also gets the shared `flow` criterion from
`eval/verifier/shared/judge/flow.toml`. It scores from 1 to 5 how well each
sentence follows from the one before it, so one definition of flow scores
every task. Single scores are noisy: in calibration, claim-stack paragraphs
averaged 2.75 and well-linked ones 3.75. So `lift.py` reports each arm's mean,
and on a task tagged `flow` the terse mean must beat the bare mean.
`flow-repair` carries no `flow` tag, because edits still tie the bare model
there, so its flow score is a readout. Setting `judge_flow` also changes a
task's reward, so its rewards from before the change do not compare with
later ones. Suites under `eval/suites/` list tasks by name.

## Scoring

The verifier copies each deliverable to `/logs/verifier/deliverables/` and
scores three dimensions:

- `graders`, weight 0.6: one pass or fail criterion per regex grader.
- `judge`, weight 0.4: the judge criteria, answered by a `claude-code` judge
  on the subscription token. Without credentials, or with
  `TERSE_EVAL_SKIP_JUDGE` set, the verifier drops the judge and the graders
  carry the reward.
- `skill_triggering`, weight 0: whether the trial loaded an intended Terse
  skill. It is a readout, because the bare arm loads none.

`lift.py` runs the repo's checker on the copied deliverables from the host. It
then applies the acceptance bar:

- every trial in both arms ran without error and produced its deliverables,
  and a task with judge criteria had its judge run
- the terse arm's deliverables hold zero AI tells
- the terse arm has fewer checker flags than bare, or both have none. On a
  grammar task it may not have more
- in a multi-task suite, at least one non-grammar task has fewer flags with
  Terse
- every terse trial passes every grader and judge criterion and loaded an
  intended skill
- no bare trial loaded a Terse skill

`lift.py` exits 1 when the bar fails.

## Editing the verifier

Harbor uploads only a task's own `tests/` directory, so the shared verifier
under `eval/verifier/shared/` goes into each task as a copy. After editing a shared
file or a `terse.json`, run:

```sh
python3 eval/scripts/sync_tests.py            # validate terse.json and write the copies
python3 -m unittest discover eval/verifier/tests
```

CI runs `sync_tests.py --check` and fails when a copy drifts. Harbor's own
interpreter also runs the agent-class tests, which skip under a plain
`python3`:

```sh
PYTHONPATH=eval/agents "$(uv tool dir)/harbor/bin/python" -m unittest discover eval/verifier/tests
```

The trial image pins Claude Code 2.1.282 and Codex 0.156.1. Those match the
`version` in `eval/agents/*.json`, so Harbor skips its own install, and they
match kreek/consult's eval image, so the two suites share Docker layers.
