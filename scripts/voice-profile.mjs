#!/usr/bin/env node
// Measures a voice from writing samples for the voice skill. It screens each
// sample for AI tells, so the voice learns the author and not a model's
// polish, then measures the kept samples by the style checker's own rules.
// The skill turns the numbers into questions for the author and, once they
// approve, into .terse/config.json. Deterministic: no model or network.
// Usage: node voice-profile.mjs <file-or-folder...> [--no-screen] [--json]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkText, DEFAULT_RATES, HARD_GRADE } from './style-check.mjs';

// A sample is set aside at 2 or more AI tells and 3 or more per 1,000 words.
// Calibrated on the repo's human prose (samples/hemingway and the human-prose
// fixtures: 0 tells in 7,355 words) against Claude's default README register
// (41 per 1,000). The two-tell floor keeps one stray phrase in a short sample
// from excluding it. Emoji do not count: people use them in chat and PRs, the
// short pieces the skill gathers one file each.
const SCREEN_RATE = 3;
const SCREEN_MIN_TELLS = 2;
// Under three samples or 1,500 words, the profile is too thin to trust.
const THIN_SAMPLES = 3;
const THIN_WORDS = 1500;
// The checker categories whose rate a config target can raise.
const TARGET_KEYS = { adverb: 'adverbsPerKword', 'passive-voice': 'passivePerKword',
	qualifier: 'qualifiersPerKword' };
// A keep on a word-level category names one match (`simpler-alternative:
// utilize`), so keeping one phrase does not exempt the whole list. Other
// categories are structural and kept whole. Grammar is never a voice, and the
// three rate categories are counted against targets instead.
const KEEP_PER_MATCH = new Set(['ai-tell', 'simpler-alternative', 'weak-verb', 'preference']);
const NEVER_KEPT = new Set(['grammar', ...Object.keys(TARGET_KEYS)]);
const KEEP_RATE = 1; // per 1,000 words: rarer habits are not worth a question
const PROSE = /\.(?:md|markdown|txt)$/i;

const round1 = (n) => Math.round(n * 10) / 10;
const perKword = (count, words) => (words === 0 ? 0 : round1((count * 1000) / words));
const sum = (values) => values.reduce((total, n) => total + n, 0);

/**
 * Screens and measures writing samples.
 * @param {{ file: string, text: string }[]} samples the author's prose
 * @param {{ screen?: boolean }} options screen: false keeps every sample
 * @returns {{ samples: object[], profile: object | null }} one screen result
 *   per sample, in order, and the profile of the kept samples, or null when
 *   none was kept
 */
export function profileSamples(samples, { screen = true } = {}) {
	const measured = samples.map(({ file, text }) => ({ file, text, ...checkText(text, { file }) }));
	const screened = measured.map((sample) => screenSample(sample, screen));
	const kept = measured.filter((_, i) => screened[i].kept);
	return { samples: screened, profile: kept.length === 0 ? null : buildProfile(kept) };
}

function screenSample({ file, flags, stats }, screen) {
	const tells = flags.filter((f) => f.category === 'ai-tell' && f.match !== 'emoji').length;
	const rate = stats.words === 0 ? 0 : (tells * 1000) / stats.words;
	const setAside = screen && tells >= SCREEN_MIN_TELLS && rate >= SCREEN_RATE;
	return { file, words: stats.words, aiTells: tells, aiTellsPerKword: round1(rate),
		kept: !setAside };
}

// Counts and sentence lengths sum across samples, so each rate matches what
// the checker reports file by file. The grade needs the character counts, so
// it reads the kept samples as one document.
function buildProfile(kept) {
	const words = sum(kept.map((sample) => sample.stats.words));
	const grade = checkText(kept.map((sample) => sample.text).join('\n\n')).stats.grade;
	const flags = kept.flatMap((sample) => sample.flags);
	const rates = categoryRates(flags, words);
	return {
		samples: kept.length,
		words,
		thin: kept.length < THIN_SAMPLES || words < THIN_WORDS,
		sentenceLength: lengthSpread(kept.flatMap((sample) => sample.stats.sentenceLengths)),
		grade,
		rates,
		suggested: suggestConfig(grade, rates),
		candidates: keepCandidates(flags, words),
	};
}

// Nearest-rank percentiles over every sentence's word count.
function lengthSpread(lengths) {
	if (lengths.length === 0) return { mean: 0, median: 0, p10: 0, p90: 0 };
	const sorted = [...lengths].sort((a, b) => a - b);
	const rank = (p) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
	return { mean: round1(sum(sorted) / sorted.length), median: rank(0.5),
		p10: rank(0.1), p90: rank(0.9) };
}

// One entry per category, highest rate first. Each carries its first
// occurrence as evidence, and the default for a rate a target can raise.
function categoryRates(flags, words) {
	const entries = [...groupBy(flags, (f) => f.category)].map(([category, group]) => {
		const entry = { count: group.length, perKword: perKword(group.length, words),
			example: exampleOf(group[0]) };
		if (TARGET_KEYS[category]) entry.default = DEFAULT_RATES[TARGET_KEYS[category]];
		return [category, entry];
	});
	return Object.fromEntries(entries.sort((a, b) => b[1].perKword - a[1].perKword));
}

// The habits the author might keep, as the ignore keys that would keep them,
// highest rate first. Each needs 1 or more per 1,000 words and carries its
// first occurrence, so the question can quote the author's own sentence.
function keepCandidates(flags, words) {
	const keyOf = (f) => (KEEP_PER_MATCH.has(f.category) ? `${f.category}:${f.match}` : f.category);
	const keepable = flags.filter((f) => !NEVER_KEPT.has(f.category));
	return [...groupBy(keepable, keyOf)]
		.filter(([, group]) => (group.length * 1000) / words >= KEEP_RATE)
		.map(([ignore, group]) => ({ ignore, count: group.length,
			perKword: perKword(group.length, words), example: exampleOf(group[0]) }))
		.sort((a, b) => b.perKword - a.perKword);
}

function groupBy(items, keyOf) {
	const groups = new Map();
	for (const item of items) groups.set(keyOf(item), [...(groups.get(keyOf(item)) ?? []), item]);
	return groups;
}

const exampleOf = ({ file, line, match }) => ({ file, line, match });

// Suggestions only ever loosen the defaults: the author's measured habits
// become the targets. The grade limit sits one above the measured grade,
// because the checker fails a document at or above its limit.
function suggestConfig(grade, rates) {
	const suggested = {};
	if (grade + 1 > HARD_GRADE) suggested.maxGrade = grade + 1;
	const targets = {};
	for (const [category, key] of Object.entries(TARGET_KEYS)) {
		const measured = rates[category]?.perKword ?? 0;
		if (measured > DEFAULT_RATES[key]) targets[key] = measured;
	}
	if (Object.keys(targets).length > 0) suggested.targets = targets;
	return suggested;
}

// Every prose file under the given paths, as absolute paths, sorted, each
// once however it was spelled. Hidden folders and node_modules are skipped.
// Throws when a path does not exist.
function collectFiles(paths) {
	return [...new Set(walk(paths).map((file) => resolve(file)))].sort();
}

function walk(paths) {
	const files = [];
	for (const path of paths) {
		if (!statSync(path).isDirectory()) files.push(path);
		else files.push(...walk(readdirSync(path)
			.filter((name) => !name.startsWith('.') && name !== 'node_modules')
			.map((name) => join(path, name)))
			.filter((file) => PROSE.test(file)));
	}
	return files;
}

function printReport({ samples, profile }) {
	for (const s of samples) {
		console.log(`${s.kept ? 'kept     ' : 'set aside'} ${s.file}  ${s.words} words, ` +
			`AI tells ${s.aiTellsPerKword} per 1,000`);
	}
	console.log('');
	if (!profile) {
		console.log('No samples left after screening; --no-screen measures them anyway.');
		return;
	}
	const { mean, median, p10, p90 } = profile.sentenceLength;
	const rates = Object.entries(profile.rates).map(([category, r]) =>
		`${category} ${r.perKword}${r.default === undefined ? '' : ` (default ${r.default})`}`);
	console.log(`${profile.samples} kept samples, ${profile.words} words` +
		(profile.thin ? ' (thin: under 3 samples or 1,500 words)' : ''));
	console.log(`sentence length: mean ${mean}, median ${median}, 10th to 90th percentile ${p10} to ${p90}`);
	console.log(`grade ${profile.grade}`);
	console.log(`per 1,000 words: ${rates.join(', ') || 'no findings'}`);
	console.log(`suggested config: ${JSON.stringify(profile.suggested)}`);
	for (const c of profile.candidates) {
		console.log(`keep? ${c.ignore}: ${c.perKword} per 1,000, first at ` +
			`${c.example.file}:${c.example.line}`);
	}
}

function main() {
	const args = process.argv.slice(2);
	const paths = args.filter((a) => !a.startsWith('--'));
	const flags = args.filter((a) => a.startsWith('--'));
	if (paths.length === 0 || flags.some((f) => f !== '--json' && f !== '--no-screen')) {
		console.error('usage: node voice-profile.mjs <file-or-folder...> [--no-screen] [--json]');
		process.exitCode = 2;
		return;
	}
	const files = collectFiles(paths);
	if (files.length === 0) {
		console.error('voice-profile: no .md, .markdown, or .txt files to read');
		process.exitCode = 2;
		return;
	}
	const samples = files.map((file) => ({ file, text: readFileSync(file, 'utf8') }));
	const result = profileSamples(samples, { screen: !flags.includes('--no-screen') });
	if (flags.includes('--json')) console.log(JSON.stringify(result, null, 2));
	else printReport(result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		main();
	} catch (err) {
		console.error(`voice-profile: ${err.message}`);
		process.exitCode = 2;
	}
}
