#!/usr/bin/env python3
"""Run a Terse suite through Harbor with and without the plugin, then report lift.

Examples:
  python3 eval/scripts/run.py --suite smoke --agent claude-code --install-only
  python3 eval/scripts/run.py --suite all --agent claude-code
  python3 eval/scripts/run.py --suite all --agent codex --attempts 3
  python3 eval/scripts/run.py --suite all --agent claude-code --preflight-only

One Harbor job is written and started per arm. The bare arm is Harbor's own
agent with no plugin. The terse arm uses the matching agent class in
eval/agents/terse_agents.py, which uploads a snapshot of the plugin taken when
the run starts, so a skill edit during the run reaches no trial.

Before the arms, a preflight runs the terse arm on the first --preflight-tasks
tasks with verification off and reports which Terse skills each trial loaded.
The run stops when the share of preflight trials that loaded any skill is below
--preflight-min, because the terse arm would then measure the bare agent.

Job configs and results land under eval/runs/. Standard library only.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import preflight

EVAL_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = EVAL_DIR.parent
RUNS_DIR = EVAL_DIR / "runs"
ARMS = ("bare", "terse")
# What a marketplace install of Terse ships. package.json sets "type": "module",
# which the vendored Harper build needs.
PLUGIN_PATHS = (".claude-plugin", ".codex-plugin", "hooks", "scripts", "skills", "vendor", "package.json")
MARKETPLACE_NAME = "terse-local"


def load_suite(name: str) -> list[str]:
    path = EVAL_DIR / "suites" / f"{name}.json"
    if not path.is_file():
        raise SystemExit(f"unknown suite {name!r}; expected {path}")
    tasks = json.loads(path.read_text())["tasks"]
    missing = [t for t in tasks if not (EVAL_DIR / "tasks" / t / "task.toml").is_file()]
    if missing:
        raise SystemExit(f"suite {name} lists tasks without a Harbor task dir: {', '.join(missing)}")
    return tasks


def load_agent(name: str, model: str | None) -> tuple[dict, dict[str, str]]:
    """The agent fragment and the host_env exported to the harbor process."""
    path = EVAL_DIR / "agents" / f"{name}.json"
    if not path.is_file():
        raise SystemExit(f"unknown agent {name!r}; expected {path}")
    agent = {k: v for k, v in json.loads(path.read_text()).items() if not k.startswith("_")}
    host_env = {k: str(v) for k, v in agent.pop("host_env", {}).items()}
    if model:
        agent["model_name"] = model
    return agent, host_env


def snapshot_marketplace(dest: Path) -> Path:
    """A local Codex marketplace whose one plugin is also a Claude Code --plugin-dir."""
    plugin = dest / "plugins" / "terse"
    for rel in PLUGIN_PATHS:
        source = REPO_DIR / rel
        if source.is_dir():
            shutil.copytree(source, plugin / rel, ignore=shutil.ignore_patterns("__pycache__", ".DS_Store"))
        else:
            plugin.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, plugin / rel)
    manifest = {
        "name": MARKETPLACE_NAME,
        "interface": {"displayName": "Terse (eval snapshot)"},
        "plugins": [{"name": "terse", "source": {"source": "local", "path": "./plugins/terse"},
                     "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
                     "category": "Productivity"}],
    }
    (dest / ".agents" / "plugins").mkdir(parents=True)
    (dest / ".agents" / "plugins" / "marketplace.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return dest


def arm_agent(agent: dict, arm: str, marketplace: Path, effort: str | None) -> dict:
    """Harbor AgentConfig for one arm. Only the terse arm names the subclass and the snapshot."""
    kwargs = dict(agent.get("kwargs", {}))
    if effort:
        kwargs["reasoning_effort"] = effort
    config = {"model_name": agent["model_name"], "kwargs": kwargs}
    if arm == "bare":
        config["name"] = agent["name"]
    else:
        config["import_path"] = agent["terse_import_path"]
        kwargs["terse_marketplace"] = str(marketplace)
    return config


def job_config(name: str, tasks: list[str], agent: dict, args: argparse.Namespace, **extra) -> dict:
    return {
        "job_name": name,
        "jobs_dir": str(RUNS_DIR),
        "n_attempts": args.attempts,
        "n_concurrent_trials": args.concurrency,
        "install_only": bool(args.install_only),
        "tasks": [{"path": str(EVAL_DIR / "tasks" / t)} for t in tasks],
        "agents": [agent],
        **extra,
    }


def start_job(config: dict, extra: list[str], host_env: dict[str, str]) -> Path:
    config_path = RUNS_DIR / f"{config['job_name']}.job.json"
    config_path.write_text(json.dumps(config, indent=2))
    cmd = ["harbor", "run", "-c", str(config_path), "--yes", *extra]
    pythonpath = os.pathsep.join(filter(None, [str(EVAL_DIR / "agents"), os.environ.get("PYTHONPATH")]))
    print("+", " ".join(f"{k}={v}" for k, v in host_env.items()), " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True, env={**os.environ, **host_env, "PYTHONPATH": pythonpath})
    return RUNS_DIR / config["job_name"]


def run_preflight(args, label: str, tasks: list[str], terse_agent: dict, host_env: dict) -> int | None:
    """Exit code that ends the run after the preflight, or None to go on to the arms."""
    config = job_config(f"{label}-preflight", tasks[:args.preflight_tasks], terse_agent, args,
                        verifier={"disable": True})
    config["n_attempts"] = args.preflight_attempts
    rows = preflight.loading_rows(start_job(config, args.harbor_args, host_env))
    print("\n## Preflight: terse-arm skill loading\n\n" + preflight.render(rows) + "\n", flush=True)
    rate = preflight.loading_rate(rows)
    if args.preflight_only:
        return 0
    if rate < args.preflight_min:
        print(f"preflight: loading rate {rate:.0%} is below --preflight-min {args.preflight_min:.0%}; "
              "not running the arms (pass --skip-preflight to override)", file=sys.stderr)
        return 3
    return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--suite", required=True, help="name of a file under eval/suites/")
    parser.add_argument("--agent", required=True, help="name of a file under eval/agents/")
    parser.add_argument("--arms", default="bare,terse", help="subset of bare,terse")
    parser.add_argument("--model", help="override the agent fragment's model_name")
    parser.add_argument("--effort", choices=("low", "medium", "high", "xhigh", "max"),
                        help="override the agent fragment's reasoning_effort")
    parser.add_argument("--attempts", type=int, default=1, help="Harbor n_attempts per task")
    parser.add_argument("--concurrency", type=int, default=2, help="Harbor n_concurrent_trials")
    parser.add_argument("--install-only", action="store_true", help="agent setup only; proves wiring and auth")
    parser.add_argument("--no-lift", action="store_true", help="skip the lift report")
    parser.add_argument("--skip-preflight", action="store_true", help="run the arms without the preflight")
    parser.add_argument("--preflight-only", action="store_true", help="run the preflight and stop")
    parser.add_argument("--preflight-tasks", type=int, default=1, help="how many of the suite's tasks the preflight runs")
    parser.add_argument("--preflight-attempts", type=int, default=1, help="preflight trials per task")
    parser.add_argument("--preflight-min", type=float, default=0.5,
                        help="minimum share of preflight trials that must load a Terse skill")
    parser.add_argument("harbor_args", nargs="*", help="extra args passed to `harbor run` after --")
    args = parser.parse_args()
    args.arms = [a.strip() for a in args.arms.split(",") if a.strip()]
    unknown = [a for a in args.arms if a not in ARMS]
    if unknown:
        parser.error(f"unknown arms {unknown}; choose from {ARMS}")
    return args


def report(args, job_dirs: dict[str, Path]) -> int:
    if args.no_lift or args.install_only or set(job_dirs) != set(ARMS):
        for arm, job_dir in job_dirs.items():
            print(f"{arm}: {job_dir}")
        return 0
    cmd = [sys.executable, str(EVAL_DIR / "scripts" / "lift.py"), str(job_dirs["bare"]), str(job_dirs["terse"])]
    return subprocess.run(cmd).returncode


def main() -> int:
    args = parse_args()
    tasks = load_suite(args.suite)
    agent, host_env = load_agent(args.agent, args.model)
    label = f"{dt.datetime.now():%Y-%m-%dT%H-%M-%S}-{args.suite}-{args.agent}"
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    marketplace = snapshot_marketplace(RUNS_DIR / "terse-marketplace" / label)
    agents = {arm: arm_agent(agent, arm, marketplace, args.effort) for arm in args.arms}

    if "terse" in agents and not (args.skip_preflight or args.install_only):
        stop = run_preflight(args, label, tasks, agents["terse"], host_env)
        if stop is not None:
            return stop

    job_dirs = {arm: start_job(job_config(f"{label}-{arm}", tasks, agents[arm], args), args.harbor_args, host_env)
                for arm in args.arms}
    return report(args, job_dirs)


if __name__ == "__main__":
    raise SystemExit(main())
