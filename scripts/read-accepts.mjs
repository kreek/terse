#!/usr/bin/env node
// Reads the verdicts out of a saved Terse review page: which flags the
// reviewer accepted, which they dismissed, which they left open. Emits
// JSON for the edit pass. The input is the page's HTML as a local file;
// for a published artifact, fetch the page and save it first.
// Usage: node read-accepts.mjs <page.html>
import { readFileSync } from 'node:fs';

const CARD_RE = /<article\s+class="card[^"]*"[^>]*>/g;

function attrsOf(tag) {
	const attrs = {};
	for (const m of tag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
		attrs[m[1]] = m[2] ?? '';
	}
	return attrs;
}

export function parseAccepts(html) {
	const dataMatch = html.match(
		/<script type="application\/json" id="flag-data">([\s\S]*?)<\/script>/);
	if (!dataMatch) throw new Error('no flag-data block; not a Terse review page');
	const flags = new Map(JSON.parse(dataMatch[1]).map((f) => [String(f.id), f]));
	const verdicts = { accepted: [], dismissed: [], open: [] };
	for (const m of html.matchAll(CARD_RE)) {
		const attrs = attrsOf(m[0]);
		const flag = flags.get(attrs['data-id']);
		if (!flag) continue;
		if ('data-accepted' in attrs) verdicts.accepted.push(flag);
		else if ('data-dismissed' in attrs) verdicts.dismissed.push(flag);
		else verdicts.open.push(flag);
	}
	const seen = verdicts.accepted.length + verdicts.dismissed.length +
		verdicts.open.length;
	if (seen !== flags.size) {
		throw new Error(`found ${seen} cards for ${flags.size} flags; page is damaged`);
	}
	return verdicts;
}

function main() {
	const file = process.argv[2];
	if (!file) {
		console.error('usage: node read-accepts.mjs <page.html>');
		process.exit(2);
	}
	let verdicts;
	try {
		verdicts = parseAccepts(readFileSync(file, 'utf8'));
	} catch (err) {
		console.error(`read-accepts: ${err.message}`);
		process.exit(2);
	}
	console.log(JSON.stringify(verdicts, null, 2));
	console.error(`read-accepts: ${verdicts.accepted.length} accepted, ` +
		`${verdicts.dismissed.length} dismissed, ${verdicts.open.length} open`);
}

if (process.argv[1] && import.meta.url.endsWith('read-accepts.mjs') &&
	process.argv[1].endsWith('read-accepts.mjs')) main();
