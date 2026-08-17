---
name: grammar-repair
tags: [grammar]
runs: 3
max_turns: 10
allowed_tools: ["Read", "Write", "Edit"]
---
Create a file named `notes.md` with exactly the content between the BEGIN
and END markers (do not include the markers), then fix the grammar,
spelling, and punctuation in that file. Do not change the writing style,
sentence order, or word choice beyond what correctness requires.

BEGIN
# Deploy Notes

The deploy pipeline have three stages, and each stage run in it's own
container. Once the tests passes, the artifacts is uploaded to the
registry.

Their are two rollback paths. If the canary fail, the system revert to the
previous release, this happens automatic. You're on-call engineer gets
paged when the error rate rise above the threshold.

The team decided to seperate the config from the code, however the
migration was to complex to finish in one sprint. Its now planned for the
next quater, and the affects of the change will be monitored closely.
END
