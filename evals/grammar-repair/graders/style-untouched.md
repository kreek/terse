---
type: regex
target: { source: file, path: notes.md }
pattern: "(?i)decided to separate the config from the code|previous release|error rate"
match: contains
---
The fix stays inside grammar scope: these grammatical phrasings from the
original must survive unrewritten, showing the pass did not restyle the
document.
