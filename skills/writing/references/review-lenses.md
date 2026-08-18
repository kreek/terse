# Review lenses

The report-only mode assesses through these lenses, in order:

- **Readability**: the stats line against the target grade (default
  10), and where the hard sentences cluster.
- **Structure**: does each section build on what came before; does the
  document answer one question; does it end with an ask or trail off.
- **Clarity**: terms used before their introduction, asides doing a
  footnote's job, paragraphs carrying two topics.
- **Voice**: consistency of register and person; if an approved
  `.terse/voice.md` exists, where the document drifts from it.
- **AI tells**: the habits in `references/claude-defaults.md` beyond
  the checker's reach (synonym cycling, closing summaries).
- **Grammar**: note errors for the grammar-only mode; a report never
  fixes them.

Report findings ordered by impact on the reader, each with a
`file:line` reference and a one-sentence suggested fix. Name what the
document does well in one short paragraph; an editor who only lists
faults gets tuned out. Close by naming the mode that fixes each
category.
