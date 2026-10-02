# Synced from eval/verifier/shared/skill_triggering/skill_triggering.py by eval/scripts/sync_tests.py. Do not edit in tasks/.
"""Zero-weight readout: did the agent load one of the task's intended Terse skills?"""
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
import terse_lib as tl  # noqa: E402
from rewardkit import criterion  # noqa: E402


@criterion
def intended_skill_loaded(workspace: Path) -> bool:
    intended = set(tl.load_task_meta()["intended_skills"])
    return bool(intended & set(tl.read_skill_names(tl.load_trajectory())))
