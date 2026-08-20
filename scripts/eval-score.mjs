#!/usr/bin/env node
// Post-scores a `claude plugin eval` run with terse's own checker: flags per
// thousand words, AI tells, and grade, per arm, with the delta. The eval's
// graders judge pass/fail per case; this reports the magnitude of the
// improvement across arms, which is the "demonstrable improvement" number.
// Usage: node eval-score.mjs <aggregate-result.json>
import { readFileSync, existsSync } from 'node:fs';
import { checkText } from './style-check.mjs';

const ARM_NAMES = ['with', 'without'];

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
console.log('case                    arm      docs  flags/kw  AI tells  grade');
for (const c of cases) {
	const scores = scoreAndPrintArms(c);
	if (scores.with || scores.without) scoredAny = true;
	const w = scores.with, wo = scores.without;
	if (w && w.aiTells > 0) {
		console.log(`  FAIL ${c.name}: with-plugin output contains ${w.aiTells} AI tell(s)`);
		failures++;
	}
	// A grammar-scope case must not ADD style flags; equality is correct
	// behavior (the pass leaves style alone). Style cases must be below the
	// without arm, except when both arms come out clean: zero cannot improve
	// on zero, and a clean with-arm is the goal, not a failure.
	const grammarScope = (c.tags ?? []).includes('grammar');
	const worse = grammarScope
		? w?.flagsPerKword > wo?.flagsPerKword
		: w?.flagsPerKword > 0 && w?.flagsPerKword >= wo?.flagsPerKword;
	if (w && wo && worse) {
		console.log(`  FAIL ${c.name}: with-plugin flags/kword (${fmt(w.flagsPerKword)}) ` +
			`${grammarScope ? 'above' : 'not below'} without (${fmt(wo.flagsPerKword)})`);
		failures++;
	}
	if (w && wo) {
		console.log(`  delta ${c.name}: ${fmt(wo.flagsPerKword - w.flagsPerKword)} ` +
			`fewer flags/kword with the plugin`);
	}
}

if (!scoredAny) {
	console.error('eval-score: no produced .md files found in the report; ' +
		'run the eval with --keep-temp or check the aggregate schema');
	process.exit(2);
}
console.log(failures === 0 ? 'eval-score: improvement demonstrated'
	: `eval-score: ${failures} acceptance failure(s)`);
process.exit(failures === 0 ? 0 : 1);
