// Loads and applies the deterministic regex graders shared by eval run and score.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Parse the small frontmatter subset used by Terse eval files. */
export function parseFrontmatter(text) {
	const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) return { meta: {}, body: text };
	const meta = {};
	for (const line of match[1].split('\n')) {
		const pair = line.match(/^(\w+):\s*(.*)$/);
		if (pair) meta[pair[1]] = pair[2].trim();
	}
	return { meta, body: match[2].trim() };
}

/** Load every grader definition from one case's graders directory. */
export function loadGraders(dir) {
	return readdirSync(dir).map((file) => {
		const parsed = parseFrontmatter(readFileSync(join(dir, file), 'utf8'));
		return { name: file.replace(/\.md$/, ''), ...parsed.meta };
	});
}

function toRegex(pattern) {
	let source = pattern.replace(/^"|"$/g, '').replace(/\\\\/g, '\\');
	let flags = '';
	const inlineFlags = source.match(/^\(\?([is]+)\)/);
	if (inlineFlags) {
		source = source.slice(inlineFlags[0].length);
		flags = [...new Set(inlineFlags[1])].join('');
	}
	return new RegExp(source, flags);
}

/** Apply every regex grader to an embedded produced-file map. */
export function gradeRegexGraders(graders, files) {
	return graders.filter((grader) => grader.type === 'regex').map((grader) => {
		const path = (grader.target ?? '').match(/path:\s*([\w.-]+)/)?.[1];
		const content = path ? files[path] : Object.values(files).join('\n');
		if (content === undefined) {
			return { name: grader.name, type: grader.type, scored: true, pass: false,
				note: `missing file ${path}` };
		}
		const hit = toRegex(grader.pattern).test(content);
		const pass = (grader.match ?? 'contains').trim() === 'not_contains' ? !hit : hit;
		return { name: grader.name, type: grader.type, scored: true, pass };
	});
}
