#!/usr/bin/env node
// Renders a checked document as a self-contained highlight page: one color
// per category, the flag's hint on hover, stats in the header, click a
// highlight to accept its fix. No dependencies, no network.
// Usage: node render-highlights.mjs <file> [--out page.html] [--max-grade N]
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { checkText } from './style-check.mjs';

const CATEGORIES = {
	'hard-sentence': 'Hard sentence',
	'very-hard-sentence': 'Very hard sentence',
	'passive-voice': 'Passive voice',
	adverb: 'Adverb',
	qualifier: 'Qualifier',
	'simpler-alternative': 'Wordy',
	'weak-verb': 'Weak verb',
	'ai-tell': 'AI tell',
	aside: 'Aside',
	'em-dash': 'Em dash',
};

function escapeHtml(s) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
		.replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Paint each character with the ids of the flags covering it, then emit
// flat runs. Overlaps (a word flag inside a sentence flag) become runs
// carrying both classes.
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
	const tip = run.ids.map((id) =>
		`${CATEGORIES[flags[id].category] ?? flags[id].category}: ${flags[id].hint}`)
		.join('\n');
	return `<mark class="${cats.join(' ')}" data-flags="${run.ids.join(' ')}" ` +
		`title="${escapeHtml(tip)}" tabindex="0">${inner}</mark>`;
}

function legendHtml(flags) {
	const counts = {};
	for (const f of flags) counts[f.category] = (counts[f.category] ?? 0) + 1;
	return Object.entries(CATEGORIES)
		.filter(([cat]) => counts[cat])
		.map(([cat, label]) => `<label class="chip ${cat}"><input type="checkbox" ` +
			`checked data-cat="${cat}"><span>${label}</span><b>${counts[cat]}</b></label>`)
		.join('\n');
}

function statsHtml(stats) {
	return `${stats.words} words · ~${stats.readingTimeMinutes} min · ` +
		`grade ${stats.grade} · adverbs ${stats.adverbs.count}/${stats.adverbs.target} · ` +
		`passive ${stats.passive.count}/${stats.passive.target} · ` +
		`qualifiers ${stats.qualifiers.count}/${stats.qualifiers.target} · ` +
		`AI tells ${stats.aiTells}`;
}

export function renderPage(rawText, { file = 'document', maxGrade } = {}) {
	const { flags, stats } = checkText(rawText, { maxGrade, file });
	const body = buildRuns(rawText, flags).map((r) => runHtml(r, flags)).join('');
	const flagData = flags.map((f, id) => ({ id, category: f.category,
		line: f.line, match: f.match, hint: f.hint }));
	return `<title>${escapeHtml(basename(file))} · Terse</title>
<style>
:root {
	--ground: #FAFAF7; --ink: #20241F; --dim: #6B6F66; --chrome: #FFFFFF;
	--edge: #E2E1DA; --accept: #2F7D4F;
	--c-hard: rgba(245,205,90,.45); --c-vhard: rgba(230,110,100,.40);
	--c-passive: rgba(120,190,130,.40); --c-adverb: rgba(110,170,225,.40);
	--c-qual: rgba(180,160,220,.40); --c-wordy: rgba(205,150,215,.40);
	--c-weak: rgba(90,190,185,.40); --c-tell: rgba(255,165,95,.45);
	--c-aside: rgba(240,145,180,.35); --c-dash: rgba(255,165,95,.55);
}
:root:not([data-theme="light"]) { }
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
		--ground: #15181A; --ink: #E8E6E0; --dim: #9A9E96; --chrome: #1C2023;
		--edge: #2C3134; --accept: #6FCB93;
		--c-hard: rgba(245,205,90,.30); --c-vhard: rgba(230,110,100,.32);
		--c-passive: rgba(120,190,130,.28); --c-adverb: rgba(110,170,225,.30);
		--c-qual: rgba(180,160,220,.30); --c-wordy: rgba(205,150,215,.30);
		--c-weak: rgba(90,190,185,.30); --c-tell: rgba(255,165,95,.32);
		--c-aside: rgba(240,145,180,.26); --c-dash: rgba(255,165,95,.40);
	}
}
:root[data-theme="dark"] {
	--ground: #15181A; --ink: #E8E6E0; --dim: #9A9E96; --chrome: #1C2023;
	--edge: #2C3134; --accept: #6FCB93;
	--c-hard: rgba(245,205,90,.30); --c-vhard: rgba(230,110,100,.32);
	--c-passive: rgba(120,190,130,.28); --c-adverb: rgba(110,170,225,.30);
	--c-qual: rgba(180,160,220,.30); --c-wordy: rgba(205,150,215,.30);
	--c-weak: rgba(90,190,185,.30); --c-tell: rgba(255,165,95,.32);
	--c-aside: rgba(240,145,180,.26); --c-dash: rgba(255,165,95,.40);
}
body { background: var(--ground); color: var(--ink); margin: 0;
	font: 16px/1.65 Charter, Georgia, 'Iowan Old Style', serif; }
header { position: sticky; top: 0; background: var(--chrome);
	border-bottom: 1px solid var(--edge); padding: 0.7rem 1.2rem;
	font-family: system-ui, sans-serif; }
header h1 { font-size: 1rem; margin: 0 0 0.15rem; }
header p { margin: 0; color: var(--dim); font-size: 0.82rem;
	font-variant-numeric: tabular-nums; }
nav { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.55rem; }
.chip { display: inline-flex; align-items: center; gap: 0.35rem;
	border: 1px solid var(--edge); border-radius: 3px;
	padding: 0.15rem 0.5rem; font-size: 0.78rem; cursor: pointer; }
.chip input { accent-color: var(--dim); margin: 0; }
.chip b { color: var(--dim); font-weight: 600;
	font-variant-numeric: tabular-nums; }
main { max-width: 68ch; margin: 0 auto; padding: 2rem 1.2rem 4rem;
	white-space: pre-wrap; overflow-wrap: break-word; }
mark { color: inherit; border-radius: 2px; padding: 0.05em 0;
	cursor: pointer; }
mark:focus-visible { outline: 2px solid var(--dim); }
mark[data-accepted] { text-decoration: line-through;
	text-decoration-color: var(--accept); text-decoration-thickness: 2px;
	outline: 1px solid var(--accept); }
.hard-sentence { background: var(--c-hard); }
.very-hard-sentence { background: var(--c-vhard); }
.passive-voice { background: var(--c-passive); }
.adverb { background: var(--c-adverb); }
.qualifier { background: var(--c-qual); }
.simpler-alternative { background: var(--c-wordy); }
.weak-verb { background: var(--c-weak); }
.ai-tell { background: var(--c-tell); }
.aside { background: var(--c-aside); }
.em-dash { background: var(--c-dash); }
body[data-off~="hard-sentence"] .hard-sentence,
body[data-off~="very-hard-sentence"] .very-hard-sentence,
body[data-off~="passive-voice"] .passive-voice,
body[data-off~="adverb"] .adverb,
body[data-off~="qualifier"] .qualifier,
body[data-off~="simpler-alternative"] .simpler-alternative,
body[data-off~="weak-verb"] .weak-verb,
body[data-off~="ai-tell"] .ai-tell,
body[data-off~="aside"] .aside,
body[data-off~="em-dash"] .em-dash { background: transparent; }
footer { position: sticky; bottom: 0; background: var(--chrome);
	border-top: 1px solid var(--edge); padding: 0.5rem 1.2rem;
	font-family: system-ui, sans-serif; font-size: 0.82rem;
	color: var(--dim); font-variant-numeric: tabular-nums; }
</style>
<header>
	<h1>${escapeHtml(basename(file))}</h1>
	<p>${statsHtml(stats)}</p>
	<nav>${legendHtml(flags)}</nav>
</header>
<artifact-sync><main>${body}</main></artifact-sync>
<footer>Click a highlight to accept its fix. <span id="accepted">0</span>
of ${flags.length} accepted.</footer>
<script type="application/json" id="flag-data">${JSON.stringify(flagData)}</script>
<script>
const counter = document.getElementById('accepted');
function recount() {
	counter.textContent = document.querySelectorAll('mark[data-accepted]').length;
}
document.querySelector('main').addEventListener('click', (e) => {
	const mark = e.target.closest('mark');
	if (!mark) return;
	mark.toggleAttribute('data-accepted');
	recount();
});
document.querySelector('nav').addEventListener('change', () => {
	const off = [...document.querySelectorAll('.chip input:not(:checked)')]
		.map((el) => el.dataset.cat).join(' ');
	document.body.setAttribute('data-off', off);
});
recount();
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
