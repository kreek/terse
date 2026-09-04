// Proves quote extraction, source verification, safe fetching, and the CLI contract.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { checkQuotes, extractQuotes, findSourceLink, normalizeQuote,
	quoteAppearsIn, htmlToText, buildTextFragmentUrl }
	from '../scripts/quote-check.mjs';
import { fetchPublicText, isPublicAddress } from '../scripts/public-fetch.mjs';

const FIXTURES = join(import.meta.dirname, 'fixtures', 'quotes');
const SCRIPT = join(import.meta.dirname, '..', 'scripts', 'quote-check.mjs');
const run = (...args) =>
	spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

const LONG_QUOTE = 'short sentences carry the reader further than long ' +
	'ones in every genre tested';

describe('extractQuotes', () => {
	it('skips scare quotes and short quoted terms', () => {
		const quotes = extractQuotes('The so-called "fast path" is slow.');
		expect(quotes).toEqual([]);
	});

	it('captures an inline quotation of eight or more words', () => {
		const quotes = extractQuotes(`He said "${LONG_QUOTE}" and left.`);
		expect(quotes).toHaveLength(1);
		expect(quotes[0].kind).toBe('inline');
		expect(quotes[0].text).toBe(LONG_QUOTE);
	});

	it('captures curly-quoted spans', () => {
		const quotes = extractQuotes(`He said “${LONG_QUOTE}” and left.`);
		expect(quotes).toHaveLength(1);
		expect(normalizeQuote(quotes[0].text)).toBe(LONG_QUOTE);
	});

	it('captures a blockquote and drops its attribution line', () => {
		const quotes = extractQuotes(
			'> Use short sentences.\n> Use short first paragraphs.\n> — the Star\n');
		expect(quotes).toHaveLength(1);
		expect(quotes[0].kind).toBe('blockquote');
		expect(normalizeQuote(quotes[0].text))
			.toBe('Use short sentences. Use short first paragraphs.');
	});

	it('never reads code fences as quotations', () => {
		const quotes = extractQuotes(
			'```\n"' + LONG_QUOTE + '"\n```\n');
		expect(quotes).toEqual([]);
	});
});

describe('normalizeQuote', () => {
	it('maps curly quote marks to straight ones', () => {
		expect(normalizeQuote('‘a’ “b”')).toBe("'a' \"b\"");
	});

	it('collapses whitespace runs, NBSP and newlines included', () => {
		expect(normalizeQuote('a b\n  c\t d')).toBe('a b c d');
	});

	it('changes nothing else: case and punctuation stay', () => {
		expect(normalizeQuote('The Cache, holds.')).toBe('The Cache, holds.');
	});
});

describe('quoteAppearsIn', () => {
	const source = 'He wrote: “the cache holds every entry for an hour, ' +
		'and the reader pays for every word kept beyond that.”';

	it('accepts a verbatim quote across quote-mark styles', () => {
		expect(quoteAppearsIn(
			'the cache holds every entry for an hour', source)).toBe(true);
	});

	it('rejects a quote with one changed word', () => {
		expect(quoteAppearsIn(
			'the cache holds every entry for a day', source)).toBe(false);
	});

	it('accepts an ordered [...] elision', () => {
		expect(quoteAppearsIn(
			'the cache holds every entry [...] for every word kept beyond that.',
			source)).toBe(true);
	});

	it('rejects an out-of-order elision', () => {
		expect(quoteAppearsIn(
			'the reader pays for every word [...] the cache holds every entry',
			source)).toBe(false);
	});

	it('rejects an elision segment under three words', () => {
		expect(quoteAppearsIn('the cache [...] beyond that.', source)).toBe(false);
	});
});

describe('htmlToText', () => {
	it('drops scripts, styles, comments, and tags', () => {
		const text = htmlToText('<style>p{}</style><p>keep</p>' +
			'<script>drop()</script><!-- drop -->');
		expect(text).toContain('keep');
		expect(text).not.toContain('drop');
		expect(text).not.toContain('p{}');
	});

	it('decodes the common and numeric entities', () => {
		expect(normalizeQuote(htmlToText('a&nbsp;&amp;&nbsp;b &#8217; &#x27;')))
			.toBe("a & b ' '");
	});

	it('leaves invalid numeric entities intact instead of crashing', () => {
		expect(htmlToText('keep &#999999999; and &#xD800;'))
			.toBe('keep &#999999999; and &#xD800;');
	});
});

describe('public source fetch boundary', () => {
	it.each([
		['127.0.0.1', 4], ['10.1.2.3', 4], ['169.254.169.254', 4],
		['192.168.1.2', 4], ['::1', 6], ['fd00:ec2::254', 6], ['fec0::1', 6],
	])('blocks private or metadata address %s', (address, family) => {
		expect(isPublicAddress(address, family)).toBe(false);
	});

	it('allows a public address', () => {
		expect(isPublicAddress('93.184.216.34', 4)).toBe(true);
	});

	it('refuses a private resolution before making a request', async () => {
		let requested = false;
		const resolveHost = async () => [{ address: '127.0.0.1', family: 4 }];
		const requestHop = async () => { requested = true; return { body: 'no' }; };
		await expect(fetchPublicText('http://source.test/quote', 1000,
			{ resolveHost, requestHop })).rejects.toThrow('refused private source');
		expect(requested).toBe(false);
	});

	it('validates a redirect before following it', async () => {
		let requests = 0;
		const resolveHost = async (host) => [{
			address: host === 'public.test' ? '93.184.216.34' : '127.0.0.1',
			family: 4,
		}];
		const requestHop = async () => {
			requests++;
			return { redirect: 'https://localhost/private' };
		};
		await expect(fetchPublicText('https://public.test/source', 1000,
			{ resolveHost, requestHop })).rejects.toThrow('refused private source');
		expect(requests).toBe(1);
	});

	it('refuses an HTTPS-to-HTTP redirect', async () => {
		const resolveHost = async () => [{ address: '93.184.216.34', family: 4 }];
		const requestHop = async () => ({ redirect: 'http://public.test/plain' });
		await expect(fetchPublicText('https://public.test/source', 1000,
			{ resolveHost, requestHop })).rejects.toThrow('downgrade');
	});

	it('rejects an invalid timeout at the public boundary', async () => {
		await expect(fetchPublicText('https://public.test/source', 0))
			.rejects.toThrow('positive number');
	});
});

describe('buildTextFragmentUrl', () => {
	it('uses the whole quote when it is short', () => {
		expect(buildTextFragmentUrl('https://x.test/a', 'one two three'))
			.toBe('https://x.test/a#:~:text=one%20two%20three');
	});

	it('uses the start,end form for long quotes and encodes dashes', () => {
		const url = buildTextFragmentUrl('https://x.test/a#old',
			'a-1 b c d e f g h i j k l m end');
		expect(url).toBe(
			'https://x.test/a#:~:text=a%2D1%20b%20c%20d,k%20l%20m%20end');
	});
});

describe('findSourceLink', () => {
	it('finds the link in the quote paragraph', () => {
		const raw = `He said "${LONG_QUOTE}", per the [survey](https://x.test/s).`;
		const [q] = extractQuotes(raw);
		expect(findSourceLink(raw, q).url).toBe('https://x.test/s');
	});

	it('prefers a fragment link that overlaps the quote over a nearer one', () => {
		const raw = `He said "${LONG_QUOTE}" in [a](https://x.test/a) and ` +
			'[b](https://x.test/b#:~:text=carry%20the%20reader%20further).';
		const [q] = extractQuotes(raw);
		expect(findSourceLink(raw, q).url)
			.toBe('https://x.test/b#:~:text=carry%20the%20reader%20further');
	});

	it('returns null when the paragraph has no link', () => {
		const raw = `He said "${LONG_QUOTE}" and left.\n\nA [far link](https://x.test).`;
		const [q] = extractQuotes(raw);
		expect(findSourceLink(raw, q)).toBeNull();
	});

	it('lets a blockquote take its link from the next paragraph', () => {
		const raw = '> Use short sentences. Use short first paragraphs.\n\n' +
			'From the [style sheet](https://x.test/star).';
		const [q] = extractQuotes(raw);
		expect(findSourceLink(raw, q).url).toBe('https://x.test/star');
	});
});

describe('checkQuotes with an injected fetcher', () => {
	const doc = `He said "${LONG_QUOTE}", per the [survey](https://x.test/s).`;

	it('verifies against fetched text and flags the plain link', async () => {
		const fetchText = async () => `Intro. ${LONG_QUOTE}. Outro.`;
		const { flags, stats } = await checkQuotes(doc, { fetchText });
		expect(stats).toEqual({ quotes: 1, verified: 1 });
		expect(flags).toHaveLength(1);
		expect(flags[0].category).toBe('quote-link-plain');
		expect(flags[0].hint).toContain('#:~:text=');
	});

	it('marks a fetch failure unverified with the cause, never an error', async () => {
		const fetchText = async () => { throw new Error('HTTP 503'); };
		const { flags } = await checkQuotes(doc, { fetchText });
		expect(flags).toHaveLength(1);
		expect(flags[0].category).toBe('quote-unverified');
		expect(flags[0].hint).toContain('HTTP 503');
	});

	it('marks offline sources unverified without calling the fetcher', async () => {
		let called = false;
		const fetchText = async () => { called = true; return ''; };
		const { flags } = await checkQuotes(doc, { fetchText, offline: true });
		expect(called).toBe(false);
		expect(flags[0].category).toBe('quote-unverified');
		expect(flags[0].hint).toContain('offline');
	});

	it('marks a quote the source lacks as unverified', async () => {
		const fetchText = async () => 'Entirely unrelated text.';
		const { flags } = await checkQuotes(doc, { fetchText });
		expect(flags[0].category).toBe('quote-unverified');
		expect(flags[0].hint).toContain('verbatim');
	});

	it('fetches one source once for many quotes', async () => {
		let calls = 0;
		const fetchText = async () => { calls++; return LONG_QUOTE; };
		const two = `${doc}\n\n${doc}`;
		await checkQuotes(two, { fetchText });
		expect(calls).toBe(1);
	});

	it('honors terse-ignore for a named category', async () => {
		const fetchText = async () => LONG_QUOTE;
		const ignored = '<!-- terse-ignore: quote-link-plain -->\n' + doc;
		const { flags } = await checkQuotes(ignored, { fetchText });
		expect(flags).toEqual([]);
	});
});

describe('CLI contract', () => {
	it('clean file: exit 0 with evidence work happened', () => {
		const f = join(FIXTURES, 'clean.md');
		const r = run(f);
		expect(r.status).toBe(0);
		expect(r.stdout).toContain('quote-check: clean');
		expect(r.stdout).toContain(`${f}: 1 quote(s), 1 verified`);
	});

	it('findings: exit 1 with the seeded categories', () => {
		const f = join(FIXTURES, 'doc.md');
		const r = run(f);
		expect(r.status).toBe(1);
		expect(r.stdout.match(/\[quote-unverified\]/g)).toHaveLength(2);
		expect(r.stdout.match(/\[quote-unsourced\]/g)).toHaveLength(1);
		expect(r.stdout).toContain(`${f}: 5 quote(s), 2 verified`);
		expect(r.stdout).toMatch(/quote-check: \d+ flag\(s\)/);
	});

	it('--offline: a web-sourced quote is a finding, exit 1', () => {
		const r = run('--offline', join(FIXTURES, 'offline.md'));
		expect(r.status).toBe(1);
		expect(r.stdout).toContain('[quote-unverified]');
		expect(r.stdout).toContain('offline: source not fetched');
	});

	it('--json round-trips the findings contract shape', () => {
		const r = run('--json', join(FIXTURES, 'doc.md'));
		const results = JSON.parse(r.stdout);
		expect(results).toHaveLength(1);
		expect(results[0].stats).toEqual({ quotes: 5, verified: 2 });
		for (const f of results[0].flags) {
			expect(f).toMatchObject({
				file: expect.any(String), line: expect.any(Number),
				category: expect.any(String), match: expect.any(String),
				hint: expect.any(String) });
			expect(f.span).toHaveLength(2);
		}
	});

	it('unreadable file: exit 2, never 0 or 1', () => {
		const r = run(join(FIXTURES, 'no-such-file.md'));
		expect(r.status).toBe(2);
		expect(r.stderr).toContain('cannot read');
	});

	it('unknown flag or bad timeout: exit 2 usage', () => {
		for (const r of [run('--bogus', 'x.md'),
				run('x.md', '--timeout', 'soon'), run('x.md', '--timeout', '0'), run()]) {
			expect(r.status).toBe(2);
			expect(r.stderr).toContain('usage:');
		}
	});
});
