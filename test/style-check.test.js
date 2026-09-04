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
		expect(() => encodeURIComponent(aside.match)).not.toThrow();
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

	it('flags AI-tell phrases, bare tells, and framed tells', () => {
		const { flags, stats } = checkText(
			'This sentence is load-bearing. Worth noting: the synergy across the data ecosystem underscores the need to delve into the landscape of failures.'
		);
		const tells = flags.filter((f) => f.category === 'ai-tell').map((f) => f.match);
		expect(tells).toEqual(expect.arrayContaining([
			'load-bearing', 'worth noting', 'synergy', 'data ecosystem',
			'underscores the', 'delve', 'landscape of',
		]));
		expect(stats.aiTells).toBe(tells.length);
	});

	it('demotes inflated words with literal senses to simpler-alternative', () => {
		const { flags, stats } = checkText('The robust, seamless plan is crucial.');
		expect(stats.aiTells).toBe(0);
		const simpler = flags.filter((f) => f.category === 'simpler-alternative')
			.map((f) => f.match);
		expect(simpler).toEqual(expect.arrayContaining(['robust', 'seamless', 'crucial']));
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
		// split words, phrase fragments, and literal senses all stay silent
		const { stats } = checkText(
			'The load on the bearing wore it down. The horse fostered no journey across the iron realms.'
		);
		expect(stats.aiTells).toBe(0);
		expect(checkText('He noted the worth of the change.').stats.aiTells).toBe(0);
		expect(checkText('This is an important note.').stats.aiTells).toBe(0);
		// a relative clause, not a pointer noun
		expect(checkText('The comma that split the sentence stays.').stats.aiTells).toBe(0);
		expect(checkText('The split exists because a model cannot judge its own prose.').stats.aiTells).toBe(0);
	});

	it('does not read "rather than" comparisons as hedges', () => {
		const { flags } = checkText('The team ships small tools rather than one big system.');
		expect(flags.filter((f) => f.category === 'qualifier')).toHaveLength(0);
		const bare = checkText('The plan is rather ambitious.');
		expect(bare.flags.filter((f) => f.category === 'qualifier')).toHaveLength(1);
	});

	it('flags "very" as a qualifier but not "the very least"', () => {
		const quals = (t) => checkText(t).flags
			.filter((f) => f.category === 'qualifier').map((f) => f.match);
		expect(quals('The rollout is very risky.')).toEqual(['very']);
		expect(quals('At the very least the tests run.')).toEqual([]);
	});

	it('flags a spaced en dash but not a range or a double hyphen', () => {
		const dashes = (t) => checkText(t).flags.filter((f) => f.category === 'em-dash');
		expect(dashes('Stale entries – every night.')).toHaveLength(1);
		expect(dashes('Retry 3–5 times before failing.')).toHaveLength(0);
		expect(dashes('Stale entries -- every night.')).toHaveLength(0);
	});

	it('does not read "I/O" or "i.e." as personal pronouns', () => {
		const { flags } = checkText(
			'Disk I/O spikes, i.e. reads stall until the flush ends.',
			{ impersonal: true });
		expect(flags.filter((f) => f.category === 'personal-pronoun')).toEqual([]);
	});

	it('gives repeated matches in one sentence distinct spans', () => {
		const { flags } = checkText('Maybe yes, maybe no.');
		const spans = flags.filter((f) => f.category === 'qualifier').map((f) => f.span);
		expect(spans).toHaveLength(2);
		expect(spans[0]).not.toEqual(spans[1]);
	});

	it('suppresses the next line under a terse-ignore comment', () => {
		const doc = '<!-- terse-ignore -->\nWe utilize robust things.\n\nWe utilize more.\n';
		const { flags } = checkText(doc);
		expect(flags.map((f) => f.line)).toEqual([4]);
	});

	it('narrows suppression to the named categories', () => {
		const doc = '<!-- terse-ignore: ai-tell -->\nWe utilize robust things.\n';
		const cats = checkText(doc).flags.map((f) => f.category);
		expect(cats).toContain('simpler-alternative');
		expect(cats).not.toContain('ai-tell');
	});

	it('never checks the text inside an HTML comment', () => {
		const { flags } = checkText('Clean prose here.\n\n<!-- utilize robust very -->\n');
		expect(flags).toEqual([]);
	});

	it('exempts lexical findings inside quotes and blockquotes', () => {
		const quoted = checkText('The tripwire lists "worth noting" as an example.');
		expect(quoted.stats.aiTells).toBe(0);
		const block = checkText('> We utilize robust spaghetti here.');
		expect(block.flags.filter((f) => f.category === 'ai-tell')).toEqual([]);
		expect(block.flags.filter((f) => f.category === 'simpler-alternative')).toEqual([]);
	});

	it('still flags readability categories inside quoted material', () => {
		const { flags } = checkText('"Sadly, the server died."');
		expect(flags.filter((f) => f.category === 'adverb').map((f) => f.match))
			.toEqual(['Sadly']);
	});

	it('reports a word-level flag on the line where the match sits', () => {
		const doc = 'The first sentence is short. The second sentence\nwraps onto a new line and utilizes a word here,\nand it is worth noting that the line matters.';
		const { flags } = checkText(doc);
		const byMatch = Object.fromEntries(flags.map((f) => [f.match, f.line]));
		expect(byMatch['utilizes']).toBe(2);
		expect(byMatch['it is worth noting']).toBe(3);
	});

	it('suppresses every line of the paragraph under a terse-ignore comment', () => {
		const doc = '<!-- terse-ignore -->\nWe utilize things. The next\nsentence utilizes more.\n\nWe utilize again.\n';
		const { flags } = checkText(doc);
		expect(flags.map((f) => f.line)).toEqual([5]);
	});

	it('counts one tell when a phrase and a frame overlap', () => {
		const { flags, stats } = checkText('It is worth noting that the cache is shared.');
		const tells = flags.filter((f) => f.category === 'ai-tell');
		expect(tells).toHaveLength(1);
		expect(tells[0].match).toBe('it is worth noting');
		expect(stats.aiTells).toBe(1);
	});

	it('does not read state idioms as passive voice', () => {
		const { flags } = checkText(
			'To get started, run the installer. The config is based on YAML. The binary is located in /usr/local/bin. The value is set to zero. Entries are supposed to expire. The flag is meant for tests. The team is focused on latency.'
		);
		expect(flags.filter((f) => f.category === 'passive-voice')).toEqual([]);
		expect(checkText('The cache was cleared by the job.').flags.map((f) => f.category)).toContain('passive-voice');
	});

	it('hints deletion for sentence adverbs and ordinals', () => {
		const hints = (t) => Object.fromEntries(checkText(t).flags
			.filter((f) => f.category === 'adverb').map((f) => [f.match, f.hint]));
		const h = hints('Unfortunately, the deploy failed. Firstly, install it. The job ran quickly.');
		expect(h['Unfortunately']).toMatch(/comment on the sentence/);
		expect(h['Firstly']).toBe('use "first"');
		expect(h['quickly']).toMatch(/stronger verb/);
	});

	it('suggests the plain word for UK spellings too', () => {
		const { flags } = checkText('We utilise the fallback and endeavour to recover.');
		const simpler = flags.filter((f) => f.category === 'simpler-alternative').map((f) => f.match);
		expect(simpler).toEqual(expect.arrayContaining(['utilise', 'endeavour']));
	});

	it('refines a qualifier span to the occurrence the lexicon matched', () => {
		const quoted = checkText('She said "the very least" and it is very slow.');
		expect(quoted.flags.filter((f) => f.category === 'qualifier')).toHaveLength(1);
		const { flags } = checkText('At the very least, the job is very slow.');
		const q = flags.find((f) => f.category === 'qualifier');
		expect(q.span).toEqual([30, 34]);
		const r = checkText('Rather than B, it is rather slow.').flags.find((f) => f.category === 'qualifier');
		expect(r.span).toEqual([21, 27]);
	});

	it('keeps a tell inside a bold-label run', () => {
		const doc = '- **Kafka**: delve into the bus 🚀\n- **Rollout**: by region\n- **Metrics**: p99 under 100ms\n';
		const tells = checkText(doc).flags.filter((f) => f.category === 'ai-tell').map((f) => f.match);
		expect(tells).toEqual(expect.arrayContaining(['bold-label bullets', 'delve', 'emoji']));
	});

	it('flags an emoji in a heading', () => {
		const { flags } = checkText('# 🚀 Launch plan\n\nText here.');
		expect(flags.map((f) => f.match)).toEqual(['emoji']);
		expect(flags[0].line).toBe(1);
	});

	it('does not read "gets started", "appears to the left", or "seem to me" as flags', () => {
		const { flags } = checkText('The worker gets started by cron. The menu appears to the left of the field. They seem to me too slow.');
		expect(flags.filter((f) => f.category === 'passive-voice')).toEqual([]);
		expect(flags.filter((f) => f.category === 'qualifier')).toEqual([]);
		expect(checkText('The bug appears to recur.').flags.map((f) => f.match)).toEqual(['appears to']);
	});

	it('treats a null ignore in options as empty', () => {
		expect(checkText('We utilize it.', { ignore: null, targets: null }).flags).toHaveLength(1);
	});
});
