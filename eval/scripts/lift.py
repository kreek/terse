#!/usr/bin/env python3
"""Compare a bare Harbor job with a terse job: lift, graders, checker metrics, acceptance.

  python3 eval/scripts/lift.py eval/runs/<bare-job> eval/runs/<terse-job>

Lift is the terse arm's mean reward minus the bare arm's, per task and for the
suite. The suite lift carries a 90% bootstrap interval over trials resampled
within each task. A trial without a reward (agent or verifier failure) counts
as 0 and is listed.

The checker runs here on the host, over the deliverables each trial's verifier
copied to verifier/deliverables/, because the image does not ship it.

Acceptance, the bar the suite must clear:
  - every trial in both arms ran without error and produced its deliverables,
    and a task with judge criteria had its judge run
  - the terse arm's deliverables hold zero AI tells
  - the terse arm has fewer checker flags than bare, or both have none; on a
    grammar task, no more flags than bare
  - in a suite of more than one task, at least one non-grammar task has fewer
    flags with Terse
  - every terse trial passes every grader and judge criterion and loaded an
    intended skill. The old runner left LLM graders unscored; here they count
  - on a task tagged `flow`, the terse arm's mean 1-5 flow score beats bare's
  - no bare trial loaded a Terse skill

Writes runs/lift/<terse-job>.json and .md and exits 1 when acceptance fails.
"""

from __future__ import annotations

import argparse
import json
import random
import statistics
import subprocess
import sys
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = EVAL_DIR.parent
CHECKER = REPO_DIR / "scripts" / "style-check.mjs"
sys.path.insert(0, str(EVAL_DIR / "verifier" / "shared"))
import terse_lib as tl  # noqa: E402

ARMS = ("bare", "terse")
BOOTSTRAP_ROUNDS = 2000


def task_meta(task: str) -> dict:
    return tl.load_task_meta(EVAL_DIR / "tasks" / task / "tests")


def reward_details(trial_dir: Path) -> dict:
    path = trial_dir / "verifier" / "reward-details.json"
    return json.loads(path.read_text()) if path.is_file() else {}


def has_judge(meta: dict) -> bool:
    return bool(meta.get("judge") or meta.get("judge_flow"))


def criteria(details: dict) -> dict[str, bool]:
    """Pass or fail grader and judge criteria by name. The 1-5 flow score is read separately."""
    return {c["name"]: c["value"] >= 1.0
            for dimension in ("graders", "judge") for c in (details.get(dimension) or {}).get("criteria", [])
            if c["name"] != "flow"}


def flow_score(details: dict) -> float | None:
    """The judge's 1-5 flow score, from RewardKit's 0-1 normalized value."""
    for c in (details.get("judge") or {}).get("criteria", []):
        if c["name"] == "flow":
            return 1 + 4 * c["value"]
    return None


def load_trial(trial_dir: Path) -> dict:
    result = json.loads((trial_dir / "result.json").read_text())
    rewards = (result.get("verifier_result") or {}).get("rewards") or {}
    error = (result.get("exception_info") or {}).get("exception_type")
    details = reward_details(trial_dir)
    return {
        "trial": trial_dir.name,
        "task": (result.get("task_name") or trial_dir.name.split("__")[0]).split("/")[-1],
        "reward": rewards.get("reward"),
        "error": error,
        "criteria": criteria(details),
        "judged": "judge" in details,
        "flow": flow_score(details),
        "skills": tl.read_skill_names(tl.load_trajectory(trial_dir / "agent" / "trajectory.json")),
        "deliverables": sorted(str(p) for p in (trial_dir / "verifier" / "deliverables").glob("*")),
    }


def load_job(job_dir: Path) -> dict[str, list[dict]]:
    """task name -> its trials."""
    by_task: dict[str, list[dict]] = {}
    for result_path in sorted(job_dir.glob("*/result.json")):
        trial = load_trial(result_path.parent)
        by_task.setdefault(trial["task"], []).append(trial)
    return by_task


def run_checker(files: list[str]) -> dict[str, dict]:
    """path -> {flags, words, aiTells, grade} from the repo's checker."""
    if not files:
        return {}
    out = subprocess.run(["node", str(CHECKER), "--json", *files], capture_output=True, text=True)
    if not out.stdout.strip():
        raise SystemExit(f"lift: the checker produced no JSON: {out.stderr.strip()}")
    return {doc["file"]: {"flags": len(doc["flags"]), "words": doc["stats"]["words"],
                          "aiTells": doc["stats"]["aiTells"], "grade": doc["stats"]["grade"]}
            for doc in json.loads(out.stdout)}


def checker_summary(trials: list[dict], scores: dict[str, dict]) -> dict | None:
    docs = [scores[f] for t in trials for f in t["deliverables"] if f in scores]
    if not docs:
        return None
    words = sum(d["words"] for d in docs)
    flags = sum(d["flags"] for d in docs)
    return {"docs": len(docs), "flags": flags, "flagsPerKword": flags / words * 1000 if words else 0.0,
            "aiTells": sum(d["aiTells"] for d in docs), "meanGrade": statistics.mean(d["grade"] for d in docs)}


def reward_of(trial: dict) -> float:
    return trial["reward"] if trial["reward"] is not None else 0.0


def mean_reward(trials: list[dict]) -> float:
    return statistics.mean(reward_of(t) for t in trials) if trials else 0.0


def suite_lift(jobs: dict[str, dict], tasks: list[str]) -> float:
    return statistics.mean(mean_reward(jobs["terse"][t]) - mean_reward(jobs["bare"].get(t, [])) for t in tasks)


def bootstrap_interval(jobs: dict[str, dict], tasks: list[str], seed: int = 0) -> tuple[float, float] | None:
    """90% interval of the suite lift, resampling trials within each task and arm.

    None when any task has fewer than two trials in an arm: one trial resamples
    to itself, and a zero-width interval would read as certainty.
    """
    if any(len(jobs[arm].get(t, [])) < 2 for arm in ARMS for t in tasks):
        return None
    rng = random.Random(seed)
    draws = []
    for _ in range(BOOTSTRAP_ROUNDS):
        sample = {arm: {t: rng.choices(jobs[arm][t], k=len(jobs[arm][t])) for t in tasks if jobs[arm].get(t)}
                  for arm in ARMS}
        draws.append(suite_lift(sample, tasks))
    draws.sort()
    return draws[int(0.05 * len(draws))], draws[int(0.95 * len(draws)) - 1]


def task_rows(jobs: dict[str, dict], tasks: list[str], scores: dict[str, dict]) -> list[dict]:
    rows = []
    for task in tasks:
        arms = {arm: jobs[arm].get(task, []) for arm in ARMS}
        rows.append({
            "task": task,
            "tags": task_meta(task).get("tags", []),
            "intended": set(task_meta(task)["intended_skills"]),
            "trials": arms,
            "reward": {arm: mean_reward(trials) for arm, trials in arms.items()},
            "checker": {arm: checker_summary(trials, scores) for arm, trials in arms.items()},
        })
    return rows


def output_failures(row: dict, expects_judge: bool) -> list[str]:
    """Trials that errored, left no deliverable, or were scored without their judge."""
    failures = []
    for arm in ARMS:
        for trial in row["trials"][arm]:
            if trial["error"]:
                failures.append(f"{arm} trial {trial['trial']} errored ({trial['error']})")
            elif not trial["deliverables"]:
                failures.append(f"{arm} trial {trial['trial']} produced no deliverables")
            elif expects_judge and not trial["judged"]:
                failures.append(f"{arm} trial {trial['trial']} was scored without the judge")
    return failures


def flag_failures(row: dict) -> list[str]:
    terse, bare = row["checker"]["terse"], row["checker"]["bare"]
    if not terse or not bare:
        return []
    failures = [f"terse deliverables hold {terse['aiTells']} AI tell(s)"] if terse["aiTells"] else []
    if "grammar" in row["tags"]:
        worse = terse["flags"] > bare["flags"]
    else:
        worse = terse["flags"] > 0 and terse["flags"] >= bare["flags"]
    if worse:
        failures.append(f"terse flags ({terse['flags']}) {'above' if 'grammar' in row['tags'] else 'not below'} "
                        f"bare ({bare['flags']})")
    return failures


def mean_flow(trials: list[dict]) -> float | None:
    scores = [t["flow"] for t in trials if t["flow"] is not None]
    return statistics.mean(scores) if scores else None


def flow_failures(row: dict) -> list[str]:
    """On a flow task, the terse arm's mean flow score must beat the bare arm's.

    Single 1-5 scores are noisy (eval/verifier/shared/judge/flow.toml), so the
    gate compares arm means instead of holding each trial to a threshold.
    """
    if "flow" not in row["tags"]:
        return []
    bare, terse = (mean_flow(row["trials"][arm]) for arm in ARMS)
    if bare is None or terse is None or terse > bare:
        return []
    return [f"terse flow {terse:.2f} is not above bare {bare:.2f}"]


def trial_failures(row: dict) -> list[str]:
    failures = []
    for trial in row["trials"]["terse"]:
        failed = sorted(name for name, passed in trial["criteria"].items() if not passed)
        if failed:
            failures.append(f"terse trial {trial['trial']} failed {', '.join(failed)}")
        if not row["intended"] & set(trial["skills"]):
            failures.append(f"terse trial {trial['trial']} loaded no intended skill")
    for trial in row["trials"]["bare"]:
        if trial["skills"]:
            failures.append(f"bare trial {trial['trial']} loaded Terse skills: {', '.join(trial['skills'])}")
    return failures


def acceptance(rows: list[dict]) -> list[str]:
    failures = [f"{row['task']}: {message}" for row in rows
                for message in (*output_failures(row, has_judge(task_meta(row["task"]))),
                                *flag_failures(row), *trial_failures(row), *flow_failures(row))]
    style = [row for row in rows if "grammar" not in row["tags"] and all(row["checker"].values())]
    improved = [row for row in style if row["checker"]["terse"]["flags"] < row["checker"]["bare"]["flags"]]
    if len(rows) > 1 and not improved:
        failures.append("suite: no style task has fewer flags with Terse")
    return failures


def fmt_checker(summary: dict | None) -> str:
    if not summary:
        return "n/a"
    return f"{summary['flagsPerKword']:.1f}/kw, {summary['aiTells']} tells, grade {summary['meanGrade']:.1f}"


def fmt_flow(score: float | None) -> str:
    return f"{score:.2f}" if score is not None else "n/a"


def pass_rate(trials: list[dict], name: str) -> str:
    graded = [t["criteria"][name] for t in trials if name in t["criteria"]]
    return f"{sum(graded)}/{len(graded)}" if graded else "n/a"


def interval_text(interval: tuple[float, float] | None) -> str:
    if interval is None:
        return "no interval: it needs at least 2 attempts per task in each arm"
    low, high = interval
    noise = " (not distinguishable from noise)" if low <= 0 <= high else ""
    return f"90% interval [{low:+.2f}, {high:+.2f}]{noise}"


def render(rows: list[dict], lift: float, interval: tuple[float, float] | None, failures: list[str]) -> str:
    lines = ["## Lift", "", "| task | bare | terse | lift | bare checker | terse checker |",
             "| --- | ---: | ---: | ---: | --- | --- |"]
    for row in rows:
        r = row["reward"]
        lines.append(f"| {row['task']} | {r['bare']:.2f} | {r['terse']:.2f} | {r['terse'] - r['bare']:+.2f} | "
                     f"{fmt_checker(row['checker']['bare'])} | {fmt_checker(row['checker']['terse'])} |")
    lines += ["", f"Suite lift: {lift:+.2f}, {interval_text(interval)}", "",
              "## Graders (passed/trials, bare then terse)", "", "| task | criterion | bare | terse |",
              "| --- | --- | ---: | ---: |"]
    for row in rows:
        names = sorted({n for arm in ARMS for t in row["trials"][arm] for n in t["criteria"]})
        lines += [f"| {row['task']} | {n} | {pass_rate(row['trials']['bare'], n)} | "
                  f"{pass_rate(row['trials']['terse'], n)} |" for n in names]
    flowed = [row for row in rows if any(mean_flow(row["trials"][arm]) is not None for arm in ARMS)]
    if flowed:
        lines += ["", "## Flow (judge, 1-5 mean)", "", "| task | bare | terse |", "| --- | ---: | ---: |"]
        lines += [f"| {row['task']} | {fmt_flow(mean_flow(row['trials']['bare']))} | "
                  f"{fmt_flow(mean_flow(row['trials']['terse']))} |" for row in flowed]
    lines += ["", "## Acceptance", ""] + ([f"- FAIL {f}" for f in failures] or ["- passed"])
    return "\n".join(lines) + "\n"


def summary_json(rows: list[dict], lift: float, interval: tuple[float, float] | None, failures: list[str]) -> dict:
    return {
        "suite_lift": lift, "interval90": list(interval) if interval else None, "acceptance_failures": failures,
        "tasks": [{"task": r["task"], "reward": r["reward"], "checker": r["checker"],
                   "trials": {arm: [{k: t[k] for k in ("trial", "reward", "error", "criteria", "judged", "flow", "skills")}
                                    for t in r["trials"][arm]] for arm in ARMS}} for r in rows],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("bare_job", type=Path)
    parser.add_argument("terse_job", type=Path)
    args = parser.parse_args()
    jobs = {"bare": load_job(args.bare_job), "terse": load_job(args.terse_job)}
    tasks = sorted(jobs["terse"])
    if not tasks:
        raise SystemExit(f"lift: no trials in {args.terse_job}")
    scores = run_checker([f for job in jobs.values() for trials in job.values() for t in trials for f in t["deliverables"]])
    rows = task_rows(jobs, tasks, scores)
    lift, interval = suite_lift(jobs, tasks), bootstrap_interval(jobs, tasks)
    failures = acceptance(rows)
    report = render(rows, lift, interval, failures)
    out = EVAL_DIR / "runs" / "lift"
    out.mkdir(parents=True, exist_ok=True)
    (out / f"{args.terse_job.name}.md").write_text(report)
    (out / f"{args.terse_job.name}.json").write_text(json.dumps(summary_json(rows, lift, interval, failures), indent=2))
    print(report)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
