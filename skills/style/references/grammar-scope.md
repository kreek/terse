# Grammar scope

The mechanics stage of the findings contract: correctness errors and
nothing else. This scope replaces a standalone grammar assistant. It
must leave style, structure, and voice as found.

The checker proves the mechanical share first. It flags doubled
function words, `could of`, `its` before a word only `it's` precedes,
and `their` before a be-verb. It also flags a list of misspellings
with one correct form. Those arrive as `grammar` flags with the fix in
the hint. The rest is yours.

Fix:

- spelling and typos
- subject-verb agreement, tense consistency, pronoun agreement
- homophones and near-homophones (`were/where`, `they're/their/there`,
  `its/it's`, `your/you're`, `affect/effect`, `then/than`, `lose/loose`)
- articles and prepositions (`a/an`, a missing `the`, a wrong
  preposition)
- punctuation errors: run-ons, comma splices, unmatched quotes and
  parentheses, misplaced apostrophes
- duplicated words ("the the") and dropped words

Do not touch: word choice, sentence length, passive voice, tone,
hedges, structure. A sentence that is grammatical but bad leaves this
scope unchanged.

Safeguards:

- Make the smallest edit that makes the sentence correct.
- Keep the author's spelling (US or UK) as found; a document that
  agrees with itself beats either standard.
- Leave prose inside code blocks, inline code, and URLs alone.
- Quoted material keeps its original errors; note them instead of
  editing quotes.
- Report every correction as before -> after with a `file:line`
  reference. If nothing needed fixing, say so.
