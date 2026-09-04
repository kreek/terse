// Milestone 2 proof: measured recall on a labeled corpus of tells, and
// zero false positives from the lexical categories on edited human prose
// (Hemingway's newspaper journalism, public domain, in fixtures/).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkText } from '../scripts/style-check.mjs';

const FIXTURES = join(import.meta.dirname, 'fixtures', 'human-prose');

// Each entry plants exactly one tell. Recall must be total: a miss here
// means the lexicon lost coverage it once had.
const LABELED_TELLS = [
	{ text: "We're thrilled to announce our newest feature.", tell: 'thrilled to announce' },
	{ text: 'Under the hood, the sync engine batches writes.', tell: 'under the hood' },
	{ text: 'This is just the beginning for the platform.', tell: 'this is just the beginning' },
	{ text: "We can't wait to see what you build.", tell: "can't wait to see" },
	{ text: 'The update is a game-changer for small teams.', tell: 'game-changer' },
	{ text: 'Our tool will revolutionize your workflow.', tell: 'revolutionize your' },
	{ text: 'The editor empowers writers to move fast.', tell: 'empowers writers' },
	{ text: 'Unleash the full potential of your notes.', tell: 'unleash the full potential' },
	{ text: 'Take a deep dive into the scheduler.', tell: 'deep dive' },
	{ text: "In today's fast-paced world, speed wins.", tell: "in today's fast-paced world" },
	{ text: 'The pipeline uses state-of-the-art caching.', tell: 'state-of-the-art' },
	{ text: 'Say goodbye to merge conflicts.', tell: 'say goodbye to' },
	{ text: 'Deploy every branch with confidence.', tell: 'with confidence' },
	{ text: 'Worth noting: the cache is shared.', tell: 'worth noting' },
	{ text: 'This sentence is load-bearing for the argument.', tell: 'load-bearing' },
	{ text: "It's not just a checker, it's an editor.", tell: "it's not X, it's Y" },
	{ text: 'The tool not only checks but also rewrites.', tell: 'not only X but also Y' },
	{ text: 'No staging queue, no broken builds, no waiting.', tell: 'no X, no Y, no Z' },
	{ text: 'Stop guessing. Start shipping.', tell: 'stop Xing, start Ying' },
	{ text: "Whether you're a founder, a writer, or a student, it fits.", tell: "whether you're X, Y, or Z" },
	{ text: 'Four questions settle it. Ask them before you adopt.', tell: 'slogan opener' },
	{ text: 'Intro paragraph sits here.\n\nThree things matter here.', tell: 'slogan opener' },
	// the enumerator shape: a count, a verdict verb, then the list
	{ text: 'Two parts do the work:\n\n- the checker\n- the skills', tell: 'slogan opener' },
	{ text: 'Three layers carry the load.', tell: 'slogan opener' },
	{ text: 'Four scripts make up the toolchain:', tell: 'slogan opener' },
	{ text: 'The new cache earns its place in the request path.', tell: 'earns its place' },
	{ text: 'The redesign moves the needle on churn.', tell: 'moves the needle' },
	{ text: 'The runtime does the heavy lifting for you.', tell: 'heavy lifting' },
	{ text: 'Start with the low-hanging fruit in the backlog.', tell: 'low-hanging fruit' },
	// inflections: the family covers what the old list enumerated by hand
	{ text: 'The team delved into the logs.', tell: 'delved' },
	{ text: 'The redesign moved the needle on churn.', tell: 'moved the needle' },
	{ text: 'The cache earns its keep under load.', tell: 'earns its keep' },
	// tell frames: words with literal senses, in their machine shape
	{ text: 'The analogy holds at scale.', tell: 'analogy holds' },
	{ text: 'The same holds for consumer groups.', tell: 'the same holds for' },
	{ text: 'The comparison holds true under load.', tell: 'holds true' },
	{ text: 'That model buys you replay for free.', tell: 'buys you' },
	{ text: 'The extra broker buys us nothing here.', tell: 'buys us' },
	{ text: 'Renaming a topic means minting a new name.', tell: 'minting a new name' },
	{ text: 'One example carries the argument.', tell: 'carries the argument' },
	{ text: 'The prefix carries the weight of the convention.', tell: 'carries the weight' },
	{ text: 'The routing logic lives in the gateway.', tell: 'logic lives in' },
	{ text: 'The outage forced the question of ownership.', tell: 'forced the question' },
	{ text: 'Five domains carry fixed weights.', tell: 'domains carry' },
	{ text: 'The report carries the stats line.', tell: 'report carries' },
	{ text: 'Each option carries a risk.', tell: 'carries a risk' },
	{ text: 'A booked date is what makes the plan run.', tell: 'what makes the plan run' },
	{ text: 'The uptime is a testament to the design.', tell: 'testament to' },
	// the pointer noun standing in for the previous paragraph
	{ text: 'Here is that split on a real paragraph.', tell: 'that split' },
	{ text: 'This approach has two drawbacks.', tell: 'this approach' },
	{ text: 'Those trade-offs decide the design.', tell: 'those trade-offs' },
	{ text: 'The codebase is a tapestry of styles.', tell: 'tapestry of' },
	{ text: 'That lives in the realm of speculation.', tell: 'realm of' },
	{ text: 'The security landscape shifted this year.', tell: 'security landscape' },
	{ text: 'We mapped the customer journey end to end.', tell: 'customer journey' },
	{ text: 'The developer ecosystem keeps growing.', tell: 'developer ecosystem' },
	{ text: 'Harness the power of the scheduler.', tell: 'harness the power' },
	{ text: 'The outage underscores the need for retries.', tell: 'underscores the' },
	{ text: 'The cache unlocks new headroom.', tell: 'unlocks new headroom' },
	{ text: 'The plan fosters a culture of review.', tell: 'fosters a culture' },
	{ text: 'It will supercharge your workflow.', tell: 'supercharge your' },
	// anthropomorphized code-speak
	{ text: 'The retry loop quietly swallows the error.', tell: 'quietly swallows' },
	{ text: 'The old parser was the culprit.', tell: 'the culprit' },
	{ text: 'Delete the offending line.', tell: 'the offending line' },
	{ text: 'The scheduler is battle-tested.', tell: 'battle-tested' },
	{ text: 'This felt like a footgun during review.', tell: 'footgun' },
	{ text: 'The cron job is the linchpin of the pipeline.', tell: 'linchpin' },
	{ text: 'The exporter is the workhorse of the system.', tell: 'workhorse' },
	// self-important spotlighting
	{ text: 'That distinction actually matters for the reader.', tell: 'actually matters' },
	{ text: 'The real question is ownership.', tell: 'the real question' },
	{ text: 'Why this matters: the cache is shared by every tenant.', tell: 'why this matters' },
	{ text: 'Bottom line: the small fix ships first.', tell: 'bottom line:' },
	{ text: 'The kicker is the license change.', tell: 'the kicker' },
	{ text: 'The crux is the retry budget.', tell: 'the crux' },
	{ text: 'The tell is the em dash.', tell: 'the tell is' },
	// performative candor
	{ text: 'Let me be blunt about the timeline.', tell: 'let me be blunt' },
	{ text: 'The honest answer is that nobody measured it.', tell: 'the honest answer' },
	{ text: 'The short answer is no.', tell: 'the short answer' },
	{ text: 'The fix works. Period.', tell: 'period. as emphasis' },
	{ text: 'The design is hand-wavy about failure.', tell: 'hand-wavy' },
	// unsolicited validation
	{ text: 'Great question, and the answer is no.', tell: 'great question' },
	{ text: 'Fair point about the rollback path.', tell: 'fair point' },
	{ text: 'Spot on, the loop allocates every pass.', tell: 'spot on' },
	{ text: 'Your instinct is right about the cache.', tell: 'your instinct is right' },
	// the em-dash reframe
	{ text: "This isn't a limit, it's a target.", tell: "isn't X, it's Y" },
	{ text: "The debate isn't about speed, it's about trust.", tell: "isn't about X, it's about Y" },
	{ text: 'Not just faster, also smaller.', tell: 'not just' },
	// hedging connective tissue
	{ text: 'If anything, the queue is too small.', tell: 'if anything' },
	{ text: 'The migration is non-trivial.', tell: 'non-trivial' },
	{ text: 'That said, the fallback works.', tell: 'that said' },
	{ text: 'As we will see, the broker drops the message.', tell: 'as we will see' },
	{ text: 'The name does not mark the boundary, and it does not need to.', tell: 'and it does not need to' },
	{ text: 'The prefix is not enforced, nor should it be.', tell: 'nor should it' },
	{ text: 'To be fair, the spec changed twice.', tell: 'to be fair' },
	{ text: 'It is worth checking the index first.', tell: 'it is worth checking' },
	// metaphor soup
	{ text: 'The happy path skips validation.', tell: 'happy path' },
	{ text: 'Keep the blast radius small.', tell: 'blast radius' },
	{ text: 'Run a sanity check on the totals.', tell: 'sanity check' },
	{ text: 'The flag is an escape hatch for old clients.', tell: 'escape hatch' },
	{ text: 'Retries here are belt-and-suspenders.', tell: 'belt-and-suspenders' },
	{ text: 'The log line is the smoking gun.', tell: 'smoking gun' },
	{ text: 'Bootstrapping is a chicken-and-egg problem.', tell: 'chicken-and-egg' },
	{ text: 'Add guardrails around the delete flow.', tell: 'add guardrails' },
	{ text: 'These concerns are orthogonal.', tell: 'concerns are orthogonal' },
	{ text: 'The importer is spaghetti code.', tell: 'spaghetti code' },
	{ text: 'That whole layer is just plumbing.', tell: 'just plumbing' },
	// sign-off tics
	{ text: 'Verdict: keep the old client.', tell: 'verdict:' },
	{ text: 'TL;DR: ship the small fix first.', tell: 'tl;dr' },
	{ text: 'Say the word and the flag flips.', tell: 'say the word' },
	{ text: 'Just let me know if the build breaks.', tell: 'just let me know' },
	{ text: 'Want me to wire up the failing case?', tell: 'want me to wire up the failing case?' },
];

// The tells above in literal, human senses must stay silent.
const INNOCENT_LOOKALIKES = [
	'A spot on the shirt gave him away.',
	'If anything changes overnight, page the on-call engineer.',
	'They want me to resign before the vote.',
	'The grace period. It ended in March.',
	'The tell was nothing: the raid squads kept quiet.',
	// single words in their literal senses, protected by the tell frames
	'The rope holds while the anchor drags.',
	'She buys bread from the bakery on the corner.',
	'The mint stamped the new coins in spring.',
	'The men carried the wounded across the road.',
	'My cousin lives in a flat above the bakery.',
	'The wind forced the door open.',
	'The porters carried the crates up the hill.',
	'She carries the bag and her brother carries the map.',
	'What makes the engine run is the spark plug.',
	'The test harness runs nightly.',
	'Prefix private names with an underscore.',
	'The state pays for foster care.',
	'Unlock the door with the master key.',
	'She unleashed the dogs at the park.',
	'The desert landscape stretched for miles.',
	'Their journeys shaped the roadmap.',
	'The forest ecosystem recovered after the fire.',
	'Orthogonal vectors span the plane.',
	'The dinner was spaghetti and bread.',
	'The guardrail on the bridge bent in the crash.',
	'The revolutionary government fell in March.',
	'He boasted about the harvest.',
	'The board discussed the bottom line all quarter.',
	'Two men did the work before noon.',
	'Terse has two parts: a checker and a set of skills.',
];

// Words demoted from the tell list: still flagged, as wordy words with a
// plain swap, never as an accusation of machine writing.
const DEMOTED_WORDS = [
	{ text: 'The design is robust and seamless.', match: 'robust', simpler: 'strong' },
	{ text: 'The design is robust and seamless.', match: 'seamless', simpler: 'smooth' },
	{ text: 'Timing is crucial here.', match: 'crucial', simpler: 'important' },
	{ text: 'The migration was pivotal.', match: 'pivotal', simpler: 'key' },
	{ text: 'Setup is effortless.', match: 'effortless', simpler: 'easy' },
	{ text: 'Streamlining the intake took a week.', match: 'streamlining', simpler: 'simplifying' },
	{ text: 'The demo showcases the editor.', match: 'showcases', simpler: 'shows' },
	{ text: 'The cache elevates hit rates.', match: 'elevates', simpler: 'raises' },
	{ text: 'The design is nuanced.', match: 'nuanced', simpler: 'subtle' },
];

const WEAK_VERBS = [
	{ text: 'The metric is a reflection of real usage.', verb: 'reflects' },
	{ text: 'The queue has the ability to pause consumers.', verb: 'can' },
	{ text: 'The parser makes use of a lookup table.', verb: 'uses' },
	{ text: 'The gateway serves as the entry point.', verb: 'is' },
	{ text: 'Latency is dependent on the region.', verb: 'depends on' },
];

describe('labeled tell corpus: total recall', () => {
	for (const { text, tell } of LABELED_TELLS) {
		it(`detects: ${tell}`, () => {
			const tells = checkText(text).flags
				.filter((f) => f.category === 'ai-tell').map((f) => f.match);
			expect(tells).toContain(tell);
		});
	}
});

describe('literal senses of tell words stay silent', () => {
	for (const text of INNOCENT_LOOKALIKES) {
		it(`ignores: ${text}`, () => {
			expect(checkText(text).stats.aiTells).toBe(0);
		});
	}
});

describe('demoted words: wordy with a plain swap, not an ai-tell', () => {
	for (const { text, match, simpler } of DEMOTED_WORDS) {
		it(`suggests "${simpler}" for "${match}"`, () => {
			const { flags, stats } = checkText(text);
			expect(stats.aiTells).toBe(0);
			const flag = flags.find((f) =>
				f.category === 'simpler-alternative' && f.match === match);
			expect(flag).toBeDefined();
			expect(flag.hint).toContain(`"${simpler}"`);
		});
	}
});

describe('weak verbs: detected with the plain verb as the hint', () => {
	for (const { text, verb } of WEAK_VERBS) {
		it(`suggests "${verb}"`, () => {
			const flag = checkText(text).flags.find((f) => f.category === 'weak-verb');
			expect(flag).toBeDefined();
			expect(flag.hint).toContain(`"${verb}"`);
		});
	}
});

describe('edited human prose: zero lexical false positives', () => {
	const LEXICAL = new Set(['ai-tell', 'weak-verb', 'simpler-alternative', 'em-dash']);
	for (const f of readdirSync(FIXTURES)) {
		it(`${f} carries no lexical flags`, () => {
			const { flags } = checkText(readFileSync(join(FIXTURES, f), 'utf8'));
			const lexical = flags.filter((x) => LEXICAL.has(x.category));
			expect(lexical.map((x) => `${x.category}:${x.match}`)).toEqual([]);
		});
	}
});

const SAMPLES = join(import.meta.dirname, '..', 'samples', 'hemingway');

// "Use short first paragraphs" is the second Kansas City Star rule. The
// threshold has to clear the prose it was drawn from, so the journalism is
// the regression corpus for it.
describe('long opening: calibrated against the journalism it came from', () => {
	const openings = (doc) =>
		checkText(doc).flags.filter((f) => f.category === 'long-opening');
	const para = (n) => Array.from({ length: n }, () => 'word').join(' ') + '.';

	for (const f of readdirSync(SAMPLES)) {
		it(`${f} opens short enough`, () => {
			expect(openings(readFileSync(join(SAMPLES, f), 'utf8'))).toEqual([]);
		});
	}

	it('flags an opening at the threshold', () => {
		expect(openings(`# Title\n\n${para(90)}\n`)[0].match).toBe('90 words');
	});

	it('leaves an opening below the threshold alone', () => {
		expect(openings(`# Title\n\n${para(89)}\n`)).toEqual([]);
	});

	it('measures the first paragraph, not the whole document', () => {
		expect(openings(`${para(20)}\n\n${para(200)}\n`)).toEqual([]);
	});

	it('skips a leading list and measures the first prose paragraph', () => {
		expect(openings(`- ${para(120)}\n\n${para(20)}\n`)).toEqual([]);
	});
});

// A requirement filed as a wish is the failure mode in issues and
// acceptance criteria: the reader can decline a preference.
describe('preference framing: always on', () => {
	const prefs = (doc) =>
		checkText(doc).flags.filter((f) => f.category === 'preference').map((f) => f.match);

	for (const [text, phrase] of [
		['I would like the export to include totals.', 'i would like'],
		["I'd prefer the job to retry twice.", "i'd prefer"],
		['It would be nice if the report paginated.', 'it would be nice'],
		['We would like the flag removed.', 'we would like'],
		['In my opinion the cache is too small.', 'in my opinion'],
	]) {
		it(`flags "${phrase}"`, () => expect(prefs(text)).toContain(phrase));
	}

	it('leaves a stated requirement alone', () => {
		expect(prefs('The export includes column totals.')).toEqual([]);
	});
});

// Opt-in, because prose written for a reader keeps its "you".
describe('impersonal mode: pronouns only when asked for', () => {
	const doc = 'You can see we kept my original design.';
	const pronouns = (opts) =>
		checkText(doc, opts).flags.filter((f) => f.category === 'personal-pronoun');

	it('stays silent by default', () => {
		expect(pronouns({})).toEqual([]);
	});

	it('flags first and second person under --impersonal', () => {
		// lexical categories report in lexicon order, not document order
		expect(pronouns({ impersonal: true }).map((f) => f.match).sort())
			.toEqual(['You', 'my', 'we']);
	});

	it('leaves the country alone', () => {
		expect(checkText('The US region is nightly.', { impersonal: true })
			.flags.filter((f) => f.category === 'personal-pronoun')).toEqual([]);
	});

	it('leaves impersonal requirements alone', () => {
		expect(checkText('The export includes column totals.', { impersonal: true })
			.flags.filter((f) => f.category === 'personal-pronoun')).toEqual([]);
	});
});

describe('render-highlights', async () => {
	const { renderPage } = await import('../scripts/render-highlights.mjs');
	const doc = "Here's the thing — the cache was cleared quickly.\n\nWe utilize retries (which nobody had reviewed before the deadline arrived).";

	it('conserves the prose through rendering', () => {
		const html = renderPage(doc);
		const main = html.match(/<main>([\s\S]*?)<\/main>/)[1];
		const text = main.replace(/<[^>]+>/g, '')
			.replace(/&amp;/g, '&').replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>').replace(/&quot;/g, '"');
		// markdown structure renders as elements, so compare prose lines
		const lines = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean);
		expect(lines(text)).toEqual(lines(doc));
	});

	it('renders markdown structure around the marks', () => {
		const md = '# Title\n\nWe **utilize** the `cache` in [docs](https://x.test/a).\n\n- first item\n- second item\n\n```\ncode here\n```';
		const html = renderPage(md).match(/<main>([\s\S]*?)<\/main>/)[1];
		expect(html).toContain('<h1>Title</h1>');
		expect(html).toMatch(/<strong><mark[^>]*>utilize<\/mark><\/strong>/);
		expect(html).toContain('<code>cache</code>');
		expect(html).toContain('<a href="https://x.test/a">');
		expect(html).toContain('<li>first item</li>');
		expect(html).toContain('<pre>code here</pre>');
		expect(html).not.toMatch(/^#/m);
	});

	it('marks every category present with a hint tooltip', () => {
		const html = renderPage(doc);
		expect(html).toContain('class="ai-tell');
		expect(html).toContain('em-dash');
		expect(html).toContain('passive-voice');
		expect(html).toContain('aside');
		expect(html).toMatch(/title="[^"]*state the claim plainly/);
	});

	it('emits spans on every flag it paints', () => {
		const { flags } = checkText(doc);
		expect(flags.length).toBeGreaterThan(4);
		expect(flags.filter((f) => !f.span)).toEqual([]);
	});
});

describe('page script integrity', async () => {
	const { renderPage } = await import('../scripts/render-highlights.mjs');

	it('the emitted page script parses and the stylesheet keeps its id', () => {
		const html = renderPage('We utilize retries quite often (more than anyone would like to admit).');
		const src = html.match(/<script id="page-js">([\s\S]*?)<\/script>/)[1];
		expect(() => new Function(src)).not.toThrow();
		expect(html).toContain('<style id="page-css">');
	});

	it('the preview is read-only: no accept controls, no publish call', () => {
		const html = renderPage('We utilize retries quite often.');
		expect(html).not.toContain('data-act=');
		expect(html).not.toContain('artifact.publish');
		expect(html).not.toContain('<artifact-sync>');
	});
});
