#!/usr/bin/env node
// PostToolUse hook: after an agent writes or edits Markdown, run the checker
// and return the flags as tool feedback. A full-file write reports the whole
// file. An edit reports only findings that overlap added text, so one changed
// line in a legacy document does not replay every old finding. The project's
// .terse/config.json applies. Exit 0 is silence; exit 2 returns feedback.
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
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
function inserted(flags, raw, fragments) {
	if (!Array.isArray(fragments)) return flags;
	const additions = fragments.filter((value) => typeof value === 'string' && value.length > 0);
	if (additions.length === 0) return [];
	const ranges = [];
	for (const addition of additions) {
		for (let at = raw.indexOf(addition); at >= 0; at = raw.indexOf(addition, at + 1)) {
			ranges.push([at, at + addition.length]);
		}
	}
	if (ranges.length === 0) return flags;
	return flags.filter((f) => !f.span ||
		ranges.some(([start, end]) => f.span[0] < end && f.span[1] > start));
}

function addTarget(targets, target, added) {
	if (!target || target.action === 'Delete') return;
	if (target.action === 'Update') target.fragments = [...added];
	targets.push(target);
}

function patchTargets(command, cwd) {
	if (typeof command !== 'string') return [];
	const targets = [];
	let target = null;
	let added = [];
	for (const line of command.split(/\r?\n/)) {
		const header = /^\*\*\* (Add|Update|Delete) File: (.+)$/.exec(line);
		if (header) {
			addTarget(targets, target, added);
			target = { action: header[1], displayPath: header[2].trim() };
			added = [];
			continue;
		}
		const move = /^\*\*\* Move to: (.+)$/.exec(line);
		if (move && target) target.displayPath = move[1].trim();
		if (target?.action === 'Update' && line.startsWith('+')) added.push(line.slice(1));
	}
	addTarget(targets, target, added);
	return targets.map((item) => ({
		...item,
		filePath: isAbsolute(item.displayPath) ? item.displayPath : resolve(cwd, item.displayPath),
	}));
}

function hookTargets(payload) {
	const input = payload?.tool_input;
	if (typeof input?.file_path === 'string' && input.file_path.length > 0) {
		const cwd = typeof payload.cwd === 'string' ? payload.cwd : process.cwd();
		return [{
			displayPath: input.file_path,
			filePath: isAbsolute(input.file_path) ? input.file_path : resolve(cwd, input.file_path),
			fragments: payload.tool_name === 'Edit' ? [input.new_string] : undefined,
		}];
	}
	if (payload?.tool_name !== 'apply_patch') return [];
	const cwd = typeof payload.cwd === 'string' ? payload.cwd : process.cwd();
	return patchTargets(input?.command, cwd);
}

async function checkTarget(target) {
	if (!/\.(?:md|markdown)$/i.test(target.displayPath)) return null;
	let raw;
	try {
		raw = readFileSync(target.filePath, 'utf8');
	} catch {
		return null;
	}
	const config = loadConfig(target.filePath);
	const all = (await checkDocument(raw, { ...config, file: target.displayPath })).flags;
	return { ...target, flags: inserted(all, raw, target.fragments) };
}

function formatReport(results) {
	const flags = results.flatMap((result) => result.flags);
	if (flags.length === 0) return null;
	const lines = flags.slice(0, MAX_REPORTED).map((f) =>
		`${f.file}:${f.line}  [${f.category}] "${f.match}" - ${f.hint}`);
	if (flags.length > MAX_REPORTED) {
		lines.push(`...and ${flags.length - MAX_REPORTED} more`);
	}
	for (const result of results.filter((item) => item.flags.length > 0)) {
		lines.push(`terse: ${result.flags.length} flag(s) in ${result.displayPath}`);
	}
	lines.push('Fix them, or keep them with a reason per the style skill (quotes, ' +
		'<!-- terse-ignore --> paragraphs, and .terse/config.json ignores are already exempt).');
	return lines.join('\n');
}

export async function hookReport(payload) {
	const checked = await Promise.all(hookTargets(payload).map(checkTarget));
	return formatReport(checked.filter(Boolean));
}

async function main() {
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
