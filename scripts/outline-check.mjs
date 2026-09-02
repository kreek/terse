#!/usr/bin/env node
// Proves the arithmetic promises an approved outline makes: every section
// present, in order, under its budget, and the whole under the target.
// The outline file uses level-two headings for sections, `budget: N` on a
// line under each, and `target: N` anywhere above the first section.
// Usage: node outline-check.mjs <document.md> [--outline <file>] [--json]
// Exit 0 clean, 1 findings, 2 error. No dependencies, no network.
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { checkText } from './style-check.mjs';

const SECTION = /^ {0,3}##(?!#)[ \t]+(.*?)[ \t]*#*[ \t]*$/;

function normalize(heading) {
	return heading.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Level-two sections with their body text and the line they start on;
// text before the first section is the preamble.
function sections(text) {
	const out = [];
	let preamble = [];
	let current = null;
	let inFence = false;
	text.split('\n').forEach((line, i) => {
		if (/^ {0,3}(?:```|~~~)/.test(line)) inFence = !inFence;
		const m = !inFence && SECTION.exec(line);
		if (m) {
			current = { heading: m[1], key: normalize(m[1]), line: i + 1, body: [] };
			out.push(current);
		} else if (current) {
			current.body.push(line);
		} else {
			preamble.push(line);
		}
	});
	return { preamble: preamble.join('\n'), sections: out };
}

// `budget: 120` or `target: ~400` on its own line; prose that mentions a
// budget or a target does not count.
function numberAfter(label, text) {
	const m = new RegExp(`^[ \\t]*${label}\\s*:\\s*~?\\s*(\\d[\\d,]*)`, 'im').exec(text);
	return m ? Number(m[1].replace(/,/g, '')) : null;
}

function words(text) {
	return checkText(text).stats.words;
}

export function compareOutline(outlineText, docText, { file = '(document)' } = {}) {
	const plan = sections(outlineText);
	const doc = sections(docText);
	const findings = [];
	const finding = (line, match, hint) =>
		findings.push({ file, line, category: 'structure', match, hint });
	const docByKey = new Map(doc.sections.map((s) => [s.key, s]));
	const planKeys = plan.sections.map((s) => s.key);

	for (const p of plan.sections) {
		const d = docByKey.get(p.key);
		if (!d) {
			finding(1, `missing: ${p.heading}`, 'the approved outline promises this section');
			continue;
		}
		const budget = numberAfter('budget', p.body.join('\n'));
		const n = words(d.body.join('\n'));
		if (budget !== null && n > budget) {
			finding(d.line, `budget: ${p.heading}`,
				`${n} words over a budget of ${budget}; cut, or re-budget in the outline`);
		}
	}
	let expected = 0;
	for (const d of doc.sections) {
		const at = planKeys.indexOf(d.key);
		if (at < 0) {
			finding(d.line, `extra: ${d.heading}`,
				'not in the approved outline; record the addition there or cut it');
		} else if (at < expected) {
			finding(d.line, `order: ${d.heading}`, 'out of the outline\'s order');
		} else {
			expected = at;
		}
	}
	const target = numberAfter('target', plan.preamble);
	const total = words(docText);
	if (target !== null && total > target) {
		finding(1, 'target', `${total} words over a target of ${target}`);
	}
	return { findings, stats: { words: total, target, sections: doc.sections.length } };
}

function main() {
	const args = process.argv.slice(2);
	const json = args.includes('--json');
	const at = args.indexOf('--outline');
	const outlinePath = at >= 0 ? args[at + 1] : undefined;
	const file = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--outline')[0];
	if (!file || (at >= 0 && !outlinePath)) {
		console.error('usage: node outline-check.mjs <document.md> [--outline <file>] [--json]');
		process.exit(2);
	}
	const outline = outlinePath ?? file.replace(/\.md$/i, '-outline.md');
	if (outline === file) {
		console.error('outline-check: name the outline with --outline for a document not ending in .md');
		process.exit(2);
	}
	if (!existsSync(file) || !existsSync(outline)) {
		console.error(`outline-check: cannot read ${existsSync(file) ? outline : file}`);
		process.exit(2);
	}
	const result = compareOutline(readFileSync(outline, 'utf8'),
		readFileSync(file, 'utf8'), { file });
	if (json) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		for (const f of result.findings) {
			console.log(`${f.file}:${f.line}  [${f.category}] "${f.match}" - ${f.hint}`);
		}
		const { words: n, target, sections: count } = result.stats;
		console.log(`${file}: ${count} sections, ${n} words` +
			`${target !== null ? ` against a target of ${target}` : ''}`);
		console.log(result.findings.length === 0 ? 'outline-check: clean'
			: `outline-check: ${result.findings.length} finding(s)`);
	}
	process.exit(result.findings.length === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
