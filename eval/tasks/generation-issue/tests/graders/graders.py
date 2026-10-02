# Synced from eval/verifier/shared/graders/graders.py by eval/scripts/sync_tests.py. Do not edit in tasks/.
"""One binary criterion per regex grader in the task's terse.json."""
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
import rewardkit as rk  # noqa: E402
import terse_lib as tl  # noqa: E402
from rewardkit import criterion  # noqa: E402


@criterion(description="{name}: {path} {match} the pattern")
def regex_grader(workspace: Path, name: str, path: str, match: str, pattern: str) -> bool:
    return tl.grade_file(workspace / path, pattern, match)


for grader in tl.load_task_meta()["graders"]:
    rk.regex_grader(grader["name"], grader["path"], grader["match"], grader["pattern"], name=grader["name"])
