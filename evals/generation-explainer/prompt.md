---
name: generation-explainer
tags: [generation, ai-tells]
runs: 3
max_turns: 60
allowed_tools: ["Read", "Write", "Edit", "Bash", "Skill"]
---
This is a one-shot run with nobody to answer questions. Treat any outline or skeleton as approved in advance and do not pause for sign-off; the finished file is the only deliverable.

Write a short technical explainer (140 to 190 words) titled "How database
indexes speed up queries" for junior developers who know SQL basics but not
internals. Cover: what an index is, how a B-tree lookup avoids a full table
scan, why writes get slower as indexes are added, and when not to add an
index. Save it as `explainer.md`.
