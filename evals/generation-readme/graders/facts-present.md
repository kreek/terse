---
type: regex
target: { source: file, path: README.md }
pattern: "(?is)(?=.*(?:stdin|standard\\s+input))(?=.*files?)(?=.*--level)(?=.*--since)(?=.*--until)(?=.*--where)(?=.*--format)(?=.*--config)(?=.*~/\\.logsift\\.toml)(?=.*brew\\s+install\\s+logsift)(?=.*release\\s+binary)(?=.*\\x600\\x60.{0,100}(?:match|record))(?=.*\\x601\\x60.{0,100}(?:none|no.{0,20}(?:record(?:s)?|match(?:es)?)|without.{0,20}(?:record(?:s)?|match(?:es)?)|empty))(?=.*\\x602\\x60.{0,120}(?:usage|invalid|read|error))(?=.*MIT)"
match: contains
---
Every supplied interface, installation path, exit-code meaning, and license
remains mechanically visible.
