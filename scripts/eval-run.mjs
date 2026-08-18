#!/usr/bin/env node
// Fallback ablation runner for the evals/ suite, for accounts where
// `claude plugin eval` is still early-access gated. Runs each case twice in
// headless sessions (with: --bare --plugin-dir <repo>; without: --bare),
// applies the regex graders, and writes an aggregate report in the shape
// scripts/eval-score.mjs consumes. llm and tool_used graders are recorded
// as unscored; the delta table rests on produced files and regex verdicts.
// Usage: node eval-run.mjs [--runs N] [--case name] [--out path.json]
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const EVALS = join(REPO, 'evals');
const RUN_TIMEOUT_MS = 10 * 60 * 1000;

function parseFrontmatter(text) {
	const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) return { meta: {}, body: text };
	const meta = {};
	for (const line of m[1].split('\n')) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (kv) meta[kv[1]] = kv[2].trim();
	}
	return { meta, body: m[2].trim() };
}

function loadCases(filter) {
	const cases = [];
	for (const entry of readdirSync(EVALS, { withFileTypes: true })) {
		if (!entry.isDirectory() || entry.name === 'results') continue;
		if (filter && entry.name !== filter) continue;
		const dir = join(EVALS, entry.name);
		const { meta, body } = parseFrontmatter(readFileSync(join(dir, 'prompt.md'), 'utf8'));
		const graders = [];
		for (const g of readdirSync(join(dir, 'graders'))) {
			const raw = readFileSync(join(dir, 'graders', g), 'utf8');
			const parsed = parseFrontmatter(raw);
			graders.push({ name: g.replace(/\.md$/, ''), ...parsed.meta });
		}
		cases.push({
			name: meta.name ?? entry.name,
			runs: Number(meta.runs) || 1,
			maxTurns: Number(meta.max_turns) || 10,
			prompt: body,
			graders,
		});
	}
	return cases;
}

// Grader patterns are written for the eval tool with a YAML double-quoted
// scalar and an inline (?i). Convert to a JS RegExp.
function toRegex(pattern) {
	let p = pattern.replace(/^"|"$/g, '').replace(/\\\\/g, '\\');
	let flags = '';
	if (p.startsWith('(?i)')) { p = p.slice(4); flags = 'i'; }
	return new RegExp(p, flags);
}

function gradeFiles(graders, files) {
	return graders.map((g) => {
		if (g.type !== 'regex') return { name: g.name, type: g.type, scored: false };
		const path = (g.target ?? '').match(/path:\s*([\w.-]+)/)?.[1];
		const content = path ? files[path] : Object.values(files).join('\n');
		if (content === undefined) {
			return { name: g.name, type: g.type, scored: true, pass: false,
				note: `missing file ${path}` };
		}
		const hit = toRegex(g.pattern).test(content);
		const pass = (g.match ?? 'contains').trim() === 'not_contains' ? !hit : hit;
		return { name: g.name, type: g.type, scored: true, pass };
	});
}

async function runOnce(c, arm) {
	const dir = mkdtempSync(join(tmpdir(), `terse-eval-${c.name}-${arm}-`));
	const args = ['-p', c.prompt, '--bare',
		'--allowedTools', 'Read', 'Write', 'Edit',
		'--max-turns', String(c.maxTurns)];
	if (arm === 'with') args.push('--plugin-dir', REPO);
	let error = null;
	try {
		await execFileP('claude', args, { cwd: dir, timeout: RUN_TIMEOUT_MS,
			maxBuffer: 16 * 1024 * 1024 });
	} catch (err) {
		error = err.killed ? 'timeout' : `exit ${err.code}`;
	}
	const files = {};
	for (const f of readdirSync(dir)) {
		if (f.endsWith('.md')) files[f] = readFileSync(join(dir, f), 'utf8');
	}
	return { dir, files, error, graders: gradeFiles(c.graders, files) };
}

const args = process.argv.slice(2);
const opt = (name, dflt) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : dflt;
};
const runs = Number(opt('--runs', 0)) || null;
const caseFilter = opt('--case', null);
const outPath = opt('--out', join(EVALS, 'results', 'latest.json'));

const cases = loadCases(caseFilter);
if (cases.length === 0) {
	console.error('eval-run: no cases matched');
	process.exit(2);
}
mkdirSync(dirname(outPath), { recursive: true });

const report = { schemaVersion: 1, suite: 'terse (fallback runner)', cases: [] };
for (const c of cases) {
	const n = runs ?? c.runs;
	console.error(`case ${c.name}: ${n} run(s) per arm`);
	const arms = { with: [], without: [] };
	for (let i = 0; i < n; i++) {
		const [w, wo] = await Promise.all([runOnce(c, 'with'), runOnce(c, 'without')]);
		arms.with.push(w);
		arms.without.push(wo);
		for (const [arm, r] of [['with', w], ['without', wo]]) {
			const verdicts = r.graders.filter((g) => g.scored)
				.map((g) => `${g.name}:${g.pass ? 'pass' : 'FAIL'}`).join(' ');
			console.error(`  ${arm} run ${i + 1}: ` +
				`${Object.keys(r.files).length} file(s)` +
				`${r.error ? ` [${r.error}]` : ''} ${verdicts}`);
		}
	}
	report.cases.push({ name: c.name, arms });
}

writeFileSync(outPath, JSON.stringify(report, null, 2));
console.error(`eval-run: report written to ${outPath}`);
