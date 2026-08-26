#!/usr/bin/env node
// Runs Terse after either host writes Markdown and returns findings as
// PostToolUse feedback. The hook is inert unless TERSE_HOOK=1.
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { checkText } from './style-check.mjs';

const MAX_REPORTED = 20;
const MARKDOWN_PATH = /\.(?:md|markdown)$/i;
const PATCH_PATH = /^\*\*\* (?:Add File|Update File|Move to): (.+)$/gm;

function readStdin() {
	try {
		return readFileSync(0, 'utf8');
	} catch {
		return '';
	}
}

function parsePayload(raw) {
	try {
		const payload = JSON.parse(raw);
		return payload && typeof payload === 'object' ? payload : null;
	} catch {
		return null;
	}
}

function patchPaths(command) {
	if (typeof command !== 'string') return [];
	return [...command.matchAll(PATCH_PATH)].map((match) => match[1].trim());
}

function inputPaths(payload) {
	const input = payload?.tool_input;
	if (!input || typeof input !== 'object') return [];
	const claudePath = typeof input.file_path === 'string' ? [input.file_path] : [];
	return [...claudePath, ...patchPaths(input.command)];
}

function resolveMarkdownPaths(payload) {
	const cwd = typeof payload?.cwd === 'string' ? payload.cwd : process.cwd();
	const paths = inputPaths(payload)
		.map((path) => path.trim())
		.filter((path) => path && !path.includes('\0') && MARKDOWN_PATH.test(path))
		.map((path) => isAbsolute(path) ? resolve(path) : resolve(cwd, path));
	return [...new Set(paths)];
}

function collectFlags(paths) {
	const flags = [];
	const checked = [];
	for (const file of paths) {
		try {
			flags.push(...checkText(readFileSync(file, 'utf8'), { file }).flags);
			checked.push(file);
		} catch {
			// A moved source or unreadable file is irrelevant after the edit.
		}
	}
	return { flags, checked };
}

function formatFeedback(flags, checked) {
	const lines = flags.slice(0, MAX_REPORTED).map((flag) =>
		`${flag.file}:${flag.line}  [${flag.category}] "${flag.match}" - ${flag.hint}`);
	if (flags.length > MAX_REPORTED) {
		lines.push(`...and ${flags.length - MAX_REPORTED} more`);
	}
	lines.push(`terse: ${flags.length} flag(s) in ${checked.length} file(s); fix them, ` +
		'or keep them with a reason per the style skill (quotes and ' +
		'<!-- terse-ignore --> lines are already exempt)');
	return lines.join('\n');
}

if (process.env.TERSE_HOOK !== '1') process.exit(0);

const payload = parsePayload(readStdin());
if (!payload) process.exit(0);

const paths = resolveMarkdownPaths(payload);
if (paths.length === 0) process.exit(0);

const { flags, checked } = collectFlags(paths);
if (flags.length === 0) process.exit(0);

console.error(formatFeedback(flags, checked));
process.exit(2);
