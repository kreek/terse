#!/bin/bash
# Synced from eval/verifier/shared/test.sh by eval/scripts/sync_tests.py. Do not edit in tasks/.
set -euo pipefail
cd /app
mkdir -p /logs/verifier
python3 /tests/terse_lib.py collect /app /tests
# prepare inlines the bundle into the judge prompt, so it runs after collect.
python3 /tests/terse_lib.py prepare /tests
# The claude-code judge ignores quality.toml's reasoning_effort; its CLI reads this.
export CLAUDE_CODE_EFFORT_LEVEL=low
rewardkit /tests --workspace /app --output /logs/verifier/reward.json
