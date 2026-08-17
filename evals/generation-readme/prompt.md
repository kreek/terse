---
name: generation-readme
tags: [generation]
runs: 3
max_turns: 10
allowed_tools: ["Read", "Write", "Edit"]
---
Write a README.md for the following command-line tool. Cover what it does,
installation, usage with examples, configuration, and license. Write it for
a developer audience. Save it as `README.md`.

The tool is `logsift`, a single-binary log filter:

- reads newline-delimited JSON logs from stdin or from files
- filters by level, time range, and field matchers (`--where key=value`)
- outputs matching lines as JSON, plain text, or a count
- config file at `~/.logsift.toml` can set default filters and output format
- installed via `brew install logsift` or a downloaded release binary
- flags: `--level`, `--since`, `--until`, `--where` (repeatable),
  `--format json|text|count`, `--config`
- exit codes: 0 matches found, 1 no matches, 2 usage or read error
- MIT licensed
