# Grammar scope

The mechanics stage of the findings contract covers correctness errors
and nothing else. It must leave style, structure, and voice as found.
The checker catches a tested deterministic subset. The model owns the
rest of this scope.

The native checker flags selected doubled function words, `could of`,
`its` before a word only `it's` precedes, `their` before a be-verb, and
misspellings with one correct form. The combined document check also
uses the pinned Harper 2.7.0 rules `AnA`, `CommaFixes`,
`ItsPossessive`, `ModalOf`, `NounVerbConfusion`,
`PronounVerbAgreement`, and `RepeatedWords`. Every other Harper rule
stays off. Those results arrive as ordinary `grammar` findings.

Broad spelling is off by default. A project may opt in with an explicit
dialect and its own dictionary:

```json
{
  "grammar": {
    "spelling": true,
    "dialect": "american",
    "words": ["Terse", "ProseMirror"]
  }
}
```

The supported dialects are `american`, `british`, `australian`,
`canadian`, and `indian`. Spelling findings may offer several choices;
the hint asks the editor to check them rather than asserting one fix.

The model still checks:

- spelling and typos outside the opt-in spelling check
- subject-verb agreement beyond the admitted rule, tense consistency,
  and pronoun agreement
- homophones and near-homophones (`were/where`, `they're/their/there`,
  `its/it's`, `your/you're`, `affect/effect`, `then/than`, `lose/loose`)
- articles and prepositions beyond `a/an` (a missing `the`, a wrong
  preposition)
- punctuation errors: run-ons, comma splices, unmatched quotes and
  parentheses, misplaced apostrophes
- duplicated words outside the admitted rule and dropped words

Do not touch: word choice, sentence length, passive voice, tone,
hedges, structure. A sentence that is grammatical but bad leaves this
scope unchanged.

Safeguards:

- Make the smallest edit that makes the sentence correct.
- Without an explicit spelling dialect, keep the author's spelling as
  found. A document that agrees with itself beats either standard.
- Leave prose inside code blocks, inline code, and URLs alone.
- Quoted material keeps its original errors; note them instead of
  editing quotes.
- Report every correction as before -> after with a `file:line`
  reference. If nothing needed fixing, say so.
