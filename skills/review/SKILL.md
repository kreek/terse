---
name: review
description: "Review a document and give feedback without editing it: readability, structure, voice, AI tells."
---

# Review

Read the document and report what an editor would say. This pass never
edits; its deliverable is the critique. It covers the classic editors'
document-feedback feature.

## Workflow

1. Resolve the target file(s); ask if none were named.
2. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/style-check.mjs <file>` for the
   stats and mechanical flags; the review builds on them rather than
   repeating them one by one.
3. Assess, in order:
   - **Readability**: the stats line against the target grade (default
     10), and where the hard sentences cluster.
   - **Structure**: does each section build on what came before; does the
     document answer one question; does it end with an ask or trail off.
   - **Clarity**: terms used before they are introduced, asides doing a
     footnote's job, paragraphs carrying two topics.
   - **Voice**: consistency of register and person; if an approved
     `.terse/voice.md` exists, where the document drifts from it.
   - **AI tells**: the habits listed in the `writing` skill's
     `references/claude-defaults.md` (em dashes, "not just X but Y",
     synonym cycling, closing summaries, significance announcements).
   - **Grammar**: note errors for `/terse:proof`; do not fix them here.
4. Report findings ordered by impact on the reader, each with a
   `file:line` reference and a one-sentence suggested fix. Name what the
   document does well in one short paragraph; an editor who only lists
   faults gets tuned out.
5. Close by naming the command for each fix category: `/terse:edit` for
   style flags, `/terse:proof` for grammar, `/terse:tone` for register.

## Verification

- [ ] The document was not modified.
- [ ] Findings carry locations and concrete fixes, not general advice.
- [ ] Stats and target grade appear in the report.
- [ ] AI tells were checked against the defaults reference.
