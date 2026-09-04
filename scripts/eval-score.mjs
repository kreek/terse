#!/usr/bin/env node
// Post-scores a Terse eval run with the checker: total flags, flags per
// thousand words, AI tells, and grade, per arm, with the delta.
// Usage: node eval-score.mjs <aggregate-result.json>
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gradeRegexGraders, loadGraders } from './eval-graders.mjs';
import { createDocumentChecker } from './style-check.mjs';

const ARM_NAMES = ['with', 'without'];
const EVALS = join(dirname(dirname(fileURLToPath(import.meta.url))), 'evals');
const RECORD_FILE = /(?:^|[-/])(?:outline|skeleton)\.md$/i;

function extractDocs(run) {
	const docs = [];
	const fromMap = (files) => {
		for (const [name, value] of Object.entries(files)) {
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
	for (const file of entries) {
		if (typeof file === 'string' && file.endsWith('.md') && existsSync(file)) {
			docs.push({ name: file, content: readFileSync(file, 'utf8') });
		} else if (file && typeof file.path === 'string' && file.path.endsWith('.md')) {
			if (typeof file.content === 'string') {
				docs.push({ name: file.path, content: file.content });
			} else if (existsSync(file.path)) {
				docs.push({ name: file.path, content: readFileSync(file.path, 'utf8') });
			}
		}
	}
}

function isDeliverable(name, deliverables) {
	if (Array.isArray(deliverables) && deliverables.length > 0) {
		return deliverables.some((file) => name === file || name.endsWith(`/${file}`));
	}
	return !RECORD_FILE.test(name);
}

async function scoreArm(checker, runs, deliverables) {
	const totals = { words: 0, flags: 0, tells: 0, docs: 0, gradeSum: 0 };
	for (const run of runs) {
		const docs = extractDocs(run)
			.filter((doc) => isDeliverable(doc.name, deliverables));
		await scoreRunDocs(checker, docs, totals);
	}
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

async function scoreRunDocs(checker, docs, totals) {
	for (const doc of docs) {
		const result = await checker.checkDocument(doc.content, { file: doc.name });
		totals.words += result.stats.words;
		totals.flags += result.flags.length;
		totals.tells += result.stats.aiTells;
		totals.gradeSum += result.stats.grade;
		totals.docs++;
	}
}

function currentGraders(evalCase, run) {
	let definitions;
	try {
		definitions = loadGraders(join(EVALS, evalCase.name, 'graders'));
	} catch {
		return run.graders ?? [];
	}
	const files = Object.fromEntries(extractDocs(run)
		.filter((doc) => isDeliverable(doc.name, evalCase.deliverables))
		.map(({ name, content }) => [name, content]));
	const recordedNonRegex = (run.graders ?? [])
		.filter((grader) => grader.type !== 'regex');
	return [...recordedNonRegex, ...gradeRegexGraders(definitions, files)];
}

function fmt(number) {
	return number.toFixed(1);
}

async function scoreAndPrintArms(checker, evalCase) {
	const scores = {};
	for (const arm of ARM_NAMES) {
		scores[arm] = await scoreArm(checker,
			evalCase.arms?.[arm] ?? [], evalCase.deliverables);
		if (!scores[arm]) continue;
		const score = scores[arm];
		console.log(`${(evalCase.name ?? '?').padEnd(24)}${arm.padEnd(9)}` +
			`${String(score.docs).padEnd(6)}${fmt(score.flagsPerKword).padEnd(10)}` +
			`${String(score.aiTells).padEnd(10)}${fmt(score.meanGrade)}`);
	}
	return scores;
}

async function scoreReport(report) {
	const cases = report.cases ?? [];
	if (cases.length === 0) {
		console.error('eval-score: no cases in report');
		return 2;
	}

	const checker = createDocumentChecker();
	try {
		let failures = 0;
		let scoredAny = false;
		let improvedAny = false;
		let improvedStyleCases = 0;
		console.log('case                    arm      docs  flags/kw  AI tells  grade');
		for (const evalCase of cases) {
			const scores = await scoreAndPrintArms(checker, evalCase);
			if (scores.with || scores.without) scoredAny = true;
			const withPlugin = scores.with;
			const withoutPlugin = scores.without;
			if (!withPlugin || !withoutPlugin) {
				console.log(`  FAIL ${evalCase.name}: both A/B arms must produce at least one document`);
				failures++;
			}
			if (withPlugin && withPlugin.aiTells > 0) {
				console.log(`  FAIL ${evalCase.name}: with-plugin output contains ` +
					`${withPlugin.aiTells} AI tell(s)`);
				failures++;
			}
			const grammarScope = (evalCase.tags ?? []).includes('grammar');
			const worse = grammarScope
				? withPlugin?.totalFlags > withoutPlugin?.totalFlags
				: withPlugin?.totalFlags > 0 &&
					withPlugin?.totalFlags >= withoutPlugin?.totalFlags;
			if (withPlugin && withoutPlugin && worse) {
				console.log(`  FAIL ${evalCase.name}: with-plugin total flags ` +
					`(${withPlugin.totalFlags}) ${grammarScope ? 'above' : 'not below'} ` +
					`without (${withoutPlugin.totalFlags})`);
				failures++;
			}
			if (withPlugin && withoutPlugin &&
				withPlugin.totalFlags < withoutPlugin.totalFlags) {
				improvedAny = true;
				if (!grammarScope) improvedStyleCases++;
			}
			failures += gradeRuns(evalCase);
			if (withPlugin && withoutPlugin) {
				console.log(`  delta ${evalCase.name}: ` +
					`${fmt(withoutPlugin.flagsPerKword - withPlugin.flagsPerKword)} ` +
					'fewer flags/kword with the plugin');
			}
		}

		if (cases.length > 1 && improvedStyleCases === 0) {
			console.log('  FAIL suite: no style case improved on its paired baseline');
			failures++;
		}
		if (!scoredAny) {
			console.error('eval-score: no produced .md files found in the report; ' +
				'run the eval with --keep-temp or check the aggregate schema');
			return 2;
		}
		const success = improvedAny
			? 'eval-score: improvement demonstrated'
			: 'eval-score: acceptance passed (clean tie)';
		console.log(failures === 0 ? success : `eval-score: ${failures} acceptance failure(s)`);
		return failures === 0 ? 0 : 1;
	} finally {
		await checker.dispose();
	}
}

function gradeRuns(evalCase) {
	let failures = 0;
	for (const arm of ARM_NAMES) {
		for (const run of evalCase.arms?.[arm] ?? []) {
			if (run.error) {
				console.log(`  FAIL ${evalCase.name}: ${arm}-plugin run error: ${run.error}`);
				failures++;
			}
			for (const grader of currentGraders(evalCase, run)) {
				if (arm === 'with' && grader.scored && !grader.pass) {
					console.log(`  FAIL ${evalCase.name}: with-plugin grader ${grader.name} failed`);
					failures++;
				}
				if (arm === 'without' && grader.type === 'tool_used' && grader.pass) {
					console.log(`  FAIL ${evalCase.name}: Terse activated in the without-plugin arm`);
					failures++;
				}
			}
		}
	}
	return failures;
}

async function main() {
	const path = process.argv[2];
	if (!path) {
		console.error('usage: node eval-score.mjs <aggregate-result.json>');
		process.exitCode = 2;
		return;
	}
	const report = JSON.parse(readFileSync(path, 'utf8'));
	process.exitCode = await scoreReport(report);
}

main().catch((error) => {
	console.error(`eval-score: ${error.message}`);
	process.exitCode = 2;
});
