// A project's .terse/config.json is the deterministic half of the voice
// contract: the checker reads it, so the hook and the CLI never raise a
// finding the author already signed off.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkText, loadConfig } from '../scripts/style-check.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const script = join(HERE, '..', 'scripts', 'style-check.mjs');
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

function project(config) {
	const root = mkdtempSync(join(tmpdir(), 'terse-config-'));
	mkdirSync(join(root, '.terse'));
	mkdirSync(join(root, 'docs'));
	writeFileSync(join(root, '.terse', 'config.json'), JSON.stringify(config));
	return root;
}

describe('checkText options the config feeds', () => {
	it('ignores a whole category', () => {
		const { flags } = checkText('Stale entries — every night.', { ignore: ['em-dash'] });
		expect(flags).toEqual([]);
	});

	it('ignores one match within a category', () => {
		const doc = '- **A**: one\n- **B**: two\n- **C**: three\n\nWorth noting: done.';
		const { flags } = checkText(doc, { ignore: ['ai-tell:bold-label bullets'] });
		expect(flags.map((f) => f.match)).toEqual(['worth noting']);
	});

	it('scales the targets from per-thousand-word rates', () => {
		const words = Array.from({ length: 1000 }, () => 'word').join(' ') + '.';
		const { stats } = checkText(words, { targets: { passivePerKword: 30 } });
		expect(stats.passive.target).toBe(30);
		expect(stats.adverbs.target).toBe(8); // the measured 7.5 per thousand
	});
});

describe('loadConfig', () => {
	it('walks up from the file to the nearest .terse/config.json', () => {
		const root = project({ maxGrade: 12, ignore: ['em-dash'] });
		expect(loadConfig(join(root, 'docs', 'deep', 'draft.md')))
			.toEqual({ maxGrade: 12, ignore: ['em-dash'] });
	});

	it('returns an empty config when none exists', () => {
		expect(loadConfig(join(mkdtempSync(join(tmpdir(), 'terse-none-')), 'x.md'))).toEqual({});
	});

	it('fails loudly on malformed JSON', () => {
		const root = mkdtempSync(join(tmpdir(), 'terse-bad-'));
		mkdirSync(join(root, '.terse'));
		writeFileSync(join(root, '.terse', 'config.json'), '{ nope');
		expect(() => loadConfig(join(root, 'x.md'))).toThrow(/config\.json/);
	});
});

describe('CLI honors the config and lets flags override it', () => {
	const root = project({ maxGrade: 50, ignore: ['em-dash'], impersonal: true });
	const f = join(root, 'docs', 'draft.md');
	writeFileSync(f, 'We ship it — you will see.\n');

	it('applies the ignore list and impersonal from config', () => {
		const r = run(f);
		expect(r.stdout).not.toContain('[em-dash]');
		expect(r.stdout).toContain('[personal-pronoun]');
	});

	it('lets --max-grade override the config', () => {
		const dense = join(root, 'docs', 'dense.md');
		writeFileSync(dense, 'Multifaceted organizational transformation necessitates comprehensive stakeholder alignment procedures. Transformative institutional methodologies precipitate unprecedented developmental paradigm restructuring.\n');
		expect(run(dense).stdout).not.toContain('[document-grade]');
		expect(run(dense, '--max-grade', '10').stdout).toContain('[document-grade]');
	});

	it('exits 2 on a malformed config', () => {
		const bad = mkdtempSync(join(tmpdir(), 'terse-badcli-'));
		mkdirSync(join(bad, '.terse'));
		writeFileSync(join(bad, '.terse', 'config.json'), '{');
		const doc = join(bad, 'x.md');
		writeFileSync(doc, 'Fine.\n');
		expect(run(doc).status).toBe(2);
	});
});
