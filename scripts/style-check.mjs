#!/usr/bin/env node
// Terse's mechanical style checker: deterministic pattern matching, word
// lists, and readability arithmetic. No AI, no network, no dependencies.
// Usage: node style-check.mjs <file...> [--max-grade N] [--impersonal] [--json]
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const HARD_GRADE = 10; // document grade target; also the hard-sentence floor
// Sentence flags are length-led, calibrated against 514 sentences of
// Hemingway's journalism: the old grade-only rule flagged 26.8% of his
// sentences, because ARI's character counting punishes long vocabulary in
// otherwise plain sentences. This rule flags 13.2% of the corpus: the
// genuinely long tail plus the impenetrably dense.
const HARD_WORDS = 25;        // hard: 25+ words at or above the target grade
const VHARD_WORDS = 30;       // very hard: 30+ words at grade 14+ ...
const VHARD_GRADE = 14;
const DENSE_WORDS = 14;       // ... or any 14+ word sentence at grade 18+
const DENSE_GRADE = 18;
const MIN_WORDS_FOR_GRADE = 14; // documents shorter than this skip the gate
const ASIDE_WORDS = 6; // parenthetical asides at or above this length are flagged
// The Kansas City Star style sheet, which Hemingway called the best rules he
// ever learned in the business of writing, opens "Use short sentences. Use
// short first paragraphs." The second rule has no sentence-level equivalent:
// an opening can clear every other flag and still bury the reader before the
// first fact. Calibrated against samples/hemingway, whose own openings run
// 25 to 88 words.
const OPENING_WORDS = 90;
const READING_WPM = 230;

const ADVERB_WHITELIST = new Set([
	'only', 'early', 'likely', 'unlikely', 'family', 'apply', 'applies',
	'reply', 'supply', 'imply', 'comply', 'multiply', 'assembly', 'fly',
	'rely', 'daily', 'monopoly', 'anomaly', 'ugly', 'holy', 'silly', 'rally',
	'ally', 'tally', 'poly', 'italy', 'july', 'belly', 'jelly', 'folly',
	'bully', 'weekly', 'monthly', 'quarterly', 'yearly', 'hourly', 'nightly',
	// -ly adjectives and given names, not adverbs
	'friendly', 'costly', 'timely', 'elderly', 'lively', 'lonely', 'lovely',
	'deadly', 'orderly', 'unruly', 'burly', 'curly', 'oily', 'wobbly',
	'kelly', 'holly', 'sally', 'molly', 'polly', 'billy', 'emily', 'lilly',
	'beverly', 'kimberly', 'grammarly',
]);

const QUALIFIERS = [
	'i think', 'i believe', 'i feel', 'maybe', 'perhaps', 'possibly',
	'somewhat', 'sort of', 'kind of', 'a bit', 'fairly', 'quite', 'rather',
	'very', 'arguably', 'seemingly', 'generally speaking',
	'it could be argued', 'it is important to note',
	"it's important to note", 'needless to say',
];

// Word-boundary patterns so "unrequited" never matches "quite"; a curly
// apostrophe counts as a straight one.
// "rather than" is a comparison, not a hedge; only bare "rather" hedges.
const QUALIFIER_TAILS = { rather: '(?!\\s+than)' };
// "the very least/idea/heart" is emphasis on a noun, not a hedge on a claim,
// and "the same kind of signal" is a noun phrase, not a hedged verb.
const NOUN_KIND = '(?<!\\b(?:the|this|that|a|same|every|any|one|some|what|which)\\s)';
const QUALIFIER_HEADS = { very: '(?<!\\bthe\\s)',
	'kind of': NOUN_KIND, 'sort of': NOUN_KIND };

const QUALIFIER_PATTERNS = QUALIFIERS.map((q) => ({ phrase: q,
	re: new RegExp((QUALIFIER_HEADS[q] ?? '') +
		`\\b${q.replace(/ /g, '\\s+').replace(/'/g, "['’]")}\\b` +
		(QUALIFIER_TAILS[q] ?? ''), 'gi') }));

// A requirement stated as a wish. "I would like the export to include
// totals" reads as an opinion the reader may decline; "the export includes
// totals" is the requirement. Weak wherever a document carries a request,
// and the default failure in issues and acceptance criteria.
const PREFERENCES = [
	'i would like', "i'd like", 'i would love', "i'd love", 'i want to see',
	'i would prefer', "i'd prefer", 'we would like', "we'd like",
	'it would be nice', 'it would be great', 'my preference is',
	'in my opinion', 'to my mind',
];

const PREFERENCE_PATTERNS = PREFERENCES.map((q) => ({ phrase: q,
	re: new RegExp(`\\b${q.replace(/ /g, '\\s+').replace(/'/g, "['’]")}\\b`, 'gi') }));

// Opt-in, under --impersonal: the genres that own this rule are issues,
// specs, and acceptance criteria, where the requirement belongs to the
// system rather than to whoever filed it. Prose written for a reader keeps
// its "you", so this stays off by default.
const PRONOUNS = [
	'i', 'me', 'my', 'mine', 'myself', 'we', 'us', 'our', 'ours',
	'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
];

const PRONOUN_PATTERNS = PRONOUNS.map((w) => ({ phrase: w,
	re: new RegExp(`\\b${w}\\b`, 'gi') }));

const SIMPLER = {
	utilize: 'use', utilizes: 'uses', utilized: 'used', utilizing: 'using',
	utilization: 'use',
	leverage: 'use', leverages: 'uses', leveraged: 'used', leveraging: 'using',
	facilitate: 'help', facilitates: 'helps', facilitated: 'helped',
	facilitating: 'helping',
	commence: 'start', commences: 'starts', commenced: 'started',
	commencing: 'starting', endeavor: 'try', endeavors: 'tries',
	demonstrate: 'show', demonstrates: 'shows', demonstrated: 'showed',
	demonstrating: 'showing',
	numerous: 'many', sufficient: 'enough', additional: 'more',
	obtain: 'get', obtains: 'gets', obtained: 'got', obtaining: 'getting',
	purchase: 'buy', purchased: 'bought', purchasing: 'buying',
	attempt: 'try', attempted: 'tried', attempting: 'trying',
	assist: 'help', assists: 'helps', assisted: 'helped',
	assisting: 'helping', ascertain: 'find out', ascertained: 'found out',
	necessitate: 'require', necessitated: 'required',
	'in order to': 'to', 'prior to': 'before', 'subsequent to': 'after',
	'in the event that': 'if', 'due to the fact that': 'because',
	'despite the fact that': 'although', 'at this point in time': 'now',
	'a number of': 'several', 'with regard to': 'about',
	'in the process of': '(delete)', 'on a daily basis': 'daily',
	accordingly: 'so', consequently: 'so', approximately: 'about',
	regarding: 'about', concerning: 'about', component: 'part',
	components: 'parts', individuals: 'people', modification: 'change',
	modifications: 'changes', necessitates: 'requires',
	'in the near future': 'soon', 'at this time': 'now',
	'in excess of': 'more than', 'with the exception of': 'except',
	'for the purpose of': 'for', 'in conjunction with': 'with',
	'in the event of': 'if', 'first and foremost': 'first',
	'each and every': 'every', 'whether or not': 'whether',
	'last but not least': 'finally', 'in the majority of cases': 'usually',
	'a wide variety of': 'many', 'a large number of': 'many',
	'take action': 'act', 'takes action': 'acts',
	// inflated words demoted from the tell list: common enough in human
	// prose that the flag is a plain-word suggestion, not an accusation
	robust: 'strong', robustly: 'strongly', seamless: 'smooth',
	seamlessly: 'smoothly', crucial: 'important', pivotal: 'key',
	effortless: 'easy', effortlessly: 'easily', frictionless: 'smooth',
	elevate: 'raise', elevates: 'raises', elevating: 'raising',
	showcase: 'show', showcases: 'shows', showcased: 'showed',
	showcasing: 'showing', streamline: 'simplify',
	streamlines: 'simplifies', streamlined: 'simplified',
	streamlining: 'simplifying', nuanced: 'subtle',
};

const SIMPLER_PATTERNS = Object.entries(SIMPLER).map(([phrase, simpler]) => ({
	phrase, simpler,
	re: new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'gi') }));

// Inflection families: one base form covers every inflection, so "delved"
// and "journeys" cannot slip past a hand-enumerated list.
function verbForms(base) {
	if (base.endsWith('e')) return `${base.slice(0, -1)}(?:e|es|ed|ing)`;
	const es = /(?:s|sh|ch|x|z)$/.test(base);
	return `${base}(?:${es ? 'es' : 's'}|ed|ing)?`;
}

function nounForms(base) {
	if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}(?:y|ies)`;
	const es = /(?:s|sh|ch|x|z)$/.test(base);
	return `${base}(?:${es ? 'es' : 's'})?`;
}

// Model-writing tells are editing signals, never authorship evidence. Each
// source-backed or observed candidate needs a safe frame or replacement and
// zero false positives in the committed human-prose corpus before admission.
const AI_TELL_PHRASES = [
	// anthropomorphized code-speak
	'load-bearing', 'load bearing', 'doing real work', 'does real work',
	'the culprit', 'battle-tested', 'battle tested',
	// stock figures that mask the literal action; say adopt/use/choose/cut
	'heavy lifting', 'low-hanging fruit', 'secret sauce', 'table stakes',
	'at the end of the day',
	// self-important spotlighting
	"here's the thing", 'worth noting', 'worth flagging', 'worth calling out',
	'importantly', 'at its core', 'the key insight', 'in essence',
	'the crux', 'the tell is', 'the real question',
	'why this matters', 'why it matters', 'the punchline', 'the kicker',
	// performative candor
	'worth stating plainly', 'full stop', 'sit with that', 'the honest take',
	'the honest answer', 'the honest version', 'my honest read',
	'my honest assessment', 'my honest take', 'the short answer',
	'let me put it plainly', 'real talk', 'straight answer',
	'grounded in what', 'and that matters',
	// unsolicited validation, projected onto the reader
	'great question', 'good question', 'excellent question', 'great catch',
	'good catch', 'nice catch', 'exactly right', 'fair point',
	"that's fair", 'valid concern', 'legitimate concern',
	'perfectly reasonable', 'totally reasonable', 'good instinct',
	'great instinct',
	// hedging connective tissue
	'non-trivial', 'nontrivial', 'that said', 'having said that',
	'to be fair',
	// the em-dash reframe, lexical edge
	'not just',
	// metaphor soup
	'happy path', 'blast radius', 'sanity check', 'escape hatch',
	'belt-and-suspenders', 'belt and suspenders', 'smoking gun',
	'chicken-and-egg', 'chicken and egg', 'under the hood',
	// sign-off tics
	'say the word', 'just let me know',
	// puffery with no everyday literal sense; anything with one lives in
	// the frames below or the SIMPLER table instead
	'crucially', 'multifaceted', 'transformative', 'cutting-edge',
	'blazing fast', 'state-of-the-art', 'next-level', 'game-changing',
	'deep dive', "in today's fast-paced world", 'say goodbye to',
	'look no further', 'the possibilities are endless', 'with confidence',
	// harvested from model-written launch posts and product copy
	'thrilled to announce', 'excited to announce', 'excited to share',
	'proud to announce', 'this is just the beginning', "can't wait to see",
	'game-changer', 'game changer',
];

// Bare single words flagged in every inflection. Admission here requires
// no everyday literal sense: "delve" and "synergy" are always the tell,
// where "harness" is often a test harness and "landscape" is often land.
// Words with literal senses flag only inside the tell frames below.
const AI_TELL_VERBS = ['delve'];

const AI_TELL_NOUNS = ['synergy', 'footgun', 'linchpin', 'workhorse',
	'gotcha'];

// Tells whose surface varies: a pattern per family, matched per sentence.
const AI_TELL_REGEXES = [
	{ re: /\bearn(?:s|ed|ing)?\s+(?:its|their)\s+(?:place|keep|trust)\b/gi },
	{ re: /\bmov(?:e|es|ed|ing)\s+the\s+needle\b/gi },
	// ordinary verbs gone metaphorical: framed on subjects or objects that
	// cannot take the literal action, so a thread that holds, a man who
	// buys bread, and a mint that stamps coins all stay silent
	{ re: /\b(?:analogy|argument|claim|pattern|parallel|comparison|assumption|intuition|logic|reasoning|principle|framing)s?\s+(?:still\s+|no\s+longer\s+)?holds?\b/gi },
	{ re: /\bholds?\s+true\b/gi },
	{ re: /\b(?:the\s+same|this|that)\s+holds\s+for\b/gi },
	{ re: /\bbuys\s+(?:you|us|nothing|little)\b/gi },
	{ re: /\bwhat\s+(?:it|this|that|the\s+\w+)\s+buys\b/gi },
	{ re: /\bmint(?:s|ed|ing)?\s+(?:a\s+|an\s+)?(?:new\s+|fresh\s+)?(?:term|name|word|label|acronym|category|concept|identifier|type)s?\b/gi },
	{ re: /\bcarr(?:y|ies|ied|ying)\s+the\s+(?:argument|weight|burden|day)\b/gi },
	{ re: /\bforc(?:e|es|ed|ing)\s+the\s+(?:question|issue|point|choice|decision|hand)\b/gi },
	{ re: /\b(?:logic|config|configuration|state|truth|complexity|risk|definition|answer|meaning|knowledge)\s+(?:all\s+)?lives?\s+in\b/gi },
	{ re: /\bquietly\s+(?:drop|swallow|ignore|fail|discard|skip|overwrite)(?:s|ped|ed|ing)?\b/gi },
	{ re: /\bthe\s+offending\s+\w+/gi },
	{ re: /\b(?:actually|really)\s+matters?\b/gi },
	{ re: /\b(?:it|this|that)(?:['’]s|\s+is)\s+worth\s+\w+ing\b/gi },
	{ re: /\blet\s+me\s+be\s+(?:direct|blunt|honest|clear|frank)\b/gi },
	{ re: /\bhand[- ]?wav(?:e|es|ed|ing|y|iness)\b/gi },
	{ re: /\btl;?dr\b/gi },
	{ re: /\bverdict\s*:/gi },
	{ re: /\byour\s+(?:instinct|intuition)s?\s+(?:is|are|was|were)\s+(?:right|correct|good|sound)\b/gi },
	// hedge use only: "If anything, X"; "if anything changes" is a condition
	{ re: /\bif\s+anything\b(?=,|\.)/gi },
	// the sign-off question; "they want me to resign" in prose stays
	{ re: /\bwant\s+me\s+to\b[^.!?\n]{0,60}\?/gi },
	// "spot on" the verdict; "a spot on the map" is a place
	{ re: /\bspot[- ]on\b(?!\s+(?:the|a|an|his|her|their|its|my|your|our)\b)/gi },
	// Tell frames: single words with real literal senses flag only in
	// their machine-writing shape. "A testament to" flags; a last will
	// and testament does not. Each frame is corpus-checked.
	{ re: /\btestament\s+to\b/gi },
	{ re: /\btapestr(?:y|ies)\s+of\b|\brich\s+tapestr(?:y|ies)\b/gi },
	{ re: /\brealms?\s+of\b/gi },
	{ re: /\blandscape\s+of\b|\b(?:competitive|digital|tech|technology|business|data|security|regulatory|media|marketing|threat|vendor|startup|modern|evolving|changing|current)\s+landscape\b/gi },
	{ re: /\b(?:customer|user|developer|buyer|patient|learning|onboarding|digital|transformation|brand)\s+journey\b|\bjourney\s+towards?\b/gi },
	{ re: /\b(?:data|developer|dev|partner|product|startup|tech|digital|app|content|brand|platform|innovation|software|api)\s+ecosystems?\b/gi },
	{ re: /\bharness(?:es|ed|ing)?\s+the\s+(?:power|potential|full|energy|capabilities)\b/gi },
	{ re: /\bunderscor(?:e|es|ed|ing)\s+(?:the|its|their|that|how|why)\b/gi },
	{ re: /\bunlock(?:s|ed|ing)?\s+(?:the\s+|new\s+)?(?:value|potential|possibilit|opportunit|insight|growth|efficienc|productivity|creativity|innovation|headroom|scale|power)/gi },
	{ re: /\bunleash(?:es|ed|ing)?\s+(?:the\s+|your\s+)?(?:full\s+)?(?:potential|power|creativity|innovation|productivity|possibilit)/gi },
	{ re: /\bempower(?:s|ed|ing)?\s+(?:you\b|your\b|users|teams|writers|developers|builders|businesses|people|everyone)/gi },
	{ re: /\bsupercharg(?:e|es|ed|ing)\s+(?:your|the)\b/gi },
	{ re: /\brevolutioniz(?:e|es|ed|ing)\s+(?:your|the\s+way)\b/gi },
	{ re: /\bfoster(?:s|ed|ing)?\s+(?:a\s+culture|a\s+sense|collaboration|innovation|resilience|growth|trust|engagement|community|creativity|alignment)/gi },
	{ re: /\bguardrails\s+(?:around|for|on)\b|\b(?:add|adding|put|putting|set|setting)\s+(?:up\s+)?guardrails\b/gi },
	{ re: /\borthogonal\s+(?:concern|question|issue|problem|point)s?\b|\b(?:concerns?|questions?|issues?|problems?)\s+(?:are|is|was|were)\s+orthogonal\b/gi },
	{ re: /\bspaghetti\s+code\b/gi },
	{ re: /\bjust\s+plumbing\b|\bplumbing\s+of\b/gi },
	{ re: /\bbottom\s+line\s*[:,]|\bthe\s+bottom\s+line\s+is\b/gi },
];

const AI_TELL_PATTERNS = [
	...AI_TELL_PHRASES.map((q) => ({
		re: new RegExp(`\\b${q.replace(/ /g, '\\s+').replace(/'/g, "['’]")}\\b`, 'gi') })),
	...AI_TELL_VERBS.map((w) => ({ re: new RegExp(`\\b${verbForms(w)}\\b`, 'gi') })),
	...AI_TELL_NOUNS.map((w) => ({ re: new RegExp(`\\b${nounForms(w)}\\b`, 'gi') })),
	...AI_TELL_REGEXES,
];

// Structural tells: negative parallelisms, reflexive validation, and punchy
// fragments. Matched against the whole text (some span sentence boundaries),
// so word gaps are \s+ to survive wrapped lines.
const AI_TELL_STRUCTURES = [
	{ phrase: "it's not X, it's Y",
		re: /\b(?:it|this|that)['’]s\s+not\s+(?:just\s+|only\s+)?[^,;.—]{1,40}[,;—]\s*(?:it|this|that)['’]s\b/gi },
	{ phrase: "isn't just X, it's Y",
		re: /\bisn['’]t\s+(?:just|only)\s+[^,;.—]{1,40}[,;—]\s*(?:it|this|that)['’]s\b/gi },
	{ phrase: "isn't X, it's Y",
		re: /\bisn['’]t\s+[^,;.—]{1,40}[,;—]\s*(?:it|this|that)['’]s\b/gi },
	{ phrase: "isn't about X, it's about Y",
		re: /\bisn['’]t\s+about\s+[^,;.—]{1,40}[,;—]\s*(?:it|this|that)['’]s\s+about\b/gi },
	{ phrase: 'period. as emphasis',
		re: /(?<=[.!?]\s{1,2})Period\.(?=\s|$)/g },
	{ phrase: 'not only X but also Y',
		re: /\bnot\s+only\b[^.;]{1,60}\bbut\s+also\b/gi },
	{ phrase: "you're absolutely right",
		re: /\byou['’]re\s+(?:absolutely|completely)\s+right\b|\byou['’]re\s+right\s+to\s+\w+/gi },
	{ phrase: "that's real / not nothing",
		re: /\b(?:that|this|it)(?:['’]s|\s+is)\s+(?:not\s+nothing|real)\b/gi },
	{ phrase: 'punchy fragment',
		re: /\bNot\s+(?:a|an|the|just)\s+[\w-]+\.\s+(?:A|An|The)\s+[\w-]+\b/g },
	{ phrase: 'no X, no Y, no Z',
		re: /\bno\s+[^,.;\n]{2,30},\s*no\s+[^,.;\n]{2,30},\s*(?:and\s+)?no\b/gi },
	{ phrase: 'stop Xing, start Ying',
		re: /\bstop\s+\w+ing\b[^.!?;\n]{0,40}[.!?;]?\s*(?:and\s+)?start\s+\w+ing\b/gi },
	{ phrase: "whether you're X, Y, or Z",
		re: /\bwhether you['’]re\b[^.;:\n]{5,80},[^.;:\n]{5,80},\s*or\b/gi },
	// A clipped numbered verdict opening a paragraph ("Four questions settle
	// it."). Fine as a closer after a developed point; as an opener it is
	// machine throat-clearing. Anchored to paragraph starts, present tense,
	// and a small verb/object set to keep human prose clean.
	{ phrase: 'slogan opener',
		re: /(?<=^|\n[ \t]*\n)(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d+)\s+[a-z][\w-]*(?:\s+[a-z][\w-]*)?\s+(?:(?:settles?|decides?|answers?|explains?)\s+(?:it|this|that|everything)|tells?\s+the\s+story|says?\s+it\s+all|sums?\s+it\s+up|matters?\s+(?:here|most))\./g },
];

// Weak verb phrases: a be-verb or light verb propping up a noun where a
// plain verb does the job.
const WEAK_VERBS = {
	'is a reflection of': 'reflects', 'is indicative of': 'indicates',
	'is representative of': 'represents', 'has the ability to': 'can',
	'have the ability to': 'can', 'has the capability to': 'can',
	'is capable of': 'can', 'is able to': 'can', 'are able to': 'can',
	'makes use of': 'uses', 'make use of': 'use',
	'gives consideration to': 'considers', 'take into consideration': 'consider',
	'makes a decision': 'decides', 'make a decision': 'decide',
	'performs an analysis of': 'analyzes', 'perform an analysis of': 'analyze',
	'provides a summary of': 'summarizes', 'provide a summary of': 'summarize',
	'is dependent on': 'depends on', 'is dependent upon': 'depends on',
	'places emphasis on': 'emphasizes', 'put emphasis on': 'emphasize',
	'is supportive of': 'supports', 'is in agreement with': 'agrees with',
	'serves as': 'is', 'serve as': 'are', 'functions as': 'is',
	'stands as': 'is', 'stand as': 'are',
};

const WEAK_VERB_PATTERNS = Object.entries(WEAK_VERBS).map(([phrase, verb]) => ({
	phrase, verb,
	re: new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'gi') }));

const IRREGULAR_PARTICIPLES = new Set([
	'begun', 'beaten', 'bitten', 'bought', 'brought', 'broken', 'built',
	'caught', 'chosen', 'dealt', 'done', 'drawn', 'driven', 'eaten', 'fed',
	'felt', 'found', 'forgotten', 'frozen', 'given', 'gone', 'gotten',
	'held', 'hidden', 'hung', 'kept', 'known', 'laid', 'led', 'left',
	'lost', 'made', 'meant', 'paid', 'put', 'read', 'ridden', 'run',
	'said', 'seen', 'sent', 'set', 'shot', 'shown', 'shut', 'sold',
	'spent', 'split', 'spoken', 'stolen', 'struck', 'sung', 'swung',
	'taken', 'thrown', 'told', 'thought', 'torn', 'understood', 'won',
	'worn', 'written',
]);

// Words the passive pattern must never read as participles: -ed lookalikes
// and adjectival forms ("the actor is unknown" is a state, not a passive).
const NOT_PARTICIPLES = new Set([
	'indeed', 'hundred', 'sacred', 'naked', 'wicked', 'hatred', 'kindred',
	'unknown', 'unseen', 'unwritten', 'unspoken', 'unbroken', 'mistaken',
	// predicative adjectives: "the fix was complicated" is a state
	'complicated', 'interested', 'excited', 'detailed', 'motivated',
	'sophisticated', 'talented', 'concerned', 'worried', 'tired',
	'limited', 'related', 'dedicated', 'outdated', 'opinionated',
	'convoluted', 'nuanced',
]);

// Exported for the conservation property tests.
export function stripMarkdown(text) {
	return text
		.replace(/^---\n[\s\S]*?\n---(?=\n|$)/, (m) => m.replace(/[^\n]/g, ' '))
		.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '))
		.replace(/`[^`\n]+`/g, (m) => ' '.repeat(m.length))
		.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
		.replace(/\[([^\]]*)\]\((?:[^()\n]|\([^()\n]*\))*\)/g, (m, label) =>
			label.padEnd(m.length, ' '))
		.replace(/^[ \t]*[|].*$/gm, (m) => ' '.repeat(m.length))
		.replace(/^ {0,3}#{1,6}\s.*$/gm, (m) => ' '.repeat(m.length));
}

function makeLineIndex(text) {
	const newlines = [];
	for (let i = 0; i < text.length; i++) if (text[i] === '\n') newlines.push(i);
	return (offset) => {
		let lo = 0, hi = newlines.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (newlines[mid] < offset) lo = mid + 1;
			else hi = mid;
		}
		return lo + 1;
	};
}

const LIST_ITEM = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]/;
// A sentence ends at a run of .!? (plus closing quotes, brackets, or markdown
// emphasis) followed by whitespace or the end. Common abbreviations do not
// end one; titles are matched capitalized so "30 ms." still ends a sentence.
// Everything between boundaries is a sentence: no text is dropped.
const BOUNDARY =
	/(?<!\b(?:Mr|Mrs|Ms|Dr|Jr|Sr|St|vs|etc|e\.g|i\.e|p\.m|a\.m))[.!?]+["'”’)\]*_]*(?=\s|$)/g;

// Exported for the conservation property tests.
export function splitSentences(text) {
	const sentences = [];
	// Blank lines end a sentence even without punctuation, and each list
	// item stands alone.
	const blockRe = /[^\n][^]*?(?=\n\s*\n|\n#|$)/g;
	for (const block of text.matchAll(blockRe)) {
		collectBlockSentences(block[0], block.index, sentences);
	}
	return sentences;
}

function collectBlockSentences(block, base, sentences) {
	for (const seg of splitListItems(block)) {
		collectSegmentSentences(seg.text, base + seg.offset, sentences);
	}
}

function collectSegmentSentences(seg, base, sentences) {
	for (const s of splitSegment(seg)) {
		const trimmed = s.text.trim();
		if (trimmed.length === 0) continue;
		// A bare list marker is not a sentence; "1945." still is.
		if (/^(?:[-*+]|\d{1,2}[.)])$/.test(trimmed)) continue;
		sentences.push({ text: s.text, offset: base + s.offset });
	}
}

function splitListItems(block) {
	const segs = [];
	const lines = block.split('\n');
	let start = 0;
	let pos = 0;
	for (let i = 0; i < lines.length; i++) {
		if (i > 0 && LIST_ITEM.test(lines[i])) {
			segs.push({ text: block.slice(start, pos), offset: start });
			start = pos;
		}
		pos += lines[i].length + 1;
	}
	segs.push({ text: block.slice(start), offset: start });
	return segs;
}

function splitSegment(seg) {
	const parts = [];
	let start = 0;
	for (const m of seg.matchAll(BOUNDARY)) {
		const end = m.index + m[0].length;
		parts.push({ text: seg.slice(start, end), offset: start });
		start = end;
	}
	if (start < seg.length) parts.push({ text: seg.slice(start), offset: start });
	return parts;
}

// Top-level parenthetical groups, tracking nesting depth so an inner pair
// or a sentence boundary inside the parens cannot hide the aside.
function findAsides(text) {
	const asides = [];
	let depth = 0;
	let start = -1;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (c === '(') {
			if (depth === 0) start = i;
			depth++;
		} else if (c === ')' && depth > 0) {
			depth--;
			if (depth === 0) asides.push({ inner: text.slice(start + 1, i), offset: start });
		}
	}
	return asides;
}

// The document's first paragraph of prose. stripMarkdown has already blanked
// frontmatter, headings, tables, and code; a list or a block quote is not an
// opening, so both are skipped.
function firstProseParagraph(text) {
	for (const block of text.matchAll(/[^\s][^]*?(?=\n[ \t]*\n|$)/g)) {
		const body = block[0];
		if (LIST_ITEM.test(body) || /^[ \t]*>/.test(body)) continue;
		if (wordsOf(body).length === 0) continue;
		return { text: body, offset: block.index };
	}
	return null;
}

// Automated Readability Index: 4.71*(chars/words) + 0.5*(words/sentence) - 21.43
function ariGrade(words) {
	if (words.length === 0) return 0;
	return Math.max(0, Math.ceil(4.71 * (alnumCount(words) / words.length) +
		0.5 * words.length - 21.43));
}

function alnumCount(words) {
	let n = 0;
	for (const w of words) n += (w.match(/[\p{L}\p{N}]/gu) || []).length;
	return n;
}

function wordsOf(sentence) {
	return (sentence.match(/[\p{L}\p{N}’':.-]+/gu) || [])
		.filter((w) => /[\p{L}\p{N}]/u.test(w));
}

function checkSentence(sentence, maxGrade, flags, file, line) {
	const words = wordsOf(sentence);
	const grade = ariGrade(words);
	const veryHard = (words.length >= VHARD_WORDS && grade >= VHARD_GRADE) ||
		(words.length >= DENSE_WORDS && grade >= DENSE_GRADE);
	const hard = words.length >= HARD_WORDS && grade >= maxGrade;
	if (veryHard || hard) {
		flags.push({ file, line,
			category: veryHard ? 'very-hard-sentence' : 'hard-sentence',
			match: `${words.length} words, grade ${grade}`,
			hint: 'split the sentence or convert an in-sentence list to bullets' });
	}
	const passiveRe = /\b(am|is|are|was|were|be|been|being|get|gets|got)(?:n['’]t)?\s+(?:\w+ly\s+)*(?:being\s+)?(?:\w+ly\s+)*(\w+)\b/gi;
	for (const m of sentence.matchAll(passiveRe)) {
		const p = m[2].toLowerCase();
		if (NOT_PARTICIPLES.has(p)) continue;
		const base = p.replace(/^(?:re|un|mis|over|pre|dis)/, '');
		if (/[a-z]{2}ed$/.test(p) || IRREGULAR_PARTICIPLES.has(p) ||
				IRREGULAR_PARTICIPLES.has(base)) {
			flags.push({ file, line, category: 'passive-voice', match: m[0].trim(),
				hint: 'name the actor; keep only if the actor is irrelevant or unknown' });
		}
	}
	for (const m of sentence.matchAll(/\b([A-Za-z]+ly)\b/g)) {
		if (ADVERB_WHITELIST.has(m[1].toLowerCase())) continue;
		// A capitalized -ly word with a word before it is a proper noun;
		// one led only by quotes or markers is sentence-initial and counts.
		if (/^[A-Z]/.test(m[1]) &&
				/[\p{L}\p{N}]/u.test(sentence.slice(0, m.index))) continue;
		flags.push({ file, line, category: 'adverb', match: m[1],
			hint: 'pick a stronger verb or give the number' });
	}
}

// One flag per occurrence of re in text.
function pushMatches(text, re, flags, flag) {
	for (const m of text.matchAll(re)) flags.push({ ...flag });
}

// Same, for whole-document scans where each match needs its own line.
function pushMatchesWithLine(text, re, lineAt, flags, flag) {
	for (const m of text.matchAll(re)) {
		flags.push({ ...flag, line: lineAt(m.index),
			span: [m.index, m.index + m[0].length] });
	}
}

// Stripping preserves offsets, so spans index into the original text.
// Word-level categories refine to the matched phrase inside the sentence;
// sentence-level categories keep the whole sentence.
const SENTENCE_LEVEL = new Set(['hard-sentence', 'very-hard-sentence']);

function assignSpans(text, flags, from, span) {
	const seen = new Map(); // repeated matches refine to their own occurrence
	for (let i = from; i < flags.length; i++) {
		if (flags[i].span) continue;
		if (SENTENCE_LEVEL.has(flags[i].category)) {
			flags[i].span = span;
			continue;
		}
		const key = `${flags[i].category}:${flags[i].match}`;
		const n = seen.get(key) ?? 0;
		seen.set(key, n + 1);
		flags[i].span = refineSpan(text, span, flags[i].match, n) ?? span;
	}
}

function refineSpan(text, span, match, occurrence = 0) {
	const re = new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		.replace(/\s+/g, '\\s+').replace(/['’]/g, "['’]"), 'gi');
	const slice = text.slice(span[0], span[1]);
	let m;
	for (let i = 0; (m = re.exec(slice)) !== null; i++) {
		if (i === occurrence) {
			return [span[0] + m.index, span[0] + m.index + m[0].length];
		}
	}
	return null;
}

function isLiteralSimplerUse(sentence, phrase, match) {
	if (phrase === 'showcase') {
		const before = sentence.slice(0, match.index);
		const after = sentence.slice(match.index + match[0].length);
		return /\b(?:a|an|the|this|that|its|our|their|museum|glass|display)\s+$/i
			.test(before) || /^\s+(?:of|for|with|holds?|contains?|is|was)\b/i.test(after);
	}
	if (phrase === 'pivotal') {
		const after = sentence.slice(match.index + match[0].length);
		return /^\s+(?:joint|axis|pin|bearing|motion|position)\b/i.test(after);
	}
	return false;
}

function checkLexicon(sentence, flags, file, line, impersonal) {
	for (const { phrase, re } of PREFERENCE_PATTERNS) {
		pushMatches(sentence, re, flags, { file, line, category: 'preference',
			match: phrase,
			hint: 'state the requirement, not the wish for it' });
	}
	if (impersonal) {
		for (const { phrase, re } of PRONOUN_PATTERNS) {
			for (const m of sentence.matchAll(re)) {
				if (m[0] === 'US') continue; // the country, not the pronoun
				const next = sentence[m.index + m[0].length];
				// "I/O" and "i.e." are abbreviations, not first person
				if (m[0].toLowerCase() === 'i' && (next === '/' || next === '.')) continue;
				flags.push({ file, line, category: 'personal-pronoun',
					match: m[0],
					hint: 'name the system, the actor, or the user; keep the requirement impersonal' });
			}
		}
	}
	for (const { phrase, re } of QUALIFIER_PATTERNS) {
		pushMatches(sentence, re, flags, { file, line, category: 'qualifier',
			match: phrase,
			hint: 'delete it or state the evidence; keep only if the hedge is the claim' });
	}
	for (const { phrase, simpler, re } of SIMPLER_PATTERNS) {
		for (const match of sentence.matchAll(re)) {
			if (isLiteralSimplerUse(sentence, phrase, match)) continue;
			flags.push({ file, line, category: 'simpler-alternative', match: phrase,
				hint: `use "${simpler}"` });
		}
	}
	for (const { re } of AI_TELL_PATTERNS) {
		// report the surface form, so "delved" reads as itself, not "delve"
		for (const m of sentence.matchAll(re)) {
			flags.push({ file, line, category: 'ai-tell',
				match: m[0].toLowerCase().replace(/\s+/g, ' '),
				hint: 'a common model-writing pattern; state the claim plainly' });
		}
	}
	for (const { phrase, verb, re } of WEAK_VERB_PATTERNS) {
		pushMatches(sentence, re, flags, { file, line, category: 'weak-verb',
			match: phrase, hint: `use the verb: "${verb}"` });
	}
}

// `<!-- terse-ignore -->` on its own line suppresses the findings reported
// on the next non-blank line; `<!-- terse-ignore: cat1 cat2 -->` narrows the
// suppression to the named categories. The comment is invisible in rendered
// markdown, so a documented keep survives in the file, not just in chat.
/** Return line-indexed suppression rules shared by the style and quote checks. */
export function collectSuppressions(rawText) {
	const map = new Map();
	const lines = rawText.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const m = /^[ \t]*<!--\s*terse-ignore(?::([a-z,\s-]+))?\s*-->[ \t]*$/
			.exec(lines[i]);
		if (!m) continue;
		let target = i + 2; // the next line, 1-based
		while (target <= lines.length && lines[target - 1].trim() === '') target++;
		map.set(target, m[1] ? new Set(m[1].split(/[\s,]+/).filter(Boolean)) : 'all');
	}
	return map;
}

/** Return whether a finding is covered by a line's suppression rule. */
export function isSuppressed(map, flag) {
	const cats = map.get(flag.line);
	return cats !== undefined && (cats === 'all' || cats.has(flag.category));
}

// Lexical findings inside quoted material belong to the quoted author, so
// the checker exempts them, as the grammar scope already does for errors.
// Structure and readability stay flagged: a hard sentence is hard to read
// whoever wrote it.
const QUOTED_EXEMPT = new Set(['ai-tell', 'simpler-alternative', 'weak-verb',
	'qualifier', 'preference', 'personal-pronoun', 'em-dash']);

/** Return raw `[start, end]` ranges for quotations in stripped Markdown. */
export function quotedRanges(text) {
	const ranges = [];
	for (const block of text.matchAll(/[^\n][^]*?(?=\n[ \t]*\n|$)/g)) {
		const base = block.index;
		const straight = [];
		for (const m of block[0].matchAll(/"/g)) straight.push(base + m.index);
		for (let i = 0; i + 1 < straight.length; i += 2) {
			ranges.push([straight[i], straight[i + 1]]);
		}
		for (const m of block[0].matchAll(/“[^”]*”/g)) {
			ranges.push([base + m.index, base + m.index + m[0].length - 1]);
		}
	}
	return ranges;
}

function inQuotedRange(ranges, span) {
	return ranges.some(([a, b]) => span[0] > a && span[1] <= b);
}

export function checkText(rawText,
		{ maxGrade = HARD_GRADE, file = '(text)', impersonal = false } = {}) {
	const text = stripMarkdown(rawText);
	const lineAt = makeLineIndex(text);
	const flags = [];
	for (const m of text.matchAll(/—/g)) {
		flags.push({ file, line: lineAt(m.index), category: 'em-dash',
			match: '—', span: [m.index, m.index + 1],
			hint: 'use a period, colon, or comma; parentheses only under six words' });
	}
	// A spaced en dash is an em dash in disguise; ranges like 3–5 stay.
	for (const m of text.matchAll(/(?<=[ \t])–(?=[ \t])/g)) {
		flags.push({ file, line: lineAt(m.index), category: 'em-dash',
			match: '–', span: [m.index, m.index + 1],
			hint: 'use a period, colon, or comma; parentheses only under six words' });
	}
	for (const a of findAsides(text)) {
		const inner = a.inner.replace(/\s+/g, ' ').trim();
		if (wordsOf(inner).length >= ASIDE_WORDS) {
			const cp = [...inner]; // slice by code points so emoji survive the cut
			flags.push({ file, line: lineAt(a.offset), category: 'aside',
				match: `(${cp.slice(0, 40).join('')}${cp.length > 40 ? '...' : ''})`,
				span: [a.offset, a.offset + a.inner.length + 2],
				hint: 'cut the aside, or promote it to its own sentence' });
		}
	}
	const opening = firstProseParagraph(text);
	if (opening) {
		const openingWords = wordsOf(opening.text).length;
		if (openingWords >= OPENING_WORDS) {
			flags.push({ file, line: lineAt(opening.offset),
				category: 'long-opening', match: `${openingWords} words`,
				span: [opening.offset, opening.offset + opening.text.length],
				hint: 'open on the fact the reader needs; move the setup down' });
		}
	}
	// Structural tells can span sentence boundaries, so scan the whole text.
	for (const { phrase, re } of AI_TELL_STRUCTURES) {
		pushMatchesWithLine(text, re, lineAt, flags, { file, category: 'ai-tell',
			match: phrase, hint: 'an AI tell; state the claim plainly' });
	}
	const allWords = [];
	const sentenceLengths = [];
	for (const s of splitSentences(text)) {
		const line = lineAt(s.offset + (s.text.length - s.text.trimStart().length));
		const clean = s.text.replace(/\s+/g, ' ').trim()
			.replace(/^(?:[-*+]|\d{1,2}[.)])\s+/, '');
		const words = wordsOf(clean);
		if (words.length === 0) continue; // horizontal rules, stray symbols
		const before = flags.length;
		checkSentence(clean, maxGrade, flags, file, line);
		checkLexicon(clean, flags, file, line, impersonal);
		assignSpans(text, flags, before, [s.offset, s.offset + s.text.length]);
		allWords.push(...words);
		sentenceLengths.push(words.length);
	}
	const suppressions = collectSuppressions(rawText);
	const quoted = quotedRanges(text);
	const lines = text.split('\n');
	const inBlockquote = (line) => /^[ \t]*>/.test(lines[line - 1] ?? '');
	const kept = flags.filter((f) =>
		!isSuppressed(suppressions, f) &&
		!(QUOTED_EXEMPT.has(f.category) && f.span &&
			(inQuotedRange(quoted, f.span) || inBlockquote(f.line))));
	return { flags: kept, stats: docStats(allWords, sentenceLengths, kept) };
}

// The whole document fails the gate when accumulated dense vocabulary pushes
// its grade past the target, even if no single sentence trips. Enforced in
// the CLI, not as a flag: flags are positional, this finding has no line.
export function docGradeExceeded(stats, maxGrade) {
	return stats.words >= MIN_WORDS_FOR_GRADE && stats.grade >= maxGrade;
}

// Targets scale with length, in the spirit of the classic readability editors.
function docStats(words, sentenceLengths, flags) {
	const count = (cat) => flags.filter((f) => f.category === cat).length;
	const n = words.length;
	const sentenceCount = sentenceLengths.length;
	return {
		words: n,
		sentences: sentenceCount,
		sentenceLengths,
		readingTimeMinutes: n === 0 ? 0 : Math.max(1, Math.round(n / READING_WPM)),
		grade: n === 0 || sentenceCount === 0 ? 0
			: Math.max(0, Math.ceil(4.71 * (alnumCount(words) / n) +
				0.5 * (n / sentenceCount) - 21.43)),
		// Targets calibrated against 7,355 words of Hemingway's newspaper
		// journalism (test/fixtures/human-prose plus samples/hemingway):
		// measured 7.5 adverbs, 8.2 passives, and 2.4 qualifiers per
		// 1,000 words of edited prose.
		adverbs: { count: count('adverb'), target: Math.max(2, Math.round(n / 134)) },
		passive: { count: count('passive-voice'), target: Math.max(2, Math.round(n / 123)) },
		qualifiers: { count: count('qualifier'), target: Math.max(2, Math.round(n / 400)) },
		aiTells: count('ai-tell'),
		hardSentences: count('hard-sentence') + count('very-hard-sentence'),
	};
}

function main() {
	const args = process.argv.slice(2);
	const files = [];
	let json = false;
	let maxGrade = HARD_GRADE;
	let impersonal = false;
	let badArg = false;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '--json') json = true;
		else if (a === '--impersonal') impersonal = true;
		else if (a === '--max-grade') maxGrade = Number(args[++i]);
		else if (a.startsWith('--max-grade=')) {
			maxGrade = a.length > 12 ? Number(a.slice(12)) : NaN;
		}
		else if (a.startsWith('--')) badArg = true;
		else files.push(a);
	}
	if (files.length === 0 || Number.isNaN(maxGrade) || badArg) {
		console.error('usage: node style-check.mjs <file...> ' +
			'[--max-grade N] [--impersonal] [--json]');
		process.exit(2);
	}
	let total = 0;
	const results = [];
	for (const file of files) {
		let raw;
		try {
			raw = readFileSync(file, 'utf8');
		} catch (err) {
			console.error(`style-check: cannot read ${file}: ${err.code ?? err.message}`);
			process.exit(2);
		}
		const { flags, stats } = checkText(raw, { maxGrade, file, impersonal });
		const gradeExceeded = docGradeExceeded(stats, maxGrade);
		total += flags.length + (gradeExceeded ? 1 : 0);
		results.push({ file, flags, stats, docGradeExceeded: gradeExceeded });
		if (json) continue;
		printFlags(flags);
		if (gradeExceeded) {
			console.log(`${file}  [document-grade] "grade ${stats.grade}, target below ` +
				`${maxGrade}" - swap five-dollar words for plain ones and split dense sentences`);
		}
		console.log(`${file}: ${stats.words} words, ~${stats.readingTimeMinutes} min read, ` +
			`grade ${stats.grade}; adverbs ${stats.adverbs.count}/${stats.adverbs.target}, ` +
			`passive ${stats.passive.count}/${stats.passive.target}, ` +
			`qualifiers ${stats.qualifiers.count}/${stats.qualifiers.target}, ` +
			`AI tells ${stats.aiTells}, hard sentences ${stats.hardSentences}`);
	}
	if (json) console.log(JSON.stringify(results, null, 2));
	else console.log(total === 0 ? 'style-check: clean' : `style-check: ${total} flag(s)`);
	process.exit(total === 0 ? 0 : 1);
}

function printFlags(flags) {
	for (const f of flags) {
		console.log(`${f.file}:${f.line}  [${f.category}] "${f.match}" - ${f.hint}`);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
