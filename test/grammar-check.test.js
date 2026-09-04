import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGrammarPool, normalizeGrammarConfig } from '../scripts/grammar-check.mjs';
import { checkText, createDocumentChecker } from '../scripts/style-check.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const styleScript = join(HERE, '..', 'scripts', 'style-check.mjs');
const proseDir = join(HERE, 'fixtures', 'human-prose');
let grammar;
let documents;

beforeAll(() => {
	grammar = createGrammarPool();
	documents = createDocumentChecker();
});

afterAll(async () => {
	await Promise.all([grammar.dispose(), documents.dispose()]);
});

describe('Harper admission gate', () => {
	it.each([
		['AnA', 'This is a error.', 'a', 'an'],
		['CommaFixes', 'This is wrong , and stays.', ' ', ''],
		['ItsPossessive', "The dog ate it's food.", "it's", 'its'],
		['ModalOf', 'We could of shipped.', 'could of', 'could have'],
		['NounVerbConfusion', 'The affects of the change are clear.', 'affects', 'effects'],
		['PronounVerbAgreement', 'She go home.', 'go', 'goes'],
		['RepeatedWords', 'Run the the job.', 'the the', 'the'],
	])('detects every planted %s positive', async (rule, text, match, replacement) => {
		const flags = await grammar.check(text);
		expect(flags).toEqual([expect.objectContaining({
			category: 'grammar', engine: 'harper', ruleId: `harper/${rule}`,
			match, suggestions: [replacement], hint: `use "${replacement}"`,
		})]);
		expect(text.slice(...flags[0].span)).toBe(match);
		expect(flags[0].suggestions).not.toContain(match);
	});

	it('leaves valid doubles, irregular tense, names, acronyms, and homophones silent', async () => {
		const text = [
			'What she had had was enough. I know that that is true.',
			'Log in in a new tab. The fan turns on on boot.',
			'What it is is a race. Is this this week\'s build? Press a a second time.',
			'He wept. NASA hired Alice McReady.',
			'Their dog is over there. The effect affects the result.',
		].join('\n');
		expect(await grammar.check(text)).toEqual([]);
	});

	it('has zero unlabeled findings on the manually reviewed human-prose corpus', async () => {
		const findings = [];
		for (const name of readdirSync(proseDir).filter((x) => x.endsWith('.md'))) {
			findings.push(...await grammar.check(readFileSync(join(proseDir, name), 'utf8'),
				{ file: name }));
		}
		expect(findings).toEqual([]);
	});
});

describe('combined document checker', () => {
	it('keeps exact UTF-16 spans and line numbers after Unicode', async () => {
		const text = '🚀 Launch.\nShe go home.';
		const flag = (await documents.checkDocument(text)).flags
			.find((f) => f.ruleId === 'harper/PronounVerbAgreement');
		expect(flag).toMatchObject({ match: 'go', span: [15, 17], line: 2,
			suggestions: ['goes'] });
		expect(text.slice(...flag.span)).toBe(flag.match);
	});

	it('runs every Markdown and authorial-prose exemption over Harper findings', async () => {
		const text = [
			'`She go home.` Visit https://example.test/She-go-home.',
			'',
			'```text',
			'Run the the job.',
			'```',
			'',
			'"She go home."',
			'',
			'> She go home.',
			'',
			'“She go home.',
			'',
			'Run the the job.”',
			'',
			'<!-- terse-ignore: grammar -->',
			'She go home.',
		].join('\n');
		expect((await documents.checkDocument(text)).flags
			.filter((f) => f.category === 'grammar')).toEqual([]);
	});

	it('applies project ignores to Harper findings', async () => {
		const result = await documents.checkDocument('She go home.',
			{ ignore: ['grammar:go'] });
		expect(result.flags.filter((f) => f.category === 'grammar')).toEqual([]);
	});

	it('deduplicates overlapping native and Harper fixes in favor of native hints', async () => {
		const flags = (await documents.checkDocument(
			'We could of shipped. Run the the job.')).flags
			.filter((f) => f.category === 'grammar');
		expect(flags).toHaveLength(2);
		expect(flags.map((f) => f.engine)).toEqual([undefined, undefined]);
		expect(flags.map((f) => f.hint)).toEqual(['use "could have"', 'use "the"']);
	});

	it('raises the default deterministic coverage from the 3/16 baseline to 6/16', async () => {
		const prompt = readFileSync(join(HERE, '..',
			'evals', 'grammar-repair', 'prompt.md'), 'utf8');
		const fixture = prompt.match(/BEGIN\n([\s\S]*?)\nEND/)[1];
		expect(checkText(fixture).stats.grammar).toBe(4); // includes the new native quater fix
		expect((await documents.checkDocument(fixture)).stats.grammar).toBe(6);
	});
});

describe('spelling configuration', () => {
	it('defaults broad spelling off', async () => {
		const flags = (await documents.checkDocument('The grammer changed.')).flags;
		expect(flags.filter((f) => f.ruleId === 'harper/SpellCheck')).toEqual([]);
	});

	it('uses non-assertive multi-suggestion hints and a project dictionary', async () => {
		const flags = (await documents.checkDocument(
			'Terse and ProseMirror contain grammer.', { grammar: {
				spelling: true, dialect: 'american', words: [' Terse ', 'ProseMirror', 'Terse'],
			} })).flags.filter((f) => f.ruleId === 'harper/SpellCheck');
		expect(flags).toHaveLength(1);
		expect(flags[0].match).toBe('grammer');
		expect(flags[0].suggestions).toContain('grammar');
		expect(flags[0].suggestions.length).toBeGreaterThan(1);
		expect(flags[0].hint).toMatch(/^check spelling; try /);
	});

	it('selects the requested dialect', async () => {
		const american = await documents.checkDocument('The colour is blue.',
			{ grammar: { spelling: true, dialect: 'american' } });
		const british = await documents.checkDocument('The colour is blue.',
			{ grammar: { spelling: true, dialect: 'british' } });
		expect(american.flags.map((f) => f.match)).toContain('colour');
		expect(british.flags.filter((f) => f.ruleId === 'harper/SpellCheck')).toEqual([]);
	});

	it('trims and deduplicates custom dictionary words', () => {
		expect(normalizeGrammarConfig({ words: [' Terse ', '', 'Terse', ' ProseMirror'] }))
			.toEqual({ spelling: false, dialect: 'american', words: ['Terse', 'ProseMirror'] });
	});

	it.each([
		[null, /grammar must be an object/],
		[[], /grammar must be an object/],
		[{ spelling: true }, /dialect is required/],
		[{ spelling: 'yes', dialect: 'american' }, /spelling must be a boolean/],
		[{ spelling: true, dialect: 'martian' }, /dialect must be/],
		[{ dialect: 'toString' }, /dialect must be/],
		[{ words: 'Terse' }, /words must be an array/],
		[{ words: [42] }, /words must be an array/],
	])('rejects malformed grammar config %#', async (config, message) => {
		await expect(documents.checkDocument('Clean prose.', { grammar: config }))
			.rejects.toThrow(message);
	});
});

describe('executable boundaries', () => {
	it('keeps Harper suggestions in CLI JSON and exits 1 for a finding', () => {
		const dir = mkdtempSync(join(tmpdir(), 'terse-grammar-json-'));
		const file = join(dir, 'doc.md');
		writeFileSync(file, 'She go home.\n');
		const result = spawnSync(process.execPath, [styleScript, file, '--json'],
			{ encoding: 'utf8' });
		expect(result.status).toBe(1);
		const [document] = JSON.parse(result.stdout);
		expect(document.stats.grammar).toBe(1);
		expect(document.flags[0]).toMatchObject({
			engine: 'harper', ruleId: 'harper/PronounVerbAgreement', suggestions: ['goes'],
		});
	});

	it('returns CLI exit 2 for invalid grammar config', () => {
		const dir = mkdtempSync(join(tmpdir(), 'terse-grammar-config-'));
		writeFileSync(join(dir, 'doc.md'), 'Clean prose.\n');
		const terseDir = join(dir, '.terse');
		mkdirSync(terseDir);
		writeFileSync(join(terseDir, 'config.json'), JSON.stringify({ grammar: { spelling: true } }));
		const result = spawnSync(process.execPath, [styleScript, join(dir, 'doc.md')],
			{ encoding: 'utf8' });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('grammar.dialect is required');
	});
});
