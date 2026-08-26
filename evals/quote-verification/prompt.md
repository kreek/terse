---
name: quote-verification
tags: [editing, quotes]
runs: 3
max_turns: 10
allowed_tools: ["Read", "Write", "Edit", "Bash"]
---
Create a file named `source.md` with exactly the content between the first
BEGIN and END markers, and a file named `article.md` with exactly the content
between the second pair (do not include the markers). Then prepare
`article.md` for publishing: every quotation must match its source, word for
word. Fix or remove any quotation that fails, and change nothing else.

BEGIN
# Field Notes on Review

A reviewer reads the diff twice: once for what changed, and once for
what the change forgot. The second read finds the bug the first read
excused. Reviewers who annotate as they go leave a record the author
can answer point by point.
END

BEGIN
# Review Practice

Our guide is blunt: "A reviewer reads the diff twice: once for what
changed, and once for what the change forgot", per the local
[field notes](./source.md).

Memory drifts a word: "The second read catches the bug the first
read excused", per the same [field notes](./source.md).

And it invents outright: "a reviewer owes the author one question
for every comment they leave behind", again per the
[field notes](./source.md).
END
