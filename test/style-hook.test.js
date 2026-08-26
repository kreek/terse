// Exercises the PostToolUse process boundary for Claude and Codex payloads.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const SCRIPT = join(import.meta.dirname, '..', 'scripts', 'style-hook.mjs');
const dirs = [];

function workspace() {
	const dir = mkdtempSync(join(tmpdir(), 'terse-hook-'));
	dirs.push(dir);
	return dir;
}

function run(payload, env = {}) {
	return spawnSync(process.execPath, [SCRIPT], {
		input: typeof payload === 'string' ? payload : JSON.stringify(payload),
		encoding: 'utf8',
		env: { ...process.env, TERSE_HOOK: '1', ...env },
	});
}

afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('style hook', () => {
	it('checks a Claude file_path payload', () => {
		const dir = workspace();
		const file = join(dir, 'draft.md');
		writeFileSync(file, 'We utilize the cache.');
		const result = run({ tool_input: { file_path: file } });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('[simpler-alternative]');
		expect(result.stderr).toContain('1 file(s)');
	});

	it('checks one Codex apply_patch path relative to cwd', () => {
		const dir = workspace();
		writeFileSync(join(dir, 'notes.md'), 'Worth noting: the cache is shared.');
		const result = run({ cwd: dir, tool_input: {
			command: '*** Begin Patch\n*** Update File: notes.md\n*** End Patch',
		} });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('[ai-tell]');
	});

	it('deduplicates and aggregates multiple patched Markdown files', () => {
		const dir = workspace();
		writeFileSync(join(dir, 'one.md'), 'We utilize the cache.');
		writeFileSync(join(dir, 'two.markdown'), 'The cache was cleared.');
		const command = [
			'*** Begin Patch',
			'*** Update File: one.md',
			'*** Update File: one.md',
			'*** Add File: two.markdown',
			'*** End Patch',
		].join('\n');
		const result = run({ cwd: dir, tool_input: { command } });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('2 file(s)');
		expect(result.stderr.match(/one\.md:/g)).toHaveLength(1);
	});

	it('checks the destination of a moved file', () => {
		const dir = workspace();
		writeFileSync(join(dir, 'new.md'), 'We utilize the cache.');
		const command = [
			'*** Begin Patch',
			'*** Update File: old.md',
			'*** Move to: new.md',
			'*** End Patch',
		].join('\n');
		const result = run({ cwd: dir, tool_input: { command } });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('new.md:1');
		expect(result.stderr).toContain('1 file(s)');
	});

	it.each([
		['malformed JSON', '{not json'],
		['missing input', {}],
		['non-Markdown patch', { cwd: '/tmp', tool_input: {
			command: '*** Add File: notes.txt',
		} }],
	])('silently ignores %s', (_name, payload) => {
		const result = run(payload);
		expect(result.status).toBe(0);
		expect(result.stderr).toBe('');
	});

	it('stays silent while the hook is disabled', () => {
		const result = run('{not json', { TERSE_HOOK: '0' });
		expect(result.status).toBe(0);
		expect(result.stderr).toBe('');
	});

	it('caps detailed findings at twenty and reports the aggregate', () => {
		const dir = workspace();
		const file = join(dir, 'many.md');
		writeFileSync(file, Array.from({ length: 25 }, () => 'Maybe we utilize it.').join('\n\n'));
		const result = run({ tool_input: { file_path: file } });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('...and 30 more');
		expect(result.stderr).toContain('terse: 50 flag(s) in 1 file(s)');
	});
});
