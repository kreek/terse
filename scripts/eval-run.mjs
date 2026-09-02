#!/usr/bin/env node
// Fallback ablation runner for the evals/ suite, for accounts where
// `claude plugin eval` is still early-access gated. Runs each case twice in
// headless sessions (with: --plugin-dir <repo>; without: nothing), applies
// the regex graders, and writes an aggregate report in the shape
// scripts/eval-score.mjs consumes. The stream-json transcript is captured,
// so tool_used graders score; llm graders stay unscored. With
// ANTHROPIC_API_KEY set the sessions
// run --bare. Without it they run on the subscription login, isolated with
// --setting-sources "" (no user, project, or local settings, so no user
// hooks or installed plugins) and --strict-mcp-config. llm and tool_used graders are recorded
// as unscored; the delta table rests on produced files and regex verdicts.
// Usage: node eval-run.mjs [--runs N] [--case name] [--out path.json]
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
		cases.push(loadCase(join(EVALS, entry.name), entry.name));
	}
	return cases;
}

function loadCase(dir, fallbackName) {
	const { meta, body } = parseFrontmatter(readFileSync(join(dir, 'prompt.md'), 'utf8'));
	const graders = [];
	for (const g of readdirSync(join(dir, 'graders'))) {
		const parsed = parseFrontmatter(readFileSync(join(dir, 'graders', g), 'utf8'));
		graders.push({ name: g.replace(/\.md$/, ''), ...parsed.meta });
	}
	return {
		name: meta.name ?? fallbackName,
		tags: (meta.tags ?? '').replace(/[[\]]/g, '').split(',')
			.map((t) => t.trim()).filter(Boolean),
		// the files the graders name; the pipeline's outline and skeleton
		// files sit beside them and are not the deliverable
		deliverables: [...new Set(graders.map((g) =>
			(g.target ?? '').match(/path:\s*([\w.-]+)/)?.[1]).filter(Boolean))],
		runs: Number(meta.runs) || 1,
		maxTurns: Number(meta.max_turns) || 10,
		prompt: body,
		graders,
	};
}

// Grader patterns are written for the eval tool with a YAML double-quoted
// scalar and an inline (?i). Convert to a JS RegExp.
function toRegex(pattern) {
	let p = pattern.replace(/^"|"$/g, '').replace(/\\\\/g, '\\');
	let flags = '';
	if (p.startsWith('(?i)')) { p = p.slice(4); flags = 'i'; }
	return new RegExp(p, flags);
}

function gradeToolUse(g, toolUses) {
	const want = toRegex(g.input_match ?? '""');
	const hits = toolUses.filter((t) => t.name === g.tool &&
		want.test(JSON.stringify(t.input ?? {}))).length;
	return { name: g.name, type: g.type, scored: true, hits,
		pass: hits >= (Number(g.min) || 1) };
}

// The final result event names the failure when stderr does not: an API
// error, a turn cap, a permission denial.
function resultDetail(stdout) {
	for (const line of stdout.split('\n').reverse()) {
		let event;
		try { event = JSON.parse(line); } catch { continue; }
		if (event?.type !== 'result') continue;
		return [event.subtype, event.is_error && event.result].filter(Boolean).join(': ');
	}
	return '';
}

// Tool uses from a --output-format stream-json transcript, one JSON object
// per line; lines that are not JSON are ignored.
function toolUsesOf(stdout) {
	const uses = [];
	for (const line of stdout.split('\n')) {
		let event;
		try { event = JSON.parse(line); } catch { continue; }
		for (const block of event?.message?.content ?? []) {
			if (block.type === 'tool_use') uses.push({ name: block.name, input: block.input });
		}
	}
	return uses;
}

function gradeFiles(graders, files, toolUses) {
	return graders.map((g) => {
		if (g.type === 'tool_used') return gradeToolUse(g, toolUses);
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
	const args = ['-p', c.prompt, ...ISOLATION,
		'--allowedTools', 'Read', 'Write', 'Edit', 'Bash', 'Skill',
		'--max-turns', String(c.maxTurns),
		'--output-format', 'stream-json', '--verbose'];
	if (arm === 'with') args.push('--plugin-dir', REPO);
	const { stdout, stderr, code, killed } = await runClaude(args, dir);
	let error = null;
	if (killed) error = 'timeout';
	else if (code !== 0) {
		const detail = stderr.trim().split('\n').at(-1) || resultDetail(stdout);
		error = `exit ${code}${detail ? `: ${detail.slice(0, 200)}` : ''}`;
	}
	const files = {};
	for (const f of readdirSync(dir)) {
		if (f.endsWith('.md')) files[f] = readFileSync(join(dir, f), 'utf8');
	}
	const toolUses = toolUsesOf(stdout);
	return { dir, files, error, toolUses: toolUses.map((t) => t.name),
		graders: gradeFiles(c.graders, files, toolUses) };
}

// stdin closed, so the CLI never waits on a pipe that will not speak.
function runClaude(args, cwd) {
	return new Promise((resolve) => {
		const child = spawn('claude', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (d) => { stdout += d; });
		child.stderr.on('data', (d) => { stderr += d; });
		const timer = setTimeout(() => child.kill('SIGKILL'), RUN_TIMEOUT_MS);
		child.on('close', (code, signal) => {
			clearTimeout(timer);
			resolve({ stdout, stderr, code, killed: signal === 'SIGKILL' });
		});
	});
}

const KNOWN_FLAGS = new Set(['--runs', '--case', '--out']);
const args = process.argv.slice(2);
const unknown = args.filter((a, i) => a.startsWith('--') && !KNOWN_FLAGS.has(a)
	|| !a.startsWith('--') && !KNOWN_FLAGS.has(args[i - 1]));
if (unknown.length > 0) {
	console.error('usage: node eval-run.mjs [--runs N] [--case name] [--out path.json]');
	process.exit(2);
}
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
// --bare sessions never read OAuth or the keychain, so a subscription login
// falls back to settings isolation instead.
const ISOLATION = process.env.ANTHROPIC_API_KEY
	? ['--bare']
	: ['--setting-sources', '', '--strict-mcp-config'];
console.error(`eval-run: ${process.env.ANTHROPIC_API_KEY
	? '--bare sessions on ANTHROPIC_API_KEY'
	: 'subscription sessions with settings isolated'}`);
mkdirSync(dirname(outPath), { recursive: true });

async function runCase(c, n) {
	console.error(`case ${c.name}: ${n} run(s) per arm`);
	const arms = { with: [], without: [] };
	for (let i = 0; i < n; i++) {
		const [w, wo] = await Promise.all([runOnce(c, 'with'), runOnce(c, 'without')]);
		arms.with.push(w);
		arms.without.push(wo);
		reportRun('with', w, i);
		reportRun('without', wo, i);
	}
	return arms;
}

function reportRun(arm, r, i) {
	const verdicts = r.graders.filter((g) => g.scored)
		.map((g) => `${g.name}:${g.pass ? 'pass' : 'FAIL'}`).join(' ');
	const skills = r.toolUses.filter((t) => t === 'Skill').length;
	console.error(`  ${arm} run ${i + 1}: ${Object.keys(r.files).length} file(s), ` +
		`${skills} skill call(s)${r.error ? ` [${r.error}]` : ''} ${verdicts}`);
}

const report = { schemaVersion: 1, suite: 'terse (fallback runner)', cases: [] };
for (const c of cases) {
	report.cases.push({ name: c.name, tags: c.tags, deliverables: c.deliverables,
		arms: await runCase(c, runs ?? c.runs) });
}

writeFileSync(outPath, JSON.stringify(report, null, 2));
console.error(`eval-run: report written to ${outPath}`);

const producedFiles = report.cases.some((c) =>
	Object.values(c.arms).some((arm) =>
		arm.some((r) => Object.keys(r.files).length > 0)));
if (!producedFiles) {
	console.error('eval-run: every run failed to produce files; ' +
		'check the per-run errors above before trusting this report');
	process.exit(2);
}
