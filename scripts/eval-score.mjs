#!/usr/bin/env node
// Post-scores a Terse eval run with the checker: total flags, flags per
// thousand words, AI tells, and grade, per arm, with the delta. The eval's
// graders judge pass/fail per case; this reports the magnitude of the
// improvement across arms, which is the "demonstrable improvement" number.
// Usage: node eval-score.mjs <aggregate-result.json>
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkText } from './style-check.mjs';
import { gradeRegexGraders, loadGraders } from './eval-graders.mjs';

const ARM_NAMES = ['with', 'without'];
const EVALS = join(dirname(dirname(fileURLToPath(import.meta.url))), 'evals');

// The aggregate schema may embed produced-file contents or only paths, and
// early-access builds vary. Walk each arm's runs and accept either shape.
function extractDocs(run) {
	const docs = [];
	const fromMap = (obj) => {
		for (const [name, value] of Object.entries(obj)) {
			if (!name.endsWith('.md')) continue;
			if (typeof value === 'string') docs.push({ name, content: value });
			else if (value && typeof value.content === 'string') {
				docs.push({ name, content: value.content });
			}
		}
	};
	if (run.files && typeof run.files === 'object') fromMap(run.files);
	for (const key of ['createdFiles', 'artifacts', 'outputs']) {
		collectListedDocs(Array.isArray(run[key]) ? run[key] : [], docs);
	}
	return docs;
}

function collectListedDocs(entries, docs) {
	for (const f of entries) {
		if (typeof f === 'string' && f.endsWith('.md') && existsSync(f)) {
			docs.push({ name: f, content: readFileSync(f, 'utf8') });
		} else if (f && typeof f.path === 'string' && f.path.endsWith('.md')) {
			if (typeof f.content === 'string') docs.push({ name: f.path, content: f.content });
			else if (existsSync(f.path)) {
				docs.push({ name: f.path, content: readFileSync(f.path, 'utf8') });
			}
		}
	}
}

function scoreArm(runs) {
	const totals = { words: 0, flags: 0, tells: 0, docs: 0, gradeSum: 0 };
	for (const run of runs) scoreRunDocs(extractDocs(run), totals);
	const { words, flags, tells, docs, gradeSum } = totals;
	if (docs === 0) return null;
	return {
		docs,
		totalFlags: flags,
		flagsPerKword: words ? (flags / words) * 1000 : 0,
		aiTells: tells,
		meanGrade: gradeSum / docs,
	};
}

function scoreRunDocs(docs, totals) {
	for (const doc of docs) {
		const r = checkText(doc.content, { file: doc.name });
		totals.words += r.stats.words;
		totals.flags += r.flags.length;
		totals.tells += r.stats.aiTells;
		totals.gradeSum += r.stats.grade;
		totals.docs++;
	}
}

function fmt(n) { return n.toFixed(1); }

function currentGraders(c, run) {
	let definitions;
	try {
		definitions = loadGraders(join(EVALS, c.name, 'graders'));
	} catch {
		return run.graders ?? [];
	}
	const files = Object.fromEntries(extractDocs(run)
		.map(({ name, content }) => [name, content]));
	const recordedNonRegex = (run.graders ?? [])
		.filter((grader) => grader.type !== 'regex');
	return [...recordedNonRegex, ...gradeRegexGraders(definitions, files)];
}

const path = process.argv[2];
if (!path) {
	console.error('usage: node eval-score.mjs <aggregate-result.json>');
	process.exit(2);
}
const report = JSON.parse(readFileSync(path, 'utf8'));
const cases = report.cases ?? [];
if (cases.length === 0) {
	console.error('eval-score: no cases in report');
	process.exit(2);
}

function scoreAndPrintArms(c) {
	const scores = {};
	for (const arm of ARM_NAMES) {
		scores[arm] = scoreArm(c.arms?.[arm] ?? []);
		if (!scores[arm]) continue;
		const s = scores[arm];
		console.log(`${(c.name ?? '?').padEnd(24)}${arm.padEnd(9)}` +
			`${String(s.docs).padEnd(6)}${fmt(s.flagsPerKword).padEnd(10)}` +
			`${String(s.aiTells).padEnd(10)}${fmt(s.meanGrade)}`);
	}
	return scores;
}

let failures = 0;
let scoredAny = false;
let improvedStyleCases = 0;
console.log('case                    arm      docs  flags/kw  AI tells  grade');
for (const c of cases) {
	const scores = scoreAndPrintArms(c);
	if (scores.with || scores.without) scoredAny = true;
	const w = scores.with, wo = scores.without;
	if (!w || !wo) {
		console.log(`  FAIL ${c.name}: both A/B arms must produce at least one document`);
		failures++;
	}
	if (w && w.aiTells > 0) {
		console.log(`  FAIL ${c.name}: with-plugin output contains ${w.aiTells} AI tell(s)`);
		failures++;
	}
	// A grammar-scope case must not add style flags. A clean style arm cannot
	// improve below zero, so a zero/zero tie passes; every non-clean arm must win.
	const grammarScope = (c.tags ?? []).includes('grammar');
	const worse = grammarScope
		? w?.totalFlags > wo?.totalFlags
		: w?.totalFlags > 0 && w?.totalFlags >= wo?.totalFlags;
	if (w && wo && worse) {
		console.log(`  FAIL ${c.name}: with-plugin total flags (${w.totalFlags}) ` +
			`${grammarScope ? 'above' : 'not below'} without (${wo.totalFlags})`);
		failures++;
	}
	if (!grammarScope && w && wo && w.totalFlags < wo.totalFlags) {
		improvedStyleCases++;
	}
	for (const arm of ARM_NAMES) {
		for (const run of c.arms?.[arm] ?? []) {
			if (run.error) {
				console.log(`  FAIL ${c.name}: ${arm}-plugin run error: ${run.error}`);
				failures++;
			}
			for (const grader of currentGraders(c, run)) {
				if (arm === 'with' && grader.scored && !grader.pass) {
					console.log(`  FAIL ${c.name}: with-plugin grader ${grader.name} failed`);
					failures++;
				}
				if (arm === 'without' && grader.type === 'tool_used' && grader.pass) {
					console.log(`  FAIL ${c.name}: Terse activated in the without-plugin arm`);
					failures++;
				}
			}
		}
	}
	if (w && wo) {
		console.log(`  delta ${c.name}: ${fmt(wo.flagsPerKword - w.flagsPerKword)} ` +
			`fewer flags/kword with the plugin`);
	}
}

if (cases.length > 1 && improvedStyleCases === 0) {
	console.log('  FAIL suite: no style case improved on its paired baseline');
	failures++;
}

if (!scoredAny) {
	console.error('eval-score: no produced .md files found in the report; ' +
		'run the eval with --keep-temp or check the aggregate schema');
	process.exit(2);
}
const success = improvedStyleCases > 0
	? 'eval-score: improvement demonstrated'
	: 'eval-score: acceptance passed (clean tie)';
console.log(failures === 0 ? success : `eval-score: ${failures} acceptance failure(s)`);
process.exit(failures === 0 ? 0 : 1);
