#!/usr/bin/env node
// Terse's quote verifier: find each quotation and its nearby source link,
// fetch the source, and prove the quote appears verbatim. Normalizes only
// whitespace and quote marks. Deterministic; the network is the one
// dependency, and --offline removes it (unfetched quotes stay findings).
// Usage: node quote-check.mjs <file...> [--offline] [--timeout <ms>] [--json]
// Exit contract, shared with style-check: 0 clean, 1 findings, 2 error.
// A fetch failure is a finding (the quote is unproven), never an error.
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { stripMarkdown, quotedRanges, collectSuppressions, isSuppressed }
	from './style-check.mjs';
import { fetchPublicText } from './public-fetch.mjs';

// Scare quotes and quoted terms stay silent: an inline quotation is
// checkable only from this many words. A blockquote is an explicit
// quotation signal, so it has no minimum.
const MIN_QUOTE_WORDS = 8;
const DEFAULT_TIMEOUT_MS = 10000;

function wordsIn(text) {
	return (text.match(/[\p{L}\p{N}’':.-]+/gu) || [])
		.filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

// Same shape as style-check's private line index.
function makeLineIndex(text) {
	const newlines = [];
	for (let i = 0; i < text.length; i++) if (text[i] === '\n') newlines.push(i);
	return (offset) => {
		let lo = 0, hi = newlines.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (newlines[mid] < offset) lo = mid + 1;
			else hi = mid;
		}
		return lo + 1;
	};
}

/** Normalize only Unicode quote marks and whitespace for verbatim comparison. */
export function normalizeQuote(text) {
	return text.normalize('NFC')
		.replace(/[‘’‚‛]/g, "'")
		.replace(/[“”„‟]/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Extract checkable inline quotations and blockquotes from Markdown.
 * Offsets index the raw document; code and link URLs are excluded.
 */
export function extractQuotes(rawText) {
	const text = stripMarkdown(rawText);
	const quotes = [];
	for (const [a, b] of quotedRanges(text)) {
		const inner = text.slice(a + 1, b);
		if (wordsIn(inner) < MIN_QUOTE_WORDS) continue;
		quotes.push({ text: inner, span: [a, b + 1], kind: 'inline' });
	}
	const lines = text.split('\n');
	let offset = 0;
	let run = null;
	const flush = () => {
		if (run && wordsIn(run.text) > 0) quotes.push(run);
		run = null;
	};
	for (const line of lines) {
		const m = /^[ \t]*>[ \t]?(.*)$/.exec(line);
		if (m) {
			// an attribution line ("— Author") is not part of the quote
			const content = /^\s*(?:—|–|--)\s/.test(m[1]) ? '' : m[1];
			if (!run) run = { text: '', span: [offset, offset], kind: 'blockquote' };
			run.text += (run.text ? '\n' : '') + content;
			run.span[1] = offset + line.length;
		} else {
			flush();
		}
		offset += line.length + 1;
	}
	flush();
	return quotes;
}

/**
 * Find the nearest source link allowed for an extracted quote.
 * Text fragments that overlap the quote outrank plain nearby links.
 */
export function findSourceLink(rawText, quote) {
	const blocks = [];
	for (const m of rawText.matchAll(/[^\n][^]*?(?=\n[ \t]*\n|$)/g)) {
		blocks.push({ text: m[0], start: m.index, end: m.index + m[0].length });
	}
	const idx = blocks.findIndex((b) =>
		quote.span[0] >= b.start && quote.span[0] < b.end);
	if (idx < 0) return null;
	const from = quote.kind === 'blockquote' ? Math.max(0, idx - 1) : idx;
	const to = quote.kind === 'blockquote'
		? Math.min(blocks.length - 1, idx + 1) : idx;
	const links = [];
	for (let i = from; i <= to; i++) {
		const b = blocks[i];
		for (const m of b.text.matchAll(
				/\[[^\]]*\]\(([^()\s]+(?:\([^()]*\))?)\)/g)) {
			links.push({ url: m[1], index: b.start + m.index });
		}
		for (const m of b.text.matchAll(/<(https?:\/\/[^>\s]+)>/g)) {
			links.push({ url: m[1], index: b.start + m.index });
		}
	}
	if (links.length === 0) return null;
	const overlap = links.filter((l) => fragmentMatchesQuote(l.url, quote.text));
	const pool = overlap.length > 0 ? overlap : links;
	const mid = (quote.span[0] + quote.span[1]) / 2;
	pool.sort((x, y) => Math.abs(x.index - mid) - Math.abs(y.index - mid));
	return pool[0];
}

function fragmentMatchesQuote(url, quoteText) {
	const f = /#:~:text=([^&]*)/.exec(url);
	if (!f) return false;
	const parts = f[1].split(',');
	// text=[prefix-,]start[,end][,-suffix]: the start term is the first
	// part that is not a prefix (trailing -) or suffix (leading -)
	let start = parts.find((p) => !p.endsWith('-') && !p.startsWith('-')) ?? '';
	try { start = decodeURIComponent(start); } catch { return false; }
	return start !== '' && normalizeQuote(quoteText).toLowerCase()
		.includes(normalizeQuote(start).toLowerCase());
}

/** Convert HTML to deterministic plain text for verbatim quote matching. */
export function htmlToText(html) {
	return html
		.replace(/<script[\s\S]*?<\/script\s*>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style\s*>/gi, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&#(\d+);/g, (match, value) => decodeEntity(match, value, 10))
		.replace(/&#x([0-9a-f]+);/gi,
			(match, value) => decodeEntity(match, value, 16))
		.replace(/&nbsp;/g, ' ')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

function decodeEntity(match, value, radix) {
	const codePoint = Number.parseInt(value, radix);
	if (codePoint > 0x10ffff || codePoint >= 0xd800 && codePoint <= 0xdfff) {
		return match;
	}
	return String.fromCodePoint(codePoint);
}

/**
 * Return whether a quote occurs verbatim in source text.
 * Editorial elisions are allowed only between ordered three-word segments.
 */
export function quoteAppearsIn(quoteText, sourceText) {
	const src = normalizeQuote(sourceText);
	const segments = normalizeQuote(quoteText).split(/\[(?:\.\.\.|…)\]/);
	const elided = segments.length > 1;
	let pos = 0;
	for (const seg of segments) {
		const part = seg.trim();
		if (part === '' || (elided && wordsIn(part) < 3)) return false;
		const i = src.indexOf(part, pos);
		if (i < 0) return false;
		pos = i + part.length;
	}
	return true;
}

/** Build a text-fragment source URL that highlights the normalized quote. */
export function buildTextFragmentUrl(url, quoteText) {
	const words = normalizeQuote(quoteText).split(' ');
	const enc = (s) => encodeURIComponent(s).replace(/-/g, '%2D');
	const base = url.split('#')[0];
	if (words.length <= 12) return `${base}#:~:text=${enc(words.join(' '))}`;
	return `${base}#:~:text=${enc(words.slice(0, 4).join(' '))},` +
		enc(words.slice(-4).join(' '));
}

async function defaultFetchText(url, timeout) {
	return fetchPublicText(url, timeout);
}

function looksLikeHtml(text, path = '') {
	return /\.x?html?$/i.test(path.split('#')[0]) ||
		/^\s*(?:<!doctype\b|<html\b)/i.test(text) ||
		/<(?:body|p|article|main)[\s>]/i.test(text.slice(0, 2000));
}

async function resolveSource(url, dir,
		{ fetchText, offline, timeout, cache }) {
	const bare = url.split('#')[0];
	if (cache.has(bare)) return cache.get(bare);
	let out;
	if (/^https?:/i.test(bare)) {
		if (offline) {
			out = { ok: false,
				hint: `offline: source not fetched; verify against ${bare}` };
		} else {
			try {
				const body = await fetchText(bare, timeout);
				out = { ok: true, text: looksLikeHtml(body) ? htmlToText(body) : body };
			} catch (err) {
				out = { ok: false,
					hint: `could not fetch ${bare} (${err.message}); the quote is unproven` };
			}
		}
	} else {
		try {
			const path = bare.startsWith('file:')
				? fileURLToPath(bare)
				: resolve(dir, decodeURIComponent(bare));
			const body = readFileSync(path, 'utf8');
			out = { ok: true,
				text: looksLikeHtml(body, path) ? htmlToText(body) : body };
		} catch (err) {
			out = { ok: false,
				hint: `cannot read source ${bare}: ${err.code ?? err.message}` };
		}
	}
	cache.set(bare, out);
	return out;
}

function quoteLabel(text) {
	const cp = [...normalizeQuote(text)];
	return cp.slice(0, 40).join('') + (cp.length > 40 ? '...' : '');
}

/**
 * Check every material quote in one Markdown document.
 *
 * @returns {Promise<object>} Findings plus quote and verification counts.
 */
export async function checkQuotes(rawText, { file = '(text)', dir = '.',
		fetchText = defaultFetchText, offline = false,
		timeout = DEFAULT_TIMEOUT_MS } = {}) {
	const lineAt = makeLineIndex(stripMarkdown(rawText));
	const cache = new Map();
	const flags = [];
	const quotes = extractQuotes(rawText);
	let verified = 0;
	for (const q of quotes) {
		const at = { file, line: lineAt(q.span[0]), match: quoteLabel(q.text),
			span: q.span };
		const link = findSourceLink(rawText, q);
		if (!link) {
			flags.push({ ...at, category: 'quote-unsourced',
				hint: 'add a source link beside the quote; prefer a #:~:text= fragment URL' });
			continue;
		}
		const source = await resolveSource(link.url, dir,
			{ fetchText, offline, timeout, cache });
		if (!source.ok) {
			flags.push({ ...at, category: 'quote-unverified', hint: source.hint });
			continue;
		}
		if (!quoteAppearsIn(q.text, source.text)) {
			flags.push({ ...at, category: 'quote-unverified',
				hint: 'the quoted words are not in the source verbatim; re-copy them, or mark an elision with [...]' });
			continue;
		}
		verified++;
		if (/^https?:/i.test(link.url) && !link.url.includes('#:~:text=')) {
			flags.push({ ...at, category: 'quote-link-plain',
				hint: `the quote verifies; link it as ${buildTextFragmentUrl(link.url, q.text)}` });
		}
	}
	const suppressions = collectSuppressions(rawText);
	const kept = flags.filter((f) => !isSuppressed(suppressions, f));
	return { flags: kept, stats: { quotes: quotes.length, verified } };
}

async function main() {
	const args = process.argv.slice(2);
	const files = [];
	let json = false;
	let offline = false;
	let timeout = DEFAULT_TIMEOUT_MS;
	let badArg = false;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '--json') json = true;
		else if (a === '--offline') offline = true;
		else if (a === '--timeout') timeout = Number(args[++i]);
		else if (a.startsWith('--timeout=')) {
			timeout = a.length > 10 ? Number(a.slice(10)) : NaN;
		}
		else if (a.startsWith('--')) badArg = true;
		else files.push(a);
	}
	if (files.length === 0 || !Number.isFinite(timeout) || timeout <= 0 || badArg) {
		console.error('usage: node quote-check.mjs <file...> ' +
			'[--offline] [--timeout <ms>] [--json]');
		process.exit(2);
	}
	let total = 0;
	const results = [];
	for (const file of files) {
		let raw;
		try {
			raw = readFileSync(file, 'utf8');
		} catch (err) {
			console.error(`quote-check: cannot read ${file}: ${err.code ?? err.message}`);
			process.exit(2);
		}
		const { flags, stats } = await checkQuotes(raw,
			{ file, dir: dirname(resolve(file)), offline, timeout });
		total += flags.length;
		results.push({ file, flags, stats });
		if (json) continue;
		for (const f of flags) {
			console.log(`${f.file}:${f.line}  [${f.category}] "${f.match}" - ${f.hint}`);
		}
		console.log(`${file}: ${stats.quotes} quote(s), ${stats.verified} verified`);
	}
	if (json) console.log(JSON.stringify(results, null, 2));
	else console.log(total === 0 ? 'quote-check: clean' : `quote-check: ${total} flag(s)`);
	process.exit(total === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
