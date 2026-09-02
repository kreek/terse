#!/usr/bin/env node
// Renders a checked document as a read-only highlight preview: category
// chips and stats at the top, washes for longer passages and underlines
// for word-level fixes in the text, the hint on hover. Visualization
// only; fixes are requested in chat ("fix all", "fix only AI tells").
// No dependencies, no network.
// Usage: node render-highlights.mjs <file> [--out page.html] [--max-grade N]
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { checkText } from './style-check.mjs';

const CATEGORIES = {
	'very-hard-sentence': 'Very hard sentence',
	'hard-sentence': 'Hard sentence',
	'long-opening': 'Long opening',
	aside: 'Aside',
	'ai-tell': 'AI tell',
	'passive-voice': 'Passive voice',
	adverb: 'Adverb',
	qualifier: 'Qualifier',
	'simpler-alternative': 'Wordy',
	'weak-verb': 'Weak verb',
	preference: 'Wish, not requirement',
	'personal-pronoun': 'Personal pronoun',
	'em-dash': 'Em dash',
	grammar: 'Grammar',
};

// Channel by extent: a short span reads as "change this word" and gets an
// underline; a long span reads as "rework this passage" and gets a wash.
const ALWAYS_WASH = new Set(['hard-sentence', 'very-hard-sentence', 'aside',
	'long-opening']);
const WASH_CHARS = 40;

function channelOf(flag) {
	if (ALWAYS_WASH.has(flag.category)) return 'w';
	const len = flag.span ? flag.span[1] - flag.span[0] : 0;
	return len >= WASH_CHARS ? 'w' : 'u';
}

function escapeHtml(s) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
		.replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function paintSpan(charFlags, span, id) {
	for (let i = span[0]; i < Math.min(span[1], charFlags.length); i++) {
		charFlags[i].push(id);
	}
}

function buildRuns(text, flags) {
	const charFlags = Array.from({ length: text.length }, () => []);
	flags.forEach((f, id) => { if (f.span) paintSpan(charFlags, f.span, id); });
	const runs = [];
	let start = 0;
	for (let i = 1; i <= text.length; i++) {
		const same = i < text.length &&
			charFlags[i].join(',') === charFlags[start].join(',');
		if (same) continue;
		runs.push({ text: text.slice(start, i), ids: charFlags[start] });
		start = i;
	}
	return runs;
}

function runHtml(run, flags) {
	const inner = escapeHtml(run.text);
	if (run.ids.length === 0) return inner;
	const cats = [...new Set(run.ids.map((id) => flags[id].category))];
	const channels = [...new Set(run.ids.map((id) =>
		`${channelOf(flags[id])}-${flags[id].category}`))];
	const tip = run.ids.map((id) =>
		`${CATEGORIES[flags[id].category] ?? flags[id].category}: ${flags[id].hint}`)
		.join('\n');
	return `<mark class="${cats.join(' ')} ${channels.join(' ')}" ` +
		`title="${escapeHtml(tip)}">${inner}</mark>`;
}

// Renders markdown structure around the marks. The marked text preserves
// the document's characters, so headings, fences, lists, bold, links, and
// inline code are transformed after highlighting. Marks never cross blank
// lines (sentence spans stop at block boundaries), so block splitting
// cannot tear one.
function inlineMd(s) {
	return s
		.replace(/`([^`\n]+)`/g, '<code>$1</code>')
		.replace(/\*\*((?:[^*]|\*(?!\*))+)\*\*/g, '<strong>$1</strong>')
		.replace(/\[((?:[^\]]|<[^>]+>)*)\]\(([^)\s]*(?:\([^)]*\)[^)\s]*)*)\)/g,
			'<a href="$2">$1</a>');
}

function blockHtml(block) {
	const text = block.join('\n');
	const heading = /^(#{1,4})\s+(.*)$/.exec(block[0]);
	if (block.length === 1 && heading) {
		const level = heading[1].length;
		return `<h${level}>${inlineMd(heading[2])}</h${level}>`;
	}
	if (block[0].startsWith('```')) {
		return `<pre>${block.slice(1, block[block.length - 1].startsWith('```')
			? -1 : undefined).join('\n')}</pre>`;
	}
	if (block.every((l) => /^\s*-\s+/.test(l))) {
		const items = block.map((l) =>
			`<li>${inlineMd(l.replace(/^\s*-\s+/, ''))}</li>`);
		return `<ul>\n${items.join('\n')}\n</ul>`;
	}
	return `<p>${inlineMd(text)}</p>`;
}

function renderMarkdown(marked) {
	const blocks = [];
	let current = [];
	let inFence = false;
	for (const line of marked.split('\n')) {
		if (line.startsWith('```')) inFence = !inFence;
		if (line.trim() === '' && !inFence) {
			if (current.length) blocks.push(current);
			current = [];
			continue;
		}
		current.push(line);
	}
	if (current.length) blocks.push(current);
	return blocks.map(blockHtml).join('\n');
}

function chipsHtml(flags) {
	const counts = {};
	for (const f of flags) counts[f.category] = (counts[f.category] ?? 0) + 1;
	const chips = Object.entries(CATEGORIES)
		.filter(([cat]) => counts[cat])
		.map(([cat, label]) => `<button class="chip ${cat}" data-cat="${cat}" ` +
			`aria-pressed="false"><i></i>${label} <b>${counts[cat]}</b></button>`);
	return `<button class="chip" data-cat="" aria-pressed="true">All <b>${flags.length}</b></button>\n${chips.join('\n')}`;
}

function qualityScore(stats, flagCount) {
	if (stats.words === 0) return 100;
	const per1k = (flagCount / stats.words) * 1000;
	return Math.max(2, 100 - Math.round(6 * Math.sqrt(per1k)));
}

function statsHtml(stats) {
	return `${stats.words} words · ~${stats.readingTimeMinutes} min · ` +
		`grade ${stats.grade} · adverbs ${stats.adverbs.count}/${stats.adverbs.target} · ` +
		`passive ${stats.passive.count}/${stats.passive.target} · ` +
		`qualifiers ${stats.qualifiers.count}/${stats.qualifiers.target} · ` +
		`AI tells ${stats.aiTells} · grammar ${stats.grammar}`;
}

function catCss(cat) {
	return `mark.w-${cat} { background: color-mix(in srgb, var(--c-${cat}) var(--wash), transparent); }
mark.u-${cat} { text-decoration-line: underline; text-decoration-color: var(--c-${cat}); }
.chip.${cat} i { background: var(--c-${cat}); }`;
}

export function renderPage(rawText, { file = 'document', maxGrade } = {}) {
	const { flags, stats } = checkText(rawText, { maxGrade, file });
	const body = renderMarkdown(
		buildRuns(rawText, flags).map((r) => runHtml(r, flags)).join(''));
	const score = qualityScore(stats, flags.length);
	const flagData = flags.map((f, id) => ({ id, category: f.category,
		line: f.line, match: f.match, hint: f.hint }));
	const catRules = Object.keys(CATEGORIES).map((c) => catCss(c)).join('\n');
	return `<title>${escapeHtml(basename(file))} · Terse</title>
<style id="page-css">
:root {
	--ground: #FFFFFF; --ink: #22261F; --dim: #6E7268; --chrome: #FAFAF8;
	--edge: #E6E5E0; --accent: #2F7D4F; --wash: 30%;
	--c-very-hard-sentence: #F26D6D; --c-hard-sentence: #F5C842;
	--c-long-opening: #C08552; --c-aside: #A8ACB8;
	--c-ai-tell: #F08A2E; --c-passive-voice: #46B26E;
	--c-adverb: #4E9BE8; --c-qualifier: #A574E0;
	--c-simpler-alternative: #E85FB0; --c-weak-verb: #2FB8B0;
	--c-em-dash: #F08A2E; --c-preference: #8C6FD8;
	--c-personal-pronoun: #5F8FA8; --c-grammar: #D9463E;
}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
		--ground: #17191C; --ink: #E8E6E0; --dim: #9A9E96; --chrome: #1E2125;
		--edge: #2E3236; --accent: #6FCB93; --wash: 26%;
		--c-very-hard-sentence: #E87878; --c-hard-sentence: #E0C050;
		--c-long-opening: #D0996A; --c-aside: #9296A4;
		--c-ai-tell: #F0A05A; --c-passive-voice: #62C288;
		--c-adverb: #6FAEEE; --c-qualifier: #B48FE8;
		--c-simpler-alternative: #EE82C4; --c-weak-verb: #52C8C0;
		--c-em-dash: #F0A05A; --c-preference: #A48CE6;
		--c-personal-pronoun: #7FAAC2; --c-grammar: #E86A62;
	}
}
:root[data-theme="dark"] {
	--ground: #17191C; --ink: #E8E6E0; --dim: #9A9E96; --chrome: #1E2125;
	--edge: #2E3236; --accent: #6FCB93; --wash: 26%;
	--c-very-hard-sentence: #E87878; --c-hard-sentence: #E0C050;
	--c-long-opening: #D0996A; --c-aside: #9296A4;
	--c-ai-tell: #F0A05A; --c-passive-voice: #62C288;
	--c-adverb: #6FAEEE; --c-qualifier: #B48FE8;
	--c-simpler-alternative: #EE82C4; --c-weak-verb: #52C8C0;
	--c-em-dash: #F0A05A; --c-preference: #A48CE6;
	--c-personal-pronoun: #7FAAC2; --c-grammar: #E86A62;
}
* { box-sizing: border-box; }
body { background: var(--ground); color: var(--ink); margin: 0;
	font: 16px/1.7 Charter, Georgia, 'Iowan Old Style', serif; }
header { position: sticky; top: 0; background: var(--chrome);
	border-bottom: 1px solid var(--edge); padding: 0.7rem 1.2rem;
	font-family: system-ui, sans-serif; }
.scoreline { display: flex; align-items: baseline; gap: 0.6rem; }
.scoreline h1 { font-size: 0.95rem; margin: 0; }
.scoreline b { color: var(--accent); font-variant-numeric: tabular-nums; }
.stats { font-size: 0.74rem; color: var(--dim); margin-top: 0.2rem;
	font-variant-numeric: tabular-nums; }
nav { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem; }
.chip { display: inline-flex; align-items: center; gap: 0.35rem;
	border: 1px solid var(--edge); background: none; color: var(--ink);
	border-radius: 999px; padding: 0.15rem 0.6rem; font-size: 0.74rem;
	cursor: pointer; }
.chip i { width: 8px; height: 8px; border-radius: 50%; }
.chip[aria-pressed="true"] { border-color: var(--ink); }
.chip b { color: var(--dim); font-weight: 600; }
main { max-width: 72ch; margin: 0 auto; padding: 2rem 1.2rem 5rem;
	overflow-wrap: break-word; }
main p { white-space: pre-wrap; margin: 0 0 1rem; }
main h1 { font-size: 1.5rem; line-height: 1.3; margin: 0 0 1rem; }
main h2 { font-size: 1.2rem; margin: 1.6rem 0 0.7rem; }
main h3, main h4 { font-size: 1.02rem; margin: 1.3rem 0 0.6rem; }
main ul { margin: 0 0 1rem; padding-left: 1.4rem; }
main li { margin: 0.15rem 0; }
main pre { background: var(--chrome); border: 1px solid var(--edge);
	padding: 0.8rem 1rem; overflow-x: auto; font-size: 0.85rem;
	margin: 0 0 1rem; }
main code { background: var(--chrome); border: 1px solid var(--edge);
	padding: 0 0.25em; font-size: 0.88em; }
main a { color: inherit; text-decoration-color: var(--dim); }
mark { background: none; color: inherit; padding: 0.04em 0;
	text-decoration-thickness: 2px; text-underline-offset: 3px; }
${catRules}
/* The commonest flag gets the faintest wash, or the page reads as tinted. */
mark.w-hard-sentence { background: color-mix(in srgb,
	var(--c-hard-sentence) 14%, transparent); }
body[data-filter]:not([data-filter=""]) mark:not(.matched) {
	background: none !important; text-decoration: none !important; }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
</style>
<header>
	<div class="scoreline"><h1>${escapeHtml(basename(file))}</h1>
		<b>${score}</b><span class="stats">· ${flags.length} issues</span></div>
	<div class="stats">${statsHtml(stats)}</div>
	<nav>${chipsHtml(flags)}</nav>
</header>
<main>${body}</main>
<script type="application/json" id="flag-data">${JSON.stringify(flagData)}</script>
<script id="page-js">
document.querySelector('nav').addEventListener('click', (e) => {
	const chip = e.target.closest('.chip');
	if (!chip) return;
	document.querySelectorAll('.chip').forEach((c) =>
		c.setAttribute('aria-pressed', String(c === chip)));
	const filter = chip.dataset.cat;
	document.querySelectorAll('mark').forEach((m) =>
		m.classList.toggle('matched', !filter || m.classList.contains(filter)));
	document.body.setAttribute('data-filter', filter);
});
</script>`;
}

function main() {
	const args = process.argv.slice(2);
	const opt = (name) => {
		const i = args.indexOf(name);
		return i >= 0 ? args.splice(i, 2)[1] : undefined;
	};
	const out = opt('--out');
	const maxGrade = opt('--max-grade');
	const file = args[0];
	if (!file) {
		console.error('usage: node render-highlights.mjs <file> [--out page.html] [--max-grade N]');
		process.exit(2);
	}
	const html = renderPage(readFileSync(file, 'utf8'),
		{ file, maxGrade: maxGrade ? Number(maxGrade) : undefined });
	const target = out ?? file.replace(/\.\w+$/, '') + '.terse.html';
	writeFileSync(target, html);
	console.log(target);
}

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) main();
