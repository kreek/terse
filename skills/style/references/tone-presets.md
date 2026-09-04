# Tone presets

A tone shift is a mode of `terse:edit`: a deliberate rewrite toward a
named preset, followed by the gate. Claims, structure, and (when a
template exists) the author's voice survive the shift.

Presets: confident, formal, friendly, casual, persuasive, shorter,
more-detail, simpler. The user picks one; if they named none, ask
rather than guess. "simpler" lowers the reading grade: run the checker
with `--max-grade <target>` and rewrite to clear the grade flags.

Workflow:

1. Run the checker (with `--max-grade <target>` for "simpler") to
   record the baseline flags and stats before touching the document.
2. Load an approved `.terse/voice.md`. A tone shift moves within the
   author's voice, not out of it: their vocabulary register and
   exception list still hold.
3. Rewrite sentence by sentence toward the preset. Rules that survive
   every preset:
   - claims, facts, and their hedging state are invariant; "confident"
     strengthens delivery, never evidence
   - "shorter" cuts by selection, not by compressing sentences into
     fragments
   - "more-detail" adds only material grounded in the document or
     provided by the user; never invent facts
   - the `style` skill's rules still apply
4. Re-run the checker with the same arguments as the baseline. A tone
   pass may not add new flags, and "simpler" must clear the
   hard-sentence flags at the target grade.
5. Report the shift with two or three before -> after examples and the
   before/after stats line.
