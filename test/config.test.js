// .terse/config.json is the deterministic half of the voice contract: the
// checker reads the personal one in ~/.terse and the nearest project one
// layered over it, so the hook and the CLI never raise a finding the author
// already signed off.
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

// A home folder whose ~/.terse/config.json holds a personal voice.
function home(config) {
	const root = mkdtempSync(join(tmpdir(), 'terse-home-'));
	mkdirSync(join(root, '.terse'));
	writeFileSync(join(root, '.terse', 'config.json'),
		typeof config === 'string' ? config : JSON.stringify(config));
	return root;
}

const outside = () => join(mkdtempSync(join(tmpdir(), 'terse-none-')), 'x.md');

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

describe('loadConfig layers the personal config under the project one', () => {
	it('applies the personal config where no project config exists', () => {
		const personal = home({ ignore: ['em-dash'], maxGrade: 12 });
		expect(loadConfig(outside(), personal)).toEqual({ ignore: ['em-dash'], maxGrade: 12 });
	});

	it('treats nothing above the home folder as a project', () => {
		const above = project({ maxGrade: 20, ignore: ['aside'] });
		const personal = join(above, 'home');
		mkdirSync(join(personal, '.terse'), { recursive: true });
		writeFileSync(join(personal, '.terse', 'config.json'), JSON.stringify({ maxGrade: 12 }));
		expect(loadConfig(join(personal, 'notes', 'x.md'), personal)).toEqual({ maxGrade: 12 });
	});

	it('lets project keys override personal ones', () => {
		const personal = home({ maxGrade: 12, impersonal: false });
		const root = project({ maxGrade: 9 });
		expect(loadConfig(join(root, 'docs', 'x.md'), personal))
			.toEqual({ maxGrade: 9, impersonal: false });
	});

	it('combines the two ignore lists', () => {
		const personal = home({ ignore: ['em-dash', 'aside'] });
		const root = project({ ignore: ['aside', 'qualifier'] });
		expect(loadConfig(join(root, 'docs', 'x.md'), personal).ignore)
			.toEqual(['em-dash', 'aside', 'qualifier']);
	});

	it('merges targets rate by rate, the project winning a shared rate', () => {
		const personal = home({ targets: { passivePerKword: 11, adverbsPerKword: 9 } });
		const root = project({ targets: { adverbsPerKword: 4 } });
		expect(loadConfig(join(root, 'docs', 'x.md'), personal).targets)
			.toEqual({ passivePerKword: 11, adverbsPerKword: 4 });
	});

	it('takes the project grammar settings whole', () => {
		const personal = home({ grammar: { spelling: true, dialect: 'british', words: ['colour'] } });
		const root = project({ grammar: { words: ['Terse'] } });
		expect(loadConfig(join(root, 'docs', 'x.md'), personal).grammar)
			.toEqual({ words: ['Terse'] });
	});

	it('lets a project opt out of the personal config with personal: false', () => {
		const personal = home({ ignore: ['em-dash'], maxGrade: 12 });
		const root = project({ personal: false, ignore: ['aside'] });
		expect(loadConfig(join(root, 'docs', 'x.md'), personal))
			.toEqual({ personal: false, ignore: ['aside'] });
	});

	it('rejects a personal key that is not a boolean', () => {
		const root = project({ personal: 'no' });
		expect(() => loadConfig(join(root, 'docs', 'x.md'), null))
			.toThrow(/personal must be true or false/);
	});

	it('reads the project config alone when there is no home folder', () => {
		const root = project({ maxGrade: 9 });
		expect(loadConfig(join(root, 'docs', 'x.md'), null)).toEqual({ maxGrade: 9 });
	});

	it('fails loudly on a malformed personal config', () => {
		expect(() => loadConfig(outside(), home('{ nope'))).toThrow(/\.terse[\\/]config\.json/);
	});

	it('rejects a config that is not a JSON object', () => {
		expect(() => loadConfig(outside(), home('["em-dash"]'))).toThrow(/must be a JSON object/);
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
	}, 15_000);

	it('applies the personal config from the home folder', () => {
		const personal = home({ ignore: ['em-dash'] });
		const doc = outside();
		writeFileSync(doc, 'We ship it — you will see.\n');
		const env = { ...process.env, HOME: personal, USERPROFILE: personal };
		const r = spawnSync(process.execPath, [script, doc], { encoding: 'utf8', env });
		expect(run(doc).stdout).toContain('[em-dash]');
		expect(r.stdout).not.toContain('[em-dash]');
	}, 15_000);

	it('exits 2 on a malformed config', () => {
		const bad = mkdtempSync(join(tmpdir(), 'terse-badcli-'));
		mkdirSync(join(bad, '.terse'));
		writeFileSync(join(bad, '.terse', 'config.json'), '{');
		const doc = join(bad, 'x.md');
		writeFileSync(doc, 'Fine.\n');
		expect(run(doc).status).toBe(2);
	});
});
