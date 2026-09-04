// The always-on hook: reads the PostToolUse payload, checks the file, and
// returns the flags on stderr with exit 2. An Edit reports only the flags
// inside the text it inserted, so a one-line change to a legacy document
// does not replay every old finding.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const script = join(HERE, '..', 'scripts', 'style-hook.mjs');
const hook = (payload, env = { TERSE_HOOK: '1' }) => spawnSync(process.execPath, [script],
	{ encoding: 'utf8', input: JSON.stringify(payload), env: { ...process.env, TERSE_HOOK: '', ...env } });

const dir = mkdtempSync(join(tmpdir(), 'terse-hook-'));
const legacy = join(dir, 'legacy.md');
writeFileSync(legacy, 'We utilize the old path.\n\nThe new line was cleared quickly.\n');

describe('style-hook', () => {
	it('stays silent unless TERSE_HOOK=1', () => {
		const r = hook({ tool_name: 'Write', tool_input: { file_path: legacy } }, { TERSE_HOOK: '' });
		expect(r.status).toBe(0);
		expect(r.stderr).toBe('');
	});

	it('reports every flag on a Write', () => {
		const r = hook({ tool_name: 'Write', tool_input: { file_path: legacy } });
		expect(r.status).toBe(2);
		expect(r.stderr).toContain('[simpler-alternative] "utilize"');
		expect(r.stderr).toContain('[passive-voice]');
	});

	it('reports only the inserted text on an Edit', () => {
		const r = hook({ tool_name: 'Edit', tool_input: { file_path: legacy,
			old_string: 'was cleared', new_string: 'was cleared quickly' } });
		expect(r.status).toBe(2);
		expect(r.stderr).toContain('[adverb] "quickly"');
		expect(r.stderr).not.toContain('utilize');
	});

	it('ignores non-markdown files and missing payloads', () => {
		expect(hook({ tool_name: 'Write', tool_input: { file_path: join(dir, 'a.js') } }).status).toBe(0);
		expect(hook({}).status).toBe(0);
	});

	it('honors the project config', () => {
		const root = mkdtempSync(join(tmpdir(), 'terse-hook-cfg-'));
		mkdirSync(join(root, '.terse'));
		writeFileSync(join(root, '.terse', 'config.json'), JSON.stringify({ ignore: ['simpler-alternative'] }));
		const f = join(root, 'doc.md');
		writeFileSync(f, 'We utilize it.\n');
		expect(hook({ tool_name: 'Write', tool_input: { file_path: f } }).status).toBe(0);
	});

	it('reports nothing for a pure deletion', () => {
		const r = hook({ tool_name: 'Edit', tool_input: { file_path: legacy, old_string: 'old ', new_string: '' } });
		expect(r.status).toBe(0);
	});

	it('reports every occurrence when the inserted text repeats', () => {
		const f = join(dir, 'repeat.md');
		writeFileSync(f, 'We utilize it quickly and the tool.\n\nThe new line was cleared quickly and the tool.\n');
		const r = hook({ tool_name: 'Edit', tool_input: { file_path: f, old_string: '.', new_string: ' quickly and the tool.' } });
		expect(r.status).toBe(2);
		expect(r.stderr.match(/\[adverb\] "quickly"/g)).toHaveLength(2);
		expect(r.stderr).not.toContain('utilize');
	});

	it('filters async Harper findings to the inserted range', () => {
		const f = join(dir, 'grammar-edit.md');
		writeFileSync(f, 'She go home.\n\nWe could of shipped.\n');
		const r = hook({ tool_name: 'Edit', tool_input: { file_path: f,
			old_string: 'walk home', new_string: 'go home' } });
		expect(r.status).toBe(2);
		expect(r.stderr).toContain('[grammar] "go" - use "goes"');
		expect(r.stderr).not.toContain('could of');
	});

	it('caps combined findings at twenty', () => {
		const f = join(dir, 'grammar-cap.md');
		writeFileSync(f, Array.from({ length: 25 }, () => 'She go home.').join('\n'));
		const r = hook({ tool_name: 'Write', tool_input: { file_path: f } });
		expect(r.status).toBe(2);
		expect(r.stderr.match(/\[grammar\]/g)).toHaveLength(20);
		expect(r.stderr).toContain('...and 5 more');
		expect(r.stderr).toContain('terse: 25 flag(s)');
	});

	it('can be imported without running', async () => {
		const mod = await import('../scripts/style-hook.mjs');
		expect(typeof mod.hookReport).toBe('function');
	});
});
