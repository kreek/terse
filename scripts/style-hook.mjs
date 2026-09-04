#!/usr/bin/env node
// PostToolUse hook: after Claude writes or edits a markdown file, run the
// checker on it and feed the flags back into the session as tool feedback.
// The leading grammar assistants win on presence; this is Terse's answer.
// Opt in by setting TERSE_HOOK=1 (for example in settings.json "env").
// A Write reports the whole file. An Edit reports only the flags inside the
// inserted text, so one changed line in a legacy document does not replay
// every old finding. The project's .terse/config.json applies.
// Exit 0 is silence; exit 2 returns stderr to Claude without blocking.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { checkDocument, loadConfig } from './style-check.mjs';

const MAX_REPORTED = 20;

function readStdin() {
	try {
		return readFileSync(0, 'utf8');
	} catch {
		return '';
	}
}

// Flags whose span overlaps the inserted text. The whole file is checked so
// sentence boundaries and quotes resolve; only the report is narrowed. The
// hook never sees the pre-edit file, so when the inserted text occurs more
// than once every occurrence counts. A deletion inserted nothing and reports
// nothing. When the text cannot be found (the file moved on), the whole
// file reports.
function inserted(flags, raw, newString) {
	if (typeof newString !== 'string') return flags;
	if (newString.length === 0) return [];
	const ranges = [];
	for (let at = raw.indexOf(newString); at >= 0; at = raw.indexOf(newString, at + 1)) {
		ranges.push([at, at + newString.length]);
	}
	if (ranges.length === 0) return flags;
	return flags.filter((f) => !f.span ||
		ranges.some(([start, end]) => f.span[0] < end && f.span[1] > start));
}

export async function hookReport(payload) {
	const input = payload?.tool_input;
	const filePath = input?.file_path;
	if (!filePath || !/\.(?:md|markdown)$/i.test(filePath)) return null;
	let raw;
	try {
		raw = readFileSync(filePath, 'utf8');
	} catch {
		return null;
	}
	const config = loadConfig(filePath);
	const all = (await checkDocument(raw, { ...config, file: filePath })).flags;
	const flags = inserted(all, raw, input.new_string);
	if (flags.length === 0) return null;
	const lines = flags.slice(0, MAX_REPORTED).map((f) =>
		`${f.file}:${f.line}  [${f.category}] "${f.match}" - ${f.hint}`);
	if (flags.length > MAX_REPORTED) {
		lines.push(`...and ${flags.length - MAX_REPORTED} more`);
	}
	lines.push(`terse: ${flags.length} flag(s) in ${filePath}; fix them, or ` +
		'keep them with a reason per the style skill (quotes, ' +
		'<!-- terse-ignore --> paragraphs, and .terse/config.json ignores ' +
		'are already exempt)');
	return lines.join('\n');
}

async function main() {
	if (process.env.TERSE_HOOK !== '1') process.exit(0);
	let payload;
	try {
		payload = JSON.parse(readStdin());
	} catch {
		process.exit(0);
	}
	let report;
	try {
		report = await hookReport(payload);
	} catch (err) {
		console.error(`terse: ${err.message}`);
		process.exit(2);
	}
	if (report === null) process.exit(0);
	console.error(report);
	process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((err) => {
		console.error(`terse: ${err.message}`);
		process.exitCode = 2;
	});
}
