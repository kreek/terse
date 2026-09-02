// Coverage for the prose technical documents are made of: nominalizations,
// signposting, document metadiscourse, hedges, structural tells the markdown
// itself reveals, and the mechanical grammar tier.
import { describe, it, expect } from 'vitest';
import { checkText } from '../scripts/style-check.mjs';

const of = (text, cat, opts) => checkText(text, opts).flags
	.filter((f) => f.category === cat);
const matches = (text, cat) => of(text, cat).map((f) => f.match);

describe('nominalizations in every inflection', () => {
	for (const [text, verb] of [
		['The team made the decision to postpone.', 'decide'],
		['We conducted an investigation into the outage.', 'investigate'],
		['The job performs a deletion of stale rows.', 'delete'],
		['The service provides the capability to export.', 'can'],
		['They reached a conclusion on the design.', 'conclude'],
		['The doc provides an overview of the flow.', 'outline'],
		['She gave consideration to the risk.', 'consider'],
	]) {
		it(`suggests "${verb}" for: ${text}`, () => {
			const flag = of(text, 'weak-verb')[0];
			expect(flag).toBeDefined();
			expect(flag.hint).toContain(`"${verb}"`);
		});
	}
});

describe('wordy connectors', () => {
	it('flags "in terms of" and "the reason is because"', () => {
		expect(matches('In terms of latency, the reason is because the index is cold.', 'simpler-alternative'))
			.toEqual(expect.arrayContaining(['in terms of', 'the reason is because']));
	});
});

describe('signposting and document metadiscourse', () => {
	for (const [text, tell] of [
		['Note that the flag is optional.', 'note that'],
		['Please note that retries are idempotent.', 'please note'],
		['It should be noted that the cache is shared.', 'it should be noted'],
		['Keep in mind that the limit is per tenant.', 'keep in mind'],
		['In this document we will discuss the architecture.', 'in this document we'],
		['This section describes the components.', 'this section describes'],
		['The following sections cover the setup.', 'the following sections cover'],
		["Let's dive into the details.", "let's dive"],
		["Let's explore how this works.", "let's explore"],
		['Navigating the complexities of consensus requires care.', 'navigating the complexities'],
		['This comprehensive guide walks you through the setup.', 'comprehensive guide'],
		['In summary, the rollout worked.', 'in summary'],
		['In conclusion, ship it.', 'in conclusion'],
	]) {
		it(`detects: ${tell}`, () => {
			expect(matches(text, 'ai-tell')).toContain(tell);
		});
	}

	it('leaves "a note that" and "this document specifies" alone', () => {
		expect(of('He left a note that said goodbye.', 'ai-tell')).toEqual([]);
		expect(of('This document specifies the wire format.', 'ai-tell')).toEqual([]);
	});
});

describe('hedges beyond the classic list', () => {
	it('flags seems, tends to, relatively, and in some cases', () => {
		expect(matches('The bug seems to be in the parser. It tends to recur. Latency is relatively low, in some cases.', 'qualifier'))
			.toEqual(expect.arrayContaining(['seems', 'tends to', 'relatively', 'in some cases']));
	});
	it('names the significance announcements as hedges', () => {
		expect(matches('It is important to remember that the cache is shared.', 'qualifier'))
			.toContain('it is important to remember');
	});
});

describe('structural tells the markdown reveals', () => {
	it('flags a closing-summary heading', () => {
		const doc = '# Title\n\nBody text here.\n\n## Key Takeaways\n\nMore text.\n\n## Conclusion\n\nEnd.';
		const flags = of(doc, 'ai-tell').filter((f) => f.match === 'closing summary heading');
		expect(flags.map((f) => f.line)).toEqual([5, 9]);
	});

	it('leaves ordinary headings alone', () => {
		expect(of('# Install\n\n## Next steps\n\n## Summary of changes\n\nText.', 'ai-tell')).toEqual([]);
	});

	it('flags emoji outside code', () => {
		const flags = of('Ship it 🚀 today. Done ✅.\n\n`echo 🚀`', 'ai-tell')
			.filter((f) => f.match === 'emoji');
		expect(flags).toHaveLength(2);
		expect(of('Copyright © 2026. Temp 30°C.', 'ai-tell')).toEqual([]);
	});

	it('flags a run of bold-label bullets once', () => {
		const doc = '- **Kafka**: reuses the bus\n- **Rollout**: by region\n- **Metrics**: p99 under 100ms\n';
		const flags = of(doc, 'ai-tell').filter((f) => f.match === 'bold-label bullets');
		expect(flags).toHaveLength(1);
		expect(flags[0].line).toBe(1);
		expect(of('- **Kafka**: reuses the bus\n- plain item\n', 'ai-tell')).toEqual([]);
	});
});

describe('grammar tier: mechanics a pattern can prove', () => {
	for (const [text, hint] of [
		['Its now planned for the the next quarter.', 'use "the"'],
		['Its now planned for next quarter.', 'use "it\'s"'],
		['Their are two rollback paths.', 'use "there"'],
		['We could of shipped earlier.', 'use "could have"'],
		['Alot of users complained.', 'use "a lot"'],
		['The config is seperate from the code.', 'use "separate"'],
		['The error occured twice.', 'use "occurred"'],
	]) {
		it(`${hint}: ${text}`, () => {
			expect(of(text, 'grammar').map((f) => f.hint)).toContain(hint);
		});
	}

	it('gives the doubled word its own span and line', () => {
		const { flags } = checkText('Fine line.\nRun the the job.');
		const g = flags.find((f) => f.category === 'grammar');
		expect(g.line).toBe(2);
		expect(g.match).toBe('the the');
	});

	it('leaves grammatical doubles and quoted errors alone', () => {
		expect(of('What she had had was enough. I know that that is true.', 'grammar')).toEqual([]);
		expect(of('The log said "Their are two paths" verbatim.', 'grammar')).toEqual([]);
		expect(of('The cat licked its paw. Its own key is set.', 'grammar')).toEqual([]);
	});

	it('counts grammar findings in the stats line', () => {
		expect(checkText('Their are two.').stats.grammar).toBe(1);
		expect(checkText('There are two.').stats.grammar).toBe(0);
	});

});

describe('grammar tier: the doubles English allows', () => {
	for (const text of [
		'Log in in a new tab.', 'The fan turns on on boot.', 'What it is is a race condition.',
		'Is this this week\'s build?', 'Press a a second time.', 'He might of course object.',
		'The server takes its time. The cache is, by its very nature, stale.',
	]) {
		it(`leaves alone: ${text}`, () => {
			expect(of(text, 'grammar')).toEqual([]);
		});
	}
	it('still catches the real doubles', () => {
		expect(matches('It is the the plan, and and so on.', 'grammar')).toEqual(['the the', 'and and']);
	});
});

describe('nominalizations with "an"', () => {
	it('catches reached an agreement', () => {
		expect(of('They reached an agreement on the design.', 'weak-verb')[0].hint).toContain('"agree"');
	});
});
