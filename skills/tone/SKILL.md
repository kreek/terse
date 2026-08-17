---
name: tone
description: "Shift a document's tone: confident, formal, friendly, casual, persuasive, shorter, more detail, or simpler."
---

# Tone

Apply a named tone shift to a document while keeping its claims, its
structure, and (when a voice template exists) its author's voice. This
covers the classic editors' tone presets.

## Presets

confident, formal, friendly, casual, persuasive, shorter, more-detail,
simpler. The user picks one; if they named none, ask rather than guess.
"simpler" lowers the reading grade: rerun the checker with
`--max-grade <target>` (default 10) and rewrite to clear the grade flags.

## Workflow

1. Resolve the file and the preset.
2. If `.terse/voice.md` exists with `status: approved`, load it. A tone
   shift moves within the author's voice, not out of it: their vocabulary
   register and exception list still hold.
3. Rewrite sentence by sentence toward the preset. Rules that survive
   every preset:
   - claims, facts, and their hedging state are invariant; "confident"
     strengthens delivery, never evidence
   - "shorter" cuts by selection, not by compressing sentences into
     fragments
   - "more-detail" adds only material grounded in the document or
     provided by the user; never invent facts
   - the `writing` skill's rules still apply: no signposts, no
     five-dollar words, active voice
4. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/style-check.mjs <file>` after
   the shift; a tone pass may not add new flags.
5. Report the shift with two or three before -> after examples and the
   before/after stats line.

## Verification

- [ ] Every claim survives with its meaning and hedging state intact.
- [ ] The checker shows no new flags after the shift.
- [ ] An approved voice template's exceptions and register were honored.
- [ ] The report shows representative before -> after pairs.
