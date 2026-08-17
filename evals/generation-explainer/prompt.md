---
name: generation-explainer
tags: [generation]
runs: 3
max_turns: 10
allowed_tools: ["Read", "Write", "Edit"]
---
Write a short technical explainer (400 to 600 words) titled "How database
indexes speed up queries" for junior developers who know SQL basics but not
internals. Cover: what an index is, how a B-tree lookup avoids a full table
scan, why writes get slower as indexes are added, and when not to add an
index. Save it as `explainer.md`.
