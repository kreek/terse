#!/usr/bin/env node
// PostToolUse hook: after Claude writes or edits a markdown file, run the
// checker on it and feed the flags back into the session as tool feedback.
// The leading grammar assistants win on presence; this is Terse's answer.
// Opt in by setting TERSE_HOOK=1 (for example in settings.json "env").
// Exit 0 is silence; exit 2 returns stderr to Claude without blocking.
import { readFileSync } from 'node:fs';
import { checkText } from './style-check.mjs';

const MAX_REPORTED = 20;

function readStdin() {
	try {
		return readFileSync(0, 'utf8');
	} catch {
		return '';
	}
}

if (process.env.TERSE_HOOK !== '1') process.exit(0);

let filePath;
try {
	filePath = JSON.parse(readStdin())?.tool_input?.file_path;
} catch {
	process.exit(0);
}
if (!filePath || !/\.(?:md|markdown)$/i.test(filePath)) process.exit(0);

let raw;
try {
	raw = readFileSync(filePath, 'utf8');
} catch {
	process.exit(0);
}

const { flags } = checkText(raw, { file: filePath });
if (flags.length === 0) process.exit(0);

const lines = flags.slice(0, MAX_REPORTED).map((f) =>
	`${f.file}:${f.line}  [${f.category}] "${f.match}" - ${f.hint}`);
if (flags.length > MAX_REPORTED) {
	lines.push(`...and ${flags.length - MAX_REPORTED} more`);
}
lines.push(`terse: ${flags.length} flag(s) in ${filePath}; fix them, or ` +
	'keep them with a reason per the style skill (quotes and ' +
	'<!-- terse-ignore --> lines are already exempt)');
console.error(lines.join('\n'));
process.exit(2);
