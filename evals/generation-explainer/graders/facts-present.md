---
type: regex
target: { source: file, path: explainer.md }
pattern: "(?is)(?=.*index)(?=.*B-?tree)(?=.*(?:full\\s+table\\s+scan|scan\\s+every\\s+(?:table\\s+)?row|inspect\\s+every\\s+row|read(?:ing)?\\s+every\\s+(?:table\\s+)?row))(?=.*(?:INSERT|UPDATE|DELETE|writes?))(?=.*(?:work|slower|slow(?:s|ing)?\\s+writes?|slow\\s+down|write\\s+speed\\s+falls|writes?\\s+more\\s+expensive|penalty|cost))(?=.*(?:avoid.{0,120}index|skip\\s+(?:an?\\s+index|one)|do\\s+not\\s+(?:automatically\\s+)?index|(?:do\\s+not|not|when\\s+not).{0,40}add.{0,40}index))"
match: contains
---
The explainer retains the index definition, B-tree comparison, write cost,
and a reason not to add an index.
