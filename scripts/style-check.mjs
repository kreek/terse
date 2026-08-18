#!/usr/bin/env node
// Terse's mechanical style checker: deterministic pattern matching, word
// lists, and readability arithmetic. No AI, no network, no dependencies.
// Usage: node style-check.mjs <file...> [--max-grade N] [--json]
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
	'arguably', 'seemingly', 'generally speaking', 'it could be argued',
	'it is important to note', "it's important to note", 'needless to say',
];

// Word-boundary patterns so "unrequited" never matches "quite"; a curly
// apostrophe counts as a straight one.
// "rather than" is a comparison, not a hedge; only bare "rather" hedges.
const QUALIFIER_TAILS = { rather: '(?!\\s+than)' };

const QUALIFIER_PATTERNS = QUALIFIERS.map((q) => ({ phrase: q,
	re: new RegExp(`\\b${q.replace(/ /g, '\\s+').replace(/'/g, "['’]")}\\b` +
		(QUALIFIER_TAILS[q] ?? ''), 'gi') }));

const SIMPLER = {
	utilize: 'use', utilizes: 'uses', utilized: 'used', utilization: 'use',
	leverage: 'use', leverages: 'uses', leveraged: 'used',
	facilitate: 'help', facilitates: 'helps',
	commence: 'start', commences: 'starts', endeavor: 'try',
	demonstrate: 'show', demonstrates: 'shows',
	numerous: 'many', sufficient: 'enough', additional: 'more',
	obtain: 'get', obtains: 'gets', purchase: 'buy', attempt: 'try',
	assist: 'help', assists: 'helps', ascertain: 'find out',
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
};

const SIMPLER_PATTERNS = Object.entries(SIMPLER).map(([phrase, simpler]) => ({
	phrase, simpler,
	re: new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'gi') }));

// Claudisms and AI tells: phrases and vocabulary that mark machine writing.
const AI_TELLS = [
	'load-bearing', 'load bearing', 'doing real work', 'does real work',
	"here's the thing", 'worth noting', 'importantly', 'at its core',
	'the key insight', 'in essence',
	'delve', 'delves', 'delving', 'harness', 'harnesses', 'harnessing',
	'robust', 'seamless', 'seamlessly', 'crucial', 'crucially', 'pivotal',
	'foster', 'fosters', 'fostering', 'streamline', 'streamlines',
	'streamlined', 'underscore', 'underscores', 'underscoring', 'showcase',
	'showcases', 'showcasing', 'unlock', 'unlocks', 'unlocking', 'elevate',
	'elevates', 'testament', 'tapestry', 'landscape', 'realm', 'synergy',
	'journey', 'ecosystem', 'multifaceted', 'transformative', 'cutting-edge',
	'worth stating plainly', 'full stop', 'sit with that', 'the honest take',
	'and that matters', 'carry the argument', 'carries the argument',
	// harvested from model-written launch posts and product copy
	'thrilled to announce', 'excited to announce', 'excited to share',
	'proud to announce', 'under the hood', 'this is just the beginning',
	"can't wait to see", 'game-changer', 'game changer', 'game-changing',
	'revolutionize', 'revolutionizes', 'revolutionary', 'supercharge',
	'supercharges', 'empower', 'empowers', 'empowering', 'unleash',
	'unleashes', 'unleashing', 'effortless', 'effortlessly', 'blazing fast',
	'blazingly', 'deep dive', "in today's fast-paced world",
	'state-of-the-art', 'next-level', 'say goodbye to', 'look no further',
	'frictionless', 'the possibilities are endless', 'with confidence',
];

const AI_TELL_PATTERNS = AI_TELLS.map((q) => ({ phrase: q,
	re: new RegExp(`\\b${q.replace(/ /g, '\\s+').replace(/'/g, "['’]")}\\b`, 'gi') }));

// Structural tells: negative parallelisms, reflexive validation, and punchy
// fragments. Matched against the whole text (some span sentence boundaries),
// so word gaps are \s+ to survive wrapped lines.
const AI_TELL_STRUCTURES = [
	{ phrase: "it's not X, it's Y",
		re: /\b(?:it|this|that)['’]s\s+not\s+(?:just\s+|only\s+)?[^,;.]{1,40}[,;]\s+(?:it|this|that)['’]s\b/gi },
	{ phrase: "isn't just X, it's Y",
		re: /\bisn['’]t\s+(?:just|only)\s+[^,;.—]{1,40}[,;—]\s*(?:it|this|that)['’]s\b/gi },
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
	'begun', 'bought', 'brought', 'broken', 'built', 'caught', 'chosen',
	'done', 'drawn', 'driven', 'eaten', 'felt', 'found', 'forgotten',
	'frozen', 'given', 'gone', 'held', 'hidden', 'kept', 'known', 'led',
	'left', 'lost', 'made', 'meant', 'paid', 'put', 'read', 'run', 'seen',
	'sent', 'set', 'shown', 'sold', 'spent', 'split', 'taken', 'told',
	'thought', 'torn', 'understood', 'worn', 'written',
]);

// Words the passive pattern must never read as participles: -ed lookalikes
// and adjectival forms ("the actor is unknown" is a state, not a passive).
const NOT_PARTICIPLES = new Set([
	'indeed', 'hundred', 'sacred', 'naked', 'wicked', 'hatred', 'kindred',
	'unknown', 'unseen', 'unwritten', 'unspoken', 'unbroken', 'mistaken',
]);

// Exported for the conservation property tests.
export function stripMarkdown(text) {
	return text
		.replace(/^---\n[\s\S]*?\n---(?=\n|$)/, (m) => m.replace(/[^\n]/g, ' '))
		.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '))
		.replace(/`[^`\n]+`/g, (m) => ' '.repeat(m.length))
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
	for (let i = from; i < flags.length; i++) {
		if (flags[i].span) continue;
		flags[i].span = SENTENCE_LEVEL.has(flags[i].category)
			? span : refineSpan(text, span, flags[i].match) ?? span;
	}
}

function refineSpan(text, span, match) {
	const re = new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		.replace(/\s+/g, '\\s+').replace(/['’]/g, "['’]"), 'i');
	const m = re.exec(text.slice(span[0], span[1]));
	return m ? [span[0] + m.index, span[0] + m.index + m[0].length] : null;
}

function checkLexicon(sentence, flags, file, line) {
	for (const { phrase, re } of QUALIFIER_PATTERNS) {
		pushMatches(sentence, re, flags, { file, line, category: 'qualifier',
			match: phrase,
			hint: 'delete it or state the evidence; keep only if the hedge is the claim' });
	}
	for (const { phrase, simpler, re } of SIMPLER_PATTERNS) {
		pushMatches(sentence, re, flags, { file, line,
			category: 'simpler-alternative', match: phrase, hint: `use "${simpler}"` });
	}
	for (const { phrase, re } of AI_TELL_PATTERNS) {
		pushMatches(sentence, re, flags, { file, line, category: 'ai-tell',
			match: phrase, hint: 'an AI tell; state the claim plainly' });
	}
	for (const { phrase, verb, re } of WEAK_VERB_PATTERNS) {
		pushMatches(sentence, re, flags, { file, line, category: 'weak-verb',
			match: phrase, hint: `use the verb: "${verb}"` });
	}
}

export function checkText(rawText, { maxGrade = HARD_GRADE, file = '(text)' } = {}) {
	const text = stripMarkdown(rawText);
	const lineAt = makeLineIndex(text);
	const flags = [];
	for (const m of text.matchAll(/—/g)) {
		flags.push({ file, line: lineAt(m.index), category: 'em-dash',
			match: '—', span: [m.index, m.index + 1],
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
		checkLexicon(clean, flags, file, line);
		assignSpans(text, flags, before, [s.offset, s.offset + s.text.length]);
		allWords.push(...words);
		sentenceLengths.push(words.length);
	}
	return { flags, stats: docStats(allWords, sentenceLengths, flags) };
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
	let badArg = false;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '--json') json = true;
		else if (a === '--max-grade') maxGrade = Number(args[++i]);
		else if (a.startsWith('--max-grade=')) {
			maxGrade = a.length > 12 ? Number(a.slice(12)) : NaN;
		}
		else if (a.startsWith('--')) badArg = true;
		else files.push(a);
	}
	if (files.length === 0 || Number.isNaN(maxGrade) || badArg) {
		console.error('usage: node style-check.mjs <file...> [--max-grade N] [--json]');
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
		const { flags, stats } = checkText(raw, { maxGrade, file });
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
