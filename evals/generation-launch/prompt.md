---
name: generation-launch
tags: [generation, ai-tells]
runs: 3
max_turns: 10
allowed_tools: ["Read", "Write", "Edit"]
---
Write a launch post of 140 to 190 words for a developer audience. Save it as
`launch.md`.

The product is QueueLens 1.0, a local command-line tool that inspects
RabbitMQ dead-letter queues. It can group failures by exception type, show the
first and latest occurrence, export selected messages as newline-delimited
JSON, and replay selected messages only after a `--confirm` flag. It reads
connection settings from `~/.queuelens.toml`, runs without a hosted service,
and is MIT licensed. Installation is `brew install queuelens`.
