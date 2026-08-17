---
name: tone
description: "Shift a document's tone: confident, formal, friendly, casual, persuasive, shorter, more-detail, or simpler."
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
2. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/style-check.mjs <file>` (with
   `--max-grade <target>` for "simpler") to record the baseline flags and
   stats before touching the document.
3. If `.terse/voice.md` exists with `status: approved`, load it. A tone
   shift moves within the author's voice, not out of it: their vocabulary
   register and exception list still hold.
4. Rewrite sentence by sentence toward the preset. Rules that survive
   every preset:
   - claims, facts, and their hedging state are invariant; "confident"
     strengthens delivery, never evidence
   - "shorter" cuts by selection, not by compressing sentences into
     fragments
   - "more-detail" adds only material grounded in the document or
     provided by the user; never invent facts
   - the `writing` skill's rules still apply: no signposts, no
     five-dollar words, active voice
5. Re-run the checker with the same arguments as the baseline; a tone
   pass may not add new flags, and "simpler" must clear the hard-sentence
   flags at the target grade.
6. Report the shift with two or three before -> after examples and the
   before/after stats line.

## Verification

- [ ] Every claim survives with its meaning and hedging state intact.
- [ ] The checker ran before and after with the same arguments and shows
      no new flags; for "simpler", no hard-sentence flags remain at the
      target grade.
- [ ] An approved voice template's exceptions and register were honored.
- [ ] The report shows representative before -> after pairs.
