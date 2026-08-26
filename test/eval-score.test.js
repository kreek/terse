// Exercises the eval scorer at its command-line acceptance boundary.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT = join(import.meta.dirname, '..', 'scripts', 'eval-score.mjs');
const dirs = [];

function styleCase(name, withText, withoutText) {
	return { name, tags: ['ai-tells'], arms: {
		with: [{ files: { [`${name}.md`]: withText }, graders: [] }],
		without: [{ files: { [`${name}.md`]: withoutText }, graders: [] }],
	} };
}

function score(cases) {
	const dir = mkdtempSync(join(tmpdir(), 'terse-score-'));
	dirs.push(dir);
	const report = join(dir, 'report.json');
	writeFileSync(report, JSON.stringify({ cases }));
	return spawnSync(process.execPath, [SCRIPT, report], { encoding: 'utf8' });
}

afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('eval score acceptance', () => {
	it('accepts a clean tie in a one-case smoke run', () => {
		const result = score([styleCase('smoke', 'Plain sentence.', 'Plain sentence.')]);
		expect(result.status).toBe(0);
		expect(result.stdout).toContain('acceptance passed (clean tie)');
	});

	it('requires one real improvement in a multi-case suite', () => {
		const clean = styleCase('clean', 'Plain sentence.', 'Plain sentence.');
		const result = score([clean, styleCase('also-clean', 'Clear text.', 'Clear text.')]);
		expect(result.status).toBe(1);
		expect(result.stdout).toContain('no style case improved');
	});

	it('accepts a full suite with one clean tie and one improvement', () => {
		const clean = styleCase('clean', 'Plain sentence.', 'Plain sentence.');
		const improved = styleCase('improved', 'Use the cache.', 'We utilize the cache.');
		expect(score([clean, improved]).status).toBe(0);
	});

	it('rejects an equal non-clean pair', () => {
		const text = 'We utilize the cache.';
		const result = score([styleCase('same-flags', text, text)]);
		expect(result.status).toBe(1);
		expect(result.stdout).toContain('not below');
	});

	it('requires output from both A/B arms', () => {
		const missing = styleCase('missing-arm', 'Plain sentence.', '');
		missing.arms.without[0].files = {};
		const result = score([missing]);
		expect(result.status).toBe(1);
		expect(result.stdout).toContain('both A/B arms');
	});

	it('reapplies current regex graders to a saved report', () => {
		const text = [
			'Logsift reads stdin and files.',
			'Use --level, --since, --until, --where, --format, and --config.',
			'Defaults live in ~/.logsift.toml.',
			'Install with brew install logsift or a release binary.',
			'Exit `0` means a match, `1` without a match, and `2` a usage or read error.',
			'MIT.',
		].join(' ');
		const saved = styleCase('generation-readme', text, text);
		for (const arm of ['with', 'without']) {
			saved.arms[arm][0].files = { 'README.md': text };
			saved.arms[arm][0].graders = [{ name: 'facts-present', type: 'regex',
				scored: true, pass: false }];
		}
		const result = score([saved]);
		expect(result.status).toBe(0);
		expect(result.stdout).not.toContain('facts-present failed');
	});
});
