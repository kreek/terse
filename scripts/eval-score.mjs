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
		for (const f of Array.isArray(run[key]) ? run[key] : []) {
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
	return docs;
}

function scoreArm(runs) {
	let words = 0, flags = 0, tells = 0, docs = 0, gradeSum = 0;
	for (const run of runs) {
		for (const doc of extractDocs(run)) {
			const r = checkText(doc.content, { file: doc.name });
			words += r.stats.words;
			flags += r.flags.length;
			tells += r.stats.aiTells;
			gradeSum += r.stats.grade;
			docs++;
		}
	}
	if (docs === 0) return null;
	return {
		docs,
		flagsPerKword: words ? (flags / words) * 1000 : 0,
		aiTells: tells,
		meanGrade: gradeSum / docs,
	};
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

let failures = 0;
let scoredAny = false;
console.log('case                    arm      docs  flags/kw  AI tells  grade');
for (const c of cases) {
	const scores = {};
	for (const arm of ARM_NAMES) {
		const runs = c.arms?.[arm] ?? [];
		scores[arm] = scoreArm(runs);
		if (scores[arm]) {
			scoredAny = true;
			const s = scores[arm];
			console.log(`${(c.name ?? '?').padEnd(24)}${arm.padEnd(9)}` +
				`${String(s.docs).padEnd(6)}${fmt(s.flagsPerKword).padEnd(10)}` +
				`${String(s.aiTells).padEnd(10)}${fmt(s.meanGrade)}`);
		}
	}
	const w = scores.with, wo = scores.without;
	if (w && w.aiTells > 0) {
		console.log(`  FAIL ${c.name}: with-plugin output contains ${w.aiTells} AI tell(s)`);
		failures++;
	}
	if (w && wo && w.flagsPerKword >= wo.flagsPerKword) {
		console.log(`  FAIL ${c.name}: with-plugin flags/kword (${fmt(w.flagsPerKword)}) ` +
			`not below without (${fmt(wo.flagsPerKword)})`);
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
