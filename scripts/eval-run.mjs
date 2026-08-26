#!/usr/bin/env node
// Runs the eval suite through Claude or Codex, ablates only Terse, applies
// deterministic graders, and writes the report consumed by eval-score.mjs.
// Usage: node eval-run.mjs [--provider claude|codex] [--runs N]
//   [--case name | --tag tag] [--out path.json]
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
	readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync,
	existsSync, symlinkSync, rmSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEvalConfig } from './eval-config.mjs';
import { gradeRegexGraders, loadGraders, parseFrontmatter }
	from './eval-graders.mjs';

const execFileP = promisify(execFile);
const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const EVALS = join(REPO, 'evals');
const RUN_TIMEOUT_MS = 10 * 60 * 1000;
const CODEX_BIN = process.env.CODEX_BIN ?? 'codex';
const USAGE = 'usage: node eval-run.mjs [--provider claude|codex] [--runs N] ' +
	'[--case name | --tag tag] [--out path.json]';

function execFileWithInput(command, args, options, input) {
	return new Promise((resolve, reject) => {
		const child = execFile(command, args, options, (error, stdout, stderr) => {
			if (error) {
				error.stdout = stdout;
				error.stderr = stderr;
				reject(error);
				return;
			}
			resolve({ stdout, stderr });
		});
		child.stdin.end(input);
	});
}

function loadCase(dir, fallbackName) {
	const { meta, body } = parseFrontmatter(readFileSync(join(dir, 'prompt.md'), 'utf8'));
	const graders = loadGraders(join(dir, 'graders'));
	return {
		name: meta.name ?? fallbackName,
		tags: (meta.tags ?? '').replace(/[[\]]/g, '').split(',')
			.map((tag) => tag.trim()).filter(Boolean),
		runs: Number(meta.runs) || 1,
		maxTurns: Number(meta.max_turns) || 10,
		prompt: body,
		graders,
	};
}

function loadCases(caseFilter, tagFilter) {
	const cases = [];
	for (const entry of readdirSync(EVALS, { withFileTypes: true })) {
		if (!entry.isDirectory() || entry.name === 'results') continue;
		if (caseFilter && entry.name !== caseFilter) continue;
		const loaded = loadCase(join(EVALS, entry.name), entry.name);
		if (!tagFilter || loaded.tags.includes(tagFilter)) cases.push(loaded);
	}
	return cases;
}

function codexSkillActivated(transcript) {
	return /codex\.skill\.injected[^\n]*terse:/.test(transcript) ||
		/plugins[\\/]cache[\\/]terse[\\/]terse[\\/][^\\/\s]+[\\/]skills[\\/](?:write|outline|draft|edit|style|brainstorm)[\\/]SKILL\.md/.test(transcript);
}

function gradeRun(graders, files, transcript, provider) {
	const regexGrades = new Map(gradeRegexGraders(graders, files)
		.map((grader) => [grader.name, grader]));
	return graders.map((grader) => {
		if (grader.type === 'tool_used') {
			if (provider !== 'codex') {
				return { name: grader.name, type: grader.type, scored: false };
			}
			const pass = codexSkillActivated(transcript);
			return { name: grader.name, type: grader.type, scored: true, pass,
				note: 'Codex skill injection or installed Terse SKILL.md access' };
		}
		if (grader.type === 'regex') return regexGrades.get(grader.name);
		return { name: grader.name, type: grader.type, scored: false };
	});
}

function readMarkdownFiles(dir) {
	const files = {};
	for (const file of readdirSync(dir)) {
		if (file.endsWith('.md')) files[file] = readFileSync(join(dir, file), 'utf8');
	}
	return files;
}

function claudeInvocation(c, arm) {
	const args = ['-p', c.prompt, '--bare', '--allowedTools', 'Read', 'Write', 'Edit',
		'--max-turns', String(c.maxTurns)];
	if (arm === 'with') args.push('--plugin-dir', REPO);
	return { command: 'claude', args, input: undefined };
}

function isolatedCodexHome(enabled) {
	const source = process.env.CODEX_HOME ?? join(homedir(), '.codex');
	const config = readFileSync(join(source, 'config.toml'), 'utf8');
	const isolatedConfig = buildEvalConfig(config, enabled);
	const target = mkdtempSync(join(tmpdir(), 'terse-codex-home-'));
	try {
		for (const entry of ['auth.json', 'models_cache.json', 'plugins']) {
			const sourcePath = join(source, entry);
			if (existsSync(sourcePath)) symlinkSync(sourcePath, join(target, entry));
		}
		writeFileSync(join(target, 'config.toml'), isolatedConfig);
		return target;
	} catch (error) {
		rmSync(target, { recursive: true, force: true });
		throw error;
	}
}

function codexInvocation(c, arm, dir) {
	const enabled = arm === 'with';
	const home = isolatedCodexHome(enabled);
	return {
		command: CODEX_BIN,
		args: ['exec', '--ephemeral', '--ignore-rules', '--json',
			'-s', 'workspace-write', '--skip-git-repo-check', '-C', dir,
			'-c', `plugins."terse@terse".enabled=${String(enabled)}`, '-'],
		input: c.prompt,
		env: { CODEX_HOME: home },
		cleanup: () => rmSync(home, { recursive: true, force: true }),
	};
}

async function runOnce(c, arm, provider) {
	const dir = mkdtempSync(join(tmpdir(), `terse-eval-${c.name}-${arm}-`));
	let invocation;
	try {
		invocation = provider === 'codex'
			? codexInvocation(c, arm, dir) : claudeInvocation(c, arm);
	} catch (err) {
		const error = `setup: ${err.message}`;
		return { dir, files: {}, error, graders: gradeRun(c.graders, {}, '', provider),
			transcript: '' };
	}
	let error = null;
	let transcript = '';
	try {
		const result = await execFileWithInput(invocation.command, invocation.args, {
			cwd: dir, timeout: RUN_TIMEOUT_MS,
			maxBuffer: 16 * 1024 * 1024,
			env: { ...process.env, ...invocation.env },
		}, invocation.input);
		transcript = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
	} catch (err) {
		transcript = `${err.stdout ?? ''}\n${err.stderr ?? ''}`;
		const detail = transcript.trim().split('\n').at(-1) ?? '';
		error = err.killed ? 'timeout'
			: `exit ${err.code}${detail ? `: ${detail.slice(0, 200)}` : ''}`;
	} finally {
		invocation.cleanup?.();
	}
	const files = readMarkdownFiles(dir);
	return { dir, files, error, graders: gradeRun(c.graders, files, transcript, provider),
		transcript };
}

function parseArgs(args) {
	const allowed = new Set(['--provider', '--runs', '--case', '--tag', '--out']);
	const values = {};
	for (let i = 0; i < args.length; i += 2) {
		if (!allowed.has(args[i]) || args[i + 1] === undefined) return null;
		values[args[i]] = args[i + 1];
	}
	if (values['--case'] && values['--tag']) return null;
	return values;
}

function configuredCodexModel() {
	try {
		const root = process.env.CODEX_HOME ?? join(homedir(), '.codex');
		const config = readFileSync(join(root, 'config.toml'), 'utf8');
		return config.match(/^model\s*=\s*["']([^"']+)["']/m)?.[1] ?? null;
	} catch {
		return null;
	}
}

async function commandOutput(command, args) {
	const result = await execFileP(command, args, { maxBuffer: 4 * 1024 * 1024 });
	return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
}

async function preflight(provider) {
	if (provider === 'claude') {
		if (!process.env.ANTHROPIC_API_KEY) {
			throw new Error('Claude --bare sessions require ANTHROPIC_API_KEY. ' +
				'Export a key, or run `claude plugin eval` instead.');
		}
		return { cliVersion: await commandOutput('claude', ['--version']), model: null };
	}
	const login = await commandOutput(CODEX_BIN, ['login', 'status']);
	if (!/logged in/i.test(login)) {
		throw new Error('Codex is not authenticated. Run `codex login`, then retry.');
	}
	const plugins = await commandOutput(CODEX_BIN, ['plugin', 'list']);
	if (!/\bterse@terse\b/.test(plugins)) {
		throw new Error('Terse is not installed from the terse marketplace. Run ' +
			'`codex plugin marketplace add <repo>` and `codex plugin add terse@terse`.');
	}
	return {
		cliVersion: await commandOutput(CODEX_BIN, ['--version']),
		model: configuredCodexModel(),
	};
}

function reportRun(arm, run, index) {
	const verdicts = run.graders.filter((grader) => grader.scored)
		.map((grader) => `${grader.name}:${grader.pass ? 'pass' : 'FAIL'}`).join(' ');
	console.error(`  ${arm} run ${index + 1}: ${Object.keys(run.files).length} file(s)` +
		`${run.error ? ` [${run.error}]` : ''} ${verdicts}`);
}

async function runCase(c, count, provider) {
	console.error(`case ${c.name}: ${count} run(s) per arm`);
	const arms = { with: [], without: [] };
	for (let i = 0; i < count; i++) {
		const [withPlugin, withoutPlugin] = await Promise.all([
			runOnce(c, 'with', provider), runOnce(c, 'without', provider),
		]);
		arms.with.push(withPlugin);
		arms.without.push(withoutPlugin);
		reportRun('with', withPlugin, i);
		reportRun('without', withoutPlugin, i);
	}
	return arms;
}

const values = parseArgs(process.argv.slice(2));
if (!values) {
	console.error(USAGE);
	process.exit(2);
}

const provider = values['--provider'] ?? 'claude';
if (!['claude', 'codex'].includes(provider)) {
	console.error(USAGE);
	process.exit(2);
}
const requestedRuns = Number(values['--runs']) || null;
const outPath = values['--out'] ?? join(EVALS, 'results', 'latest.json');
const cases = loadCases(values['--case'] ?? null, values['--tag'] ?? null);
if (cases.length === 0) {
	console.error('eval-run: no cases matched');
	process.exit(2);
}

let environment;
try {
	environment = await preflight(provider);
} catch (error) {
	console.error(`eval-run: ${error.message}`);
	process.exit(2);
}
mkdirSync(dirname(outPath), { recursive: true });

const report = {
	schemaVersion: 1,
	suite: `terse (${provider} runner)`,
	provider,
	date: new Date().toISOString().slice(0, 10),
	model: environment.model,
	cliVersion: environment.cliVersion,
	cases: [],
};
for (const c of cases) {
	report.cases.push({ name: c.name, tags: c.tags,
		arms: await runCase(c, requestedRuns ?? c.runs, provider) });
}

writeFileSync(outPath, JSON.stringify(report, null, 2));
console.error(`eval-run: report written to ${outPath}`);

const producedFiles = report.cases.some((c) =>
	Object.values(c.arms).some((arm) =>
		arm.some((run) => Object.keys(run.files).length > 0)));
if (!producedFiles) {
	console.error('eval-run: every run failed to produce files; check the errors above');
	process.exit(2);
}
