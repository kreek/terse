# Synced from eval/verifier/shared/Dockerfile by eval/scripts/sync_tests.py. Do not edit in tasks/.
FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl ca-certificates python3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/
ENV UV_TOOL_BIN_DIR=/usr/local/bin
RUN uv tool install harbor-rewardkit==0.2.1
# Preinstalled agent CLIs: Harbor skips its per-trial install when the binary
# already matches the version pinned in eval/agents/*.json, and the RewardKit
# judge reuses `claude` from PATH. Keep these versions in step with those files.
# The pins match kreek/consult's eval image, so the two suites share these layers.
RUN npm install -g @anthropic-ai/claude-code@2.1.282 @openai/codex@0.156.1 \
    && npm cache clean --force

COPY workspace/ /app
WORKDIR /app
RUN rm -f /app/.gitkeep
