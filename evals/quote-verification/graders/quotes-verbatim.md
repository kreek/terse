---
type: llm
target: { source: file, path: article.md }
criteria: Every remaining quotation appears verbatim in source.md.
---
Compare every quotation left in article.md against source.md. Score 1 only
if each quoted passage appears in the source word for word (whitespace and
quote-mark differences aside) and the surrounding prose kept its meaning.
