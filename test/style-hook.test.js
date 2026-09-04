// Exercises the always-on PostToolUse process boundary for Claude and Codex.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join(import.meta.dirname, '..', 'scripts', 'style-hook.mjs');
const dirs = [];

function workspace(prefix = 'terse-hook-') {
	const dir = mkdtempSync(join(tmpdir(), prefix));
	dirs.push(dir);
	return dir;
}

function run(payload, cwd) {
	return spawnSync(process.execPath, [SCRIPT], {
		cwd,
		encoding: 'utf8',
		input: typeof payload === 'string' ? payload : JSON.stringify(payload),
		env: { ...process.env, TERSE_HOOK: '' },
	});
}

afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('style-hook', () => {
	it('reports every flag on a Claude Write without an opt-in variable', () => {
		const dir = workspace();
		const file = join(dir, 'legacy.md');
		writeFileSync(file, 'We utilize the old path.\n\nThe new line was cleared quickly.\n');
		const result = run({ tool_name: 'Write', tool_input: { file_path: file } });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('[simpler-alternative] "utilize"');
		expect(result.stderr).toContain('[passive-voice]');
	});

	it('reports only the inserted text on a Claude Edit', () => {
		const dir = workspace();
		const file = join(dir, 'legacy.md');
		writeFileSync(file, 'We utilize the old path.\n\nThe new line was cleared quickly.\n');
		const result = run({ tool_name: 'Edit', tool_input: { file_path: file,
			old_string: 'was cleared', new_string: 'was cleared quickly' } });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('[adverb] "quickly"');
		expect(result.stderr).not.toContain('utilize');
	});

	it.each([
		['malformed JSON', '{not json'],
		['missing input', {}],
		['non-Markdown path', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.js' } }],
	])('silently ignores %s', (_name, payload) => {
		const result = run(payload);
		expect(result.status).toBe(0);
		expect(result.stderr).toBe('');
	});

	it('honors the project config', () => {
		const root = workspace('terse-hook-cfg-');
		mkdirSync(join(root, '.terse'));
		writeFileSync(join(root, '.terse', 'config.json'), JSON.stringify({ ignore: ['simpler-alternative'] }));
		const file = join(root, 'doc.md');
		writeFileSync(file, 'We utilize it.\n');
		expect(run({ tool_name: 'Write', tool_input: { file_path: file } }).status).toBe(0);
	});

	it('reports nothing for a pure Claude deletion', () => {
		const dir = workspace();
		const file = join(dir, 'legacy.md');
		writeFileSync(file, 'We utilize the old path.\n');
		const result = run({ tool_name: 'Edit', tool_input: { file_path: file,
			old_string: 'old ', new_string: '' } });
		expect(result.status).toBe(0);
	});

	it('reports every occurrence when inserted text repeats', () => {
		const dir = workspace();
		const file = join(dir, 'repeat.md');
		writeFileSync(file, 'We utilize it quickly and the tool.\n\nThe new line was cleared quickly and the tool.\n');
		const result = run({ tool_name: 'Edit', tool_input: { file_path: file,
			old_string: '.', new_string: ' quickly and the tool.' } });
		expect(result.status).toBe(2);
		expect(result.stderr.match(/\[adverb\] "quickly"/g)).toHaveLength(2);
		expect(result.stderr).not.toContain('utilize');
	});

	it('filters async Harper findings to the inserted range', () => {
		const dir = workspace();
		const file = join(dir, 'grammar-edit.md');
		writeFileSync(file, 'She go home.\n\nWe could of shipped.\n');
		const result = run({ tool_name: 'Edit', tool_input: { file_path: file,
			old_string: 'walk home', new_string: 'go home' } });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('[grammar] "go" - use "goes"');
		expect(result.stderr).not.toContain('could of');
	});

	it('reports only added prose from a Codex apply_patch update', () => {
		const root = workspace('terse-hook-codex-');
		mkdirSync(join(root, 'docs'));
		writeFileSync(join(root, 'docs', 'notes.md'),
			'We utilize the old path.\n\nThe new line was cleared quickly.\n');
		const command = [
			'*** Begin Patch',
			'*** Update File: docs/notes.md',
			'@@',
			'-The new line was cleared.',
			'+The new line was cleared quickly.',
			'*** End Patch',
		].join('\n');
		const result = run({ tool_name: 'apply_patch', cwd: root, tool_input: { command } }, root);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('[adverb] "quickly"');
		expect(result.stderr).not.toContain('utilize');
		expect(result.stderr).toContain('in docs/notes.md');
	});

	it('checks every Markdown file added by one Codex patch', () => {
		const root = workspace('terse-hook-codex-multi-');
		writeFileSync(join(root, 'one.md'), 'We utilize it.\n');
		writeFileSync(join(root, 'two.markdown'), 'It was cleared quickly.\n');
		const command = [
			'*** Begin Patch',
			'*** Add File: one.md',
			'+We utilize it.',
			'*** Add File: two.markdown',
			'+It was cleared quickly.',
			'*** End Patch',
		].join('\n');
		const result = run({ tool_name: 'apply_patch', cwd: root, tool_input: { command } }, root);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('[simpler-alternative] "utilize"');
		expect(result.stderr).toContain('[adverb] "quickly"');
		expect(result.stderr).toContain('in one.md');
		expect(result.stderr).toContain('in two.markdown');
	});

	it('stays silent for a Codex patch that only deletes prose', () => {
		const root = workspace('terse-hook-codex-delete-');
		writeFileSync(join(root, 'notes.md'), 'Clean prose remains.\n');
		const command = [
			'*** Begin Patch',
			'*** Update File: notes.md',
			'@@',
			'-We utilize it.',
			'*** End Patch',
		].join('\n');
		const result = run({ tool_name: 'apply_patch', cwd: root, tool_input: { command } }, root);
		expect(result.status).toBe(0);
		expect(result.stderr).toBe('');
	});

	it('checks the destination of a moved Codex file', () => {
		const root = workspace('terse-hook-codex-move-');
		writeFileSync(join(root, 'new.md'), 'We utilize the cache.\n');
		const command = [
			'*** Begin Patch',
			'*** Update File: old.md',
			'*** Move to: new.md',
			'+We utilize the cache.',
			'*** End Patch',
		].join('\n');
		const result = run({ tool_name: 'apply_patch', cwd: root, tool_input: { command } }, root);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('new.md:1');
	});

	it('caps combined findings at twenty', () => {
		const dir = workspace();
		const file = join(dir, 'grammar-cap.md');
		writeFileSync(file, Array.from({ length: 25 }, () => 'She go home.').join('\n'));
		const result = run({ tool_name: 'Write', tool_input: { file_path: file } });
		expect(result.status).toBe(2);
		expect(result.stderr.match(/\[grammar\]/g)).toHaveLength(20);
		expect(result.stderr).toContain('...and 5 more');
		expect(result.stderr).toContain('terse: 25 flag(s)');
	});

	it('can be imported without running', async () => {
		const mod = await import('../scripts/style-hook.mjs');
		expect(typeof mod.hookReport).toBe('function');
	});
});
