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

	it('keeps text when punctuation is followed by a closing quote or paren', () => {
		const { flags, stats } = checkText('The plan failed. (Nobody was surprised at all by this outcome.) We moved on.');
		expect(stats.words).toBe(14);
		expect(cats(flags)).toContain('passive-voice');
		expect(cats(flags)).toContain('aside');
	});

	it('checks paragraphs that follow a heading with no blank line', () => {
		const { flags, stats } = checkText('# Title\nThe cache was invalidated by the scheduler significantly.');
		expect(cats(flags)).toContain('passive-voice');
		expect(cats(flags)).toContain('adverb');
		expect(stats.words).toBe(8);
	});

	it('flags asides despite nested parens or inner sentence punctuation', () => {
		const nested = checkText('The cache layer (both L1 (on-die) and the shared L2 slice) needs work.');
		expect(cats(nested.flags)).toContain('aside');
		const inner = checkText('The job skips derived tables (e.g. the aggregate rollups built by the pipeline) tonight.');
		expect(cats(inner.flags)).toContain('aside');
	});

	it('ignores parens inside markdown link URLs when finding asides', () => {
		const { flags } = checkText('It broke (because the [job](https://en.wikipedia.org/wiki/Cron_(Unix)) can delete active entries).');
		expect(flags.filter((f) => f.category === 'aside')).toHaveLength(1);
	});

	it('counts typographic apostrophes, decimals, and abbreviations as single words', () => {
		const { stats } = checkText('Don’t ship version 3.5 before 3:30 p.m. today.');
		expect(stats.words).toBe(8);
		expect(stats.sentences).toBe(1);
	});

	it('does not flag qualifier words inside larger words', () => {
		const { flags } = checkText('Her unrequited love caused a bitter dispute.');
		expect(cats(flags)).not.toContain('qualifier');
	});

	it('keeps the aside preview well-formed when emoji straddle the cut', () => {
		const { flags } = checkText(`Ship it (${'a'.repeat(39)}🎉 and more words to pass the threshold) now.`);
		const aside = flags.find((f) => f.category === 'aside');
		expect(aside.match.isWellFormed()).toBe(true);
	});

	it('treats unpunctuated list items as separate sentences', () => {
		const { flags, stats } = checkText('- deploys the build to the staging cluster\n- runs the smoke tests for every service\n- promotes the build when the tests pass');
		expect(cats(flags)).not.toContain('very-hard-sentence');
		expect(stats.sentences).toBe(3);
	});

	it('catches passive voice with contractions, "being", and prefixed participles', () => {
		const { flags } = checkText('The bridge was being built. The cake wasn’t eaten. The policy was rewritten.');
		expect(flags.filter((f) => f.category === 'passive-voice')).toHaveLength(3);
	});

	it('does not read "-ed" lookalikes or proper nouns as flags', () => {
		const { flags } = checkText('She was indeed talented. Kelly spoke to Holly warmly.');
		expect(cats(flags)).not.toContain('passive-voice');
		expect(flags.filter((f) => f.category === 'adverb').map((f) => f.match)).toEqual(['warmly']);
	});

	it('reports per-sentence lengths in stats', () => {
		const { stats } = checkText('One two three. Four five.');
		expect(stats.sentenceLengths).toEqual([3, 2]);
	});

	it('reports zero reading time for an empty document', () => {
		const { stats } = checkText('');
		expect(stats.readingTimeMinutes).toBe(0);
		expect(stats.words).toBe(0);
	});

	it('ignores YAML frontmatter', () => {
		const { flags, stats } = checkText('---\ndescription: "We utilize numerous additional things significantly."\n---\n\nClean prose here.');
		expect(flags).toEqual([]);
		expect(stats.words).toBe(3);
	});

	it('flags sentence-initial adverbs after quotes or list markers', () => {
		const { flags } = checkText('"Sadly, the server died."\n\n- Quickly restart the pods');
		expect(flags.filter((f) => f.category === 'adverb').map((f) => f.match)).toEqual(['Sadly', 'Quickly']);
	});

	it('does not read "un-" adjectives as passive voice', () => {
		const { flags } = checkText('The actor is unknown. The risk was unseen. She was mistaken about it.');
		expect(cats(flags)).not.toContain('passive-voice');
	});

	it('leaves multiline pseudo-links alone without shifting line numbers', () => {
		const { flags } = checkText('See [the doc](https://example.com/\nvery/long/path) here.\nStale entries — every night.');
		const dash = flags.find((f) => f.category === 'em-dash');
		expect(dash.line).toBe(3);
	});

	it('does not count horizontal rules as sentences', () => {
		const { stats } = checkText('First paragraph here.\n\n---\n\nSecond paragraph here.');
		expect(stats.sentences).toBe(2);
		expect(stats.sentenceLengths).toEqual([3, 3]);
	});

	it('keeps a standalone year as a sentence and "ms." as a sentence end', () => {
		expect(checkText('The war ended. 1945. Everyone celebrated.').stats.sentences).toBe(3);
		expect(checkText('The query took 30 ms. Then it returned.').stats.sentences).toBe(2);
		expect(checkText('Ms. Smith arrived early.').stats.sentences).toBe(1);
	});

	it('counts each qualifier occurrence', () => {
		const { flags } = checkText('Maybe yes, maybe no.');
		expect(flags.filter((f) => f.category === 'qualifier')).toHaveLength(2);
	});

	it('flags AI-tell phrases and banned vocabulary', () => {
		const { flags, stats } = checkText(
			'This sentence is load-bearing. Worth noting: the robust, seamless ecosystem fosters synergy across the landscape.'
		);
		const tells = flags.filter((f) => f.category === 'ai-tell').map((f) => f.match);
		expect(tells).toEqual(expect.arrayContaining([
			'load-bearing', 'worth noting', 'robust', 'seamless', 'ecosystem',
			'synergy', 'landscape',
		]));
		expect(tells).toContain('fosters');
		expect(stats.aiTells).toBe(tells.length);
	});

	it('flags the structural tells with curly or straight apostrophes', () => {
		const tellsOf = (t) => checkText(t).flags
			.filter((f) => f.category === 'ai-tell').map((f) => f.match);
		expect(tellsOf("It's not just a checker, it's an editor."))
			.toContain("it's not X, it's Y");
		expect(tellsOf('It’s not speed, it’s discipline.'))
			.toContain("it's not X, it's Y");
		expect(tellsOf('The tool not only checks but also rewrites.'))
			.toContain('not only X but also Y');
	});

	it('flags validation, therapy-speak, and punchy-fragment tells', () => {
		const tellsOf = (t) => checkText(t).flags
			.filter((f) => f.category === 'ai-tell').map((f) => f.match);
		expect(tellsOf("You're absolutely right to push back. That is real, and that's not nothing."))
			.toEqual(expect.arrayContaining(["you're absolutely right", "that's real / not nothing"]));
		expect(tellsOf('Sit with that. It is worth stating plainly: the plan works, full stop.'))
			.toEqual(expect.arrayContaining(['sit with that', 'worth stating plainly', 'full stop']));
		expect(tellsOf('Not a detail. A design decision.')).toContain('punchy fragment');
		expect(tellsOf("This isn't just faster, it's cheaper."))
			.toContain("isn't just X, it's Y");
	});

	it('does not fire ai-tell on innocent look-alikes', () => {
		const { flags } = checkText(
			'The load on the bearing wore it down. The horse fostered no journeys across realms of iron.'
		);
		const tells = flags.filter((f) => f.category === 'ai-tell').map((f) => f.match);
		// literal vocabulary uses still fire (accepted false-positive risk),
		// but split words and phrase fragments must not
		expect(tells).not.toContain('load-bearing');
		expect(tells).not.toContain('load bearing');
		expect(checkText('He noted the worth of the change.').stats.aiTells).toBe(0);
		expect(checkText('This is an important note.').stats.aiTells).toBe(0);
	});
});
