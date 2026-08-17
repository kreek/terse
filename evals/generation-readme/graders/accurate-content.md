---
type: llm
target: { source: file, path: README.md }
criteria: Complete, accurate, and free of invented features.
---
Score 1 only if the README documents all given facts (stdin and file input,
the four filter/format flag groups, config file path, both install methods,
the three exit codes, MIT license), invents no features or flags beyond
them, and the usage examples are consistent with the stated flags.
