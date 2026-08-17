import { describe, it, expect } from 'vitest';
import { checkText } from '../scripts/style-check.mjs';

const cats = (flags) => flags.map((f) => f.category);

describe('checkText', () => {
	it('passes clean prose with no flags', () => {
		const { flags } = checkText('The scheduler deletes stale entries every night.');
		expect(flags).toEqual([]);
	});

	it('flags passive voice, adverbs, and qualifiers', () => {
		const { flags } = checkText(
			'The cache was invalidated by the scheduler, and I think this could possibly be improved significantly.'
		);
		expect(cats(flags)).toContain('passive-voice');
		expect(cats(flags)).toContain('adverb');
		expect(cats(flags)).toContain('qualifier');
	});

	it('flags words with simpler alternatives', () => {
		const { flags } = checkText('We utilize the fallback path in order to facilitate recovery.');
		const matches = flags.filter((f) => f.category === 'simpler-alternative').map((f) => f.match);
		expect(matches).toEqual(expect.arrayContaining(['utilize', 'in order to', 'facilitate']));
	});

	it('flags hard sentences by grade', () => {
		const { flags } = checkText(
			'Despite the fact that readability is, as often described by professional writers, very important for both enjoyment, understanding, and accessibility, it has been overlooked by many novices.'
		);
		expect(cats(flags)).toContain('very-hard-sentence');
	});

	it('flags em dashes with line numbers', () => {
		const { flags } = checkText('First line.\n\nStale entries — every night.');
		const dash = flags.find((f) => f.category === 'em-dash');
		expect(dash.line).toBe(3);
	});

	it('whitelists non-adverb -ly words', () => {
		const { flags } = checkText('We only apply the daily assembly step.');
		expect(cats(flags)).not.toContain('adverb');
	});

	it('ignores code blocks, inline code, and headings', () => {
		const { flags } = checkText('# Utilize This Heading Style\n\nUse `utilize_helper()` here.\n\n```\nwe utilize things very significantly\n```\n');
		expect(flags).toEqual([]);
	});

	it('flags long parenthetical asides but not short ones', () => {
		const { flags } = checkText(
			'The scheduler runs at night (except on the last day of each fiscal quarter) and deletes stale entries (see docs).'
		);
		const asides = flags.filter((f) => f.category === 'aside');
		expect(asides).toHaveLength(1);
		expect(asides[0].match).toContain('except on the last day');
	});

	it('computes document stats', () => {
		const { stats } = checkText('The scheduler deletes stale entries. The report is short.');
		expect(stats.words).toBe(9);
		expect(stats.sentences).toBe(2);
		expect(stats.grade).toBeGreaterThan(0);
		expect(stats.adverbs.target).toBeGreaterThanOrEqual(2);
	});
});
