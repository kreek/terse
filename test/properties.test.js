// Property and contract tests. Example tests verify the mechanism where it
// was aimed; these verify where it was never aimed: conservation of input,
// the CLI's exit-code contract, and metamorphic relations that cosmetic
// changes must respect.
import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkText, splitSentences, stripMarkdown } from '../scripts/style-check.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));

// Deterministic PRNG so failures reproduce; the seed is printed on failure.
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a |= 0; a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const WORDS = [
	'the', 'cache', 'deletes', 'stale', 'entries', 'report', 'team', 'ships',
	'small', 'tools', 'fast', 'don’t', 'can’t', "isn't", 'café',
	'naïve', 'well-known', '1945', '30ms', 'Mr.', 'e.g.', 'schön', 'très',
	'draft', 'first', 'second', 'checker', 'flags', 'prose', 'writers',
];
const TERMINATORS = ['.', '!', '?', '...', '.'];

function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }

function genSentence(rnd) {
	const n = 1 + Math.floor(rnd() * 18);
	const words = Array.from({ length: n }, () => pick(rnd, WORDS));
	return words.join(' ') + pick(rnd, TERMINATORS);
}

function genParagraph(rnd) {
	return Array.from({ length: 1 + Math.floor(rnd() * 4) },
		() => genSentence(rnd)).join(' ');
}

function genMarkdownDoc(rnd) {
	const blocks = [];
	const n = 1 + Math.floor(rnd() * 6);
	for (let i = 0; i < n; i++) {
		const r = rnd();
		if (r < 0.15) blocks.push(`# ${pick(rnd, WORDS)} ${pick(rnd, WORDS)}`);
		else if (r < 0.25) blocks.push('```\nutilize was quickly (not prose)\n```');
		else if (r < 0.35) blocks.push(`- ${genSentence(rnd)}\n- ${genSentence(rnd)}`);
		else if (r < 0.45) blocks.push(`| a | b |\n|---|---|\n| ${pick(rnd, WORDS)} | x |`);
		else if (r < 0.55) blocks.push(`See [${pick(rnd, WORDS)}](https://x.test/a_(b)) now.`);
		else blocks.push(genParagraph(rnd));
	}
	return blocks.join('\n\n');
}

function naiveWordCount(text) {
	return text.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

describe('conservation properties', () => {
	it('word count equals a naive independent count on plain prose', () => {
		for (let seed = 1; seed <= 200; seed++) {
			const rnd = mulberry32(seed);
			const doc = Array.from({ length: 1 + Math.floor(rnd() * 4) },
				() => genParagraph(rnd)).join('\n\n');
			const { stats } = checkText(doc);
			expect(stats.words, `seed ${seed}: ${JSON.stringify(doc)}`)
				.toBe(naiveWordCount(doc));
		}
	});

	it('sentences partition the stripped text: every non-whitespace char in exactly one span', () => {
		for (let seed = 1; seed <= 100; seed++) {
			const doc = genMarkdownDoc(mulberry32(seed));
			const stripped = stripMarkdown(doc);
			const sentences = splitSentences(stripped);
			let prevEnd = 0;
			const covered = new Array(stripped.length).fill(false);
			for (const s of sentences) {
				expect(s.offset, `seed ${seed}: overlapping or out-of-order span`)
					.toBeGreaterThanOrEqual(prevEnd);
				expect(stripped.slice(s.offset, s.offset + s.text.length),
					`seed ${seed}: span text does not match its offset`).toBe(s.text);
				for (let i = s.offset; i < s.offset + s.text.length; i++) covered[i] = true;
				prevEnd = s.offset + s.text.length;
			}
			for (let i = 0; i < stripped.length; i++) {
				if (!/\s/.test(stripped[i])) {
					expect(covered[i],
						`seed ${seed}: dropped char ${JSON.stringify(stripped[i])} at ${i}`).toBe(true);
				}
			}
		}
	});

	it('stripping never changes length or line structure', () => {
		for (let seed = 1; seed <= 100; seed++) {
			const doc = genMarkdownDoc(mulberry32(seed));
			const stripped = stripMarkdown(doc);
			expect(stripped.length).toBe(doc.length);
			expect(stripped.split('\n').length).toBe(doc.split('\n').length);
		}
	});
});

describe('metamorphic relations', () => {
	const shape = (flags) => flags.map((f) => `${f.category}:${f.match}`);

	it('curly and ASCII apostrophes produce identical flags', () => {
		const texts = [
			'It’s important to note that the cache was cleared quickly.',
			'Maybe the team can’t utilize the report, and it’s quite long, I think.',
			'The plan wasn’t reviewed, e.g. the draft isn’t done.',
		];
		// match quotes the source verbatim, so compare modulo the substitution
		const norm = (flags) => shape(flags).map((s) => s.replace(/’/g, "'"));
		for (const curly of texts) {
			const ascii = curly.replace(/’/g, "'");
			expect(norm(checkText(ascii).flags)).toEqual(norm(checkText(curly).flags));
			expect(checkText(ascii).flags.map((f) => f.line))
				.toEqual(checkText(curly).flags.map((f) => f.line));
		}
	});

	it('prepending a paragraph shifts every line by its line count and changes nothing else', () => {
		for (let seed = 1; seed <= 50; seed++) {
			const doc = genMarkdownDoc(mulberry32(seed)) +
				'\n\nThe report was reviewed quickly, and maybe the team should utilize it.';
			const prefix = 'The team ships small tools.\nThe cache holds ten entries.\n\n';
			const shift = (prefix.match(/\n/g) || []).length;
			const base = checkText(doc).flags;
			const shifted = checkText(prefix + doc).flags;
			expect(shape(shifted), `seed ${seed}`).toEqual(shape(base));
			expect(shifted.map((f) => f.line), `seed ${seed}`)
				.toEqual(base.map((f) => f.line + shift));
		}
	});

	it('wrapping in cosmetic markdown does not change flags on the prose', () => {
		for (let seed = 1; seed <= 50; seed++) {
			const doc = genMarkdownDoc(mulberry32(seed)) +
				'\n\nThe draft was rejected, and the aside (which nobody had reviewed before the deadline) stays.';
			const prefix = '```\nutilize was quickly — (not prose, seven words or more here)\n```\n\n# Heading utilize\n\n';
			const shift = (prefix.match(/\n/g) || []).length;
			const base = checkText(doc).flags;
			const wrapped = checkText(prefix + doc).flags;
			expect(shape(wrapped), `seed ${seed}`).toEqual(shape(base));
			expect(wrapped.map((f) => f.line), `seed ${seed}`)
				.toEqual(base.map((f) => f.line + shift));
		}
	});
});

describe('CLI contract', () => {
	const script = join(HERE, '..', 'scripts', 'style-check.mjs');
	const dir = mkdtempSync(join(tmpdir(), 'terse-cli-'));
	const run = (...args) => spawnSync(process.execPath, [script, ...args],
		{ encoding: 'utf8' });

	it('clean file: exit 0 with evidence work happened', () => {
		const f = join(dir, 'clean.md');
		writeFileSync(f, 'The team ships small tools.\n');
		const r = run(f);
		expect(r.status).toBe(0);
		expect(r.stdout).toContain('style-check: clean');
		expect(r.stdout).toContain(`${f}: `); // stats line proves the file was read
	});

	it('findings: exit 1, distinct from errors', () => {
		const f = join(dir, 'flagged.md');
		writeFileSync(f, 'The cache was cleared quickly.\n');
		const r = run(f);
		expect(r.status).toBe(1);
		expect(r.stdout).toContain('[passive-voice]');
		expect(r.stdout).toMatch(/style-check: \d+ flag/);
	});

	it('unreadable file: exit 2, never 0 or 1', () => {
		const r = run(join(dir, 'no-such-file.md'));
		expect(r.status).toBe(2);
		expect(r.stderr).toContain('cannot read');
	});

	it('unknown flag or bad grade: exit 2 usage', () => {
		expect(run('--bogus', 'x.md').status).toBe(2);
		expect(run('x.md', '--max-grade', 'ten').status).toBe(2);
		expect(run().status).toBe(2);
	});

	it('document grade past the target fails even when every sentence passes', () => {
		const f = join(dir, 'dense.md');
		// each sentence is under 14 words, so no per-sentence grade flag fires
		writeFileSync(f, 'Multifaceted organizational transformation necessitates comprehensive stakeholder alignment procedures. Transformative institutional methodologies precipitate unprecedented developmental paradigm restructuring.\n');
		const r = run(f);
		expect(r.status).toBe(1);
		expect(r.stdout).toContain('[document-grade]');
		const plain = join(dir, 'plain.md');
		writeFileSync(plain, 'We ship it in the morning. The plan is small. The team likes it. All is well now.\n');
		const p = run(plain);
		expect(p.status).toBe(0);
		expect(p.stdout).not.toContain('[document-grade]');
	}, 15_000);

	it('path with spaces is read and checked', () => {
		const f = join(dir, 'my draft notes.md');
		writeFileSync(f, 'The team ships small tools.\n');
		const r = run(f);
		expect(r.status).toBe(0);
		expect(r.stdout).toContain('my draft notes.md: ');
	});

	it('--json output round-trips and carries the flag shape', () => {
		const f = join(dir, 'flagged.md');
		const r = run(f, '--json');
		expect(r.status).toBe(1);
		const parsed = JSON.parse(r.stdout);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].stats.words).toBeGreaterThan(0);
		for (const flag of parsed[0].flags) {
			expect(flag).toMatchObject({
				file: f,
				line: expect.any(Number),
				category: expect.any(String),
				match: expect.any(String),
				hint: expect.any(String),
			});
		}
	});

	it('mixed clean and missing files: the error wins over the findings', () => {
		const clean = join(dir, 'clean.md');
		const r = run(clean, join(dir, 'gone.md'));
		expect(r.status).toBe(2);
	});
});
