---
status: approved (user, 2026-09-02)
---

# README outline

**Reader:** someone new to Terse. They use Claude Code, write in
markdown, and have not seen this plugin before.

**One question:** what is Terse, and how do I use it to make my
writing better?

**Target length:** 1,300 words (proposed; about 6 minutes). Terse is a
five-skill plugin with a checker, a config file, and a three-phase
writing process behind it, so a newcomer needs more than a landing
page but not a manual. Say if you want it shorter or longer before I
draft.

**Governing thought:** Terse turns Claude into a prose editor. A
deterministic checker catches grammar mistakes, hard sentences, and
the phrases that mark AI writing, the way a pre-LLM tool always could.
Claude's own skills fix what it finds, keep your voice consistent, and
fit the writing to its reader. Both run on the subscription you
already have.

**Shape:** technical explainer, adapted: what it is, how it works,
proof, install, everyday use, the full process, personalizing it,
reference. Knowledge builds in that order; nothing later depends on a
term not yet introduced.

## Sections

### 1. What Terse is
Claim: Terse replaces the readability checker and grammar assistant
you would otherwise pay for, inside Claude, on markdown or any text
format Claude edits.
Evidence: none needed yet; this is the claim section 3 proves.
budget: 90

### 2. How it works
Claim: a deterministic checker finds problems the way pre-LLM tools
always did, and Claude's own skills fix them, keep your voice, and
write for your reader.
Evidence: the division of labor, in one sentence per side.
budget: 130

### 3. See it in action
Claim: a real paragraph and the checker's real output show what each
side actually does.
Evidence: a planted bad paragraph, the checker's flags on it, a short
table naming each flag category in plain words.
budget: 240

### 4. Install
Claim: two commands in Claude Code and Terse is running.
Evidence: the marketplace and install commands.
budget: 60

### 5. Using Terse day to day
Claim: three ways in, from asking Claude to write something, to
`/terse:edit` on a file you have, to `/terse:write` for something new.
Evidence: one example request per entry point.
budget: 170

### 6. Writing a full document
Claim: `/terse:write` runs three phases in order, outline, draft, edit,
because moving bullets is cheap and moving prose is not; you approve
the structure before any prose exists.
Evidence: what each phase produces, why the order is fixed, and how a
one-shot session gets through the two approval stops.
budget: 230

### 7. Making it yours
Claim: Terse learns your voice from your own writing, and you can tell
it to leave a flag alone, for one paragraph or for the whole project.
Evidence: the voice template, the `terse-ignore` comment, and
`.terse/config.json`, each in one or two sentences.
budget: 210

### 8. Reference
Claim: the always-on hook, the highlight page, the scripts, other
hosts, and how to develop Terse itself are each one command or one
fact away.
Evidence: one line and one command per item; this section points
rather than teaches.
budget: 170

Sum: 1,300 words against a 1,300-word target. Every section has a
required fact in it, so this lands at target rather than under it. If
you want a shorter README, section 8 is the one to cut or trim. A
newcomer who wants those facts can read the scripts and skills.

## Lead (drafted, not described)

Terse turns Claude into a prose editor, replacing the readability
checker and grammar assistant you would otherwise pay for. A
deterministic script catches grammar mistakes, hard sentences, and the
phrases that mark AI writing, the way a tool could before language
models existed. Claude's own skills fix what it finds, keep your voice
consistent, and fit the writing to its reader.

## Last section

Reference, ending on the Develop commands: the ask a reader who wants
to change Terse itself takes next. Not a summary of the document above
it.
