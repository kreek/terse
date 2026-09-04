---
type: llm
target: { source: file, path: launch.md }
criteria: Covers every supplied product fact without inventing features.
---
Score 1 only if the post accurately covers QueueLens 1.0, RabbitMQ dead-letter
queues, grouping by exception type, first and latest occurrence, NDJSON export,
confirmed replay, the config path, local-only operation, Homebrew installation,
and the MIT license. Fail for invented features or services.
