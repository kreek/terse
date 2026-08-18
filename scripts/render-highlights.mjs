#!/usr/bin/env node
// Renders a checked document as a self-contained review page: washes for
// longer passages and underlines for short changes in the text, plus an
// ordered issue panel with per-item and bulk accept/dismiss. No
// dependencies, no network.
// Usage: node render-highlights.mjs <file> [--out page.html] [--max-grade N]
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { checkText } from './style-check.mjs';

const CATEGORIES = {
	'very-hard-sentence': 'Very hard sentence',
	'hard-sentence': 'Hard sentence',
	aside: 'Aside',
	'ai-tell': 'AI tell',
	'passive-voice': 'Passive voice',
	adverb: 'Adverb',
	qualifier: 'Qualifier',
	'simpler-alternative': 'Wordy',
	'weak-verb': 'Weak verb',
	'em-dash': 'Em dash',
};

// Channel by extent: a short span reads as "change this word" and gets an
// underline; a long span reads as "rework this passage" and gets a wash.
const ALWAYS_WASH = new Set(['hard-sentence', 'very-hard-sentence', 'aside']);
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
		`data-flags="${run.ids.join(' ')}" title="${escapeHtml(tip)}" ` +
		`tabindex="0">${inner}</mark>`;
}

function cardHtml(flag, id) {
	const quote = flag.match.length > 60 ? flag.match.slice(0, 60) + '...' : flag.match;
	return `<article class="card ${flag.category}" data-id="${id}" data-cat="${flag.category}">
	<header><i></i>${CATEGORIES[flag.category] ?? flag.category}<span>line ${flag.line}</span></header>
	<blockquote>${escapeHtml(quote)}</blockquote>
	<p>${escapeHtml(flag.hint)}</p>
	<div><button data-act="accept">Accept</button><button data-act="dismiss">Dismiss</button></div>
</article>`;
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
		`AI tells ${stats.aiTells}`;
}

function catCss(cat, selectorPrefix = '') {	// one rule pair per category
	return `mark.w-${cat}${selectorPrefix} { background: color-mix(in srgb, var(--c-${cat}) var(--wash), transparent); }
mark.u-${cat}${selectorPrefix} { text-decoration-line: underline; text-decoration-color: var(--c-${cat}); }
.card.${cat} header i, .chip.${cat} i { background: var(--c-${cat}); }`;
}

export function renderPage(rawText, { file = 'document', maxGrade } = {}) {
	const { flags, stats } = checkText(rawText, { maxGrade, file });
	const body = buildRuns(rawText, flags).map((r) => runHtml(r, flags)).join('');
	const ordered = flags.map((f, id) => ({ f, id }))
		.sort((a, b) => (a.f.span?.[0] ?? 0) - (b.f.span?.[0] ?? 0));
	const cards = ordered.map(({ f, id }) => cardHtml(f, id)).join('\n');
	const score = qualityScore(stats, flags.length);
	const flagData = flags.map((f, id) => ({ id, category: f.category,
		line: f.line, match: f.match, hint: f.hint }));
	const catRules = Object.keys(CATEGORIES).map((c) => catCss(c)).join('\n');
	return `<title>${escapeHtml(basename(file))} · Terse</title>
<style>
:root {
	--ground: #FFFFFF; --ink: #22261F; --dim: #6E7268; --chrome: #FAFAF8;
	--edge: #E6E5E0; --accept: #2F7D4F; --wash: 30%;
	--c-very-hard-sentence: #F26D6D; --c-hard-sentence: #F5C842;
	--c-aside: #A8ACB8; --c-ai-tell: #F08A2E; --c-passive-voice: #46B26E;
	--c-adverb: #4E9BE8; --c-qualifier: #A574E0;
	--c-simpler-alternative: #E85FB0; --c-weak-verb: #2FB8B0;
	--c-em-dash: #F08A2E;
}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
		--ground: #17191C; --ink: #E8E6E0; --dim: #9A9E96; --chrome: #1E2125;
		--edge: #2E3236; --accept: #6FCB93; --wash: 26%;
		--c-very-hard-sentence: #E87878; --c-hard-sentence: #E0C050;
		--c-aside: #9296A4; --c-ai-tell: #F0A05A; --c-passive-voice: #62C288;
		--c-adverb: #6FAEEE; --c-qualifier: #B48FE8;
		--c-simpler-alternative: #EE82C4; --c-weak-verb: #52C8C0;
		--c-em-dash: #F0A05A;
	}
}
:root[data-theme="dark"] {
	--ground: #17191C; --ink: #E8E6E0; --dim: #9A9E96; --chrome: #1E2125;
	--edge: #2E3236; --accept: #6FCB93; --wash: 26%;
	--c-very-hard-sentence: #E87878; --c-hard-sentence: #E0C050;
	--c-aside: #9296A4; --c-ai-tell: #F0A05A; --c-passive-voice: #62C288;
	--c-adverb: #6FAEEE; --c-qualifier: #B48FE8;
	--c-simpler-alternative: #EE82C4; --c-weak-verb: #52C8C0;
	--c-em-dash: #F0A05A;
}
* { box-sizing: border-box; }
body { background: var(--ground); color: var(--ink); margin: 0;
	font: 16px/1.7 Charter, Georgia, 'Iowan Old Style', serif; }
#app { display: grid; grid-template-columns: minmax(0, 1fr) 360px;
	max-width: 1200px; margin: 0 auto; }
main { padding: 2.5rem 2.5rem 5rem; white-space: pre-wrap;
	overflow-wrap: break-word; max-width: 72ch; }
aside { border-left: 1px solid var(--edge); background: var(--chrome);
	font-family: system-ui, sans-serif; height: 100vh; position: sticky;
	top: 0; display: flex; flex-direction: column; }
aside > header { padding: 1rem 1.1rem 0.75rem; border-bottom: 1px solid var(--edge); }
aside h1 { font-size: 0.95rem; margin: 0 0 0.2rem; }
.scoreline { display: flex; align-items: center; gap: 0.6rem;
	font-size: 0.8rem; color: var(--dim); }
.scoreline b { color: var(--accept); font-size: 1.05rem;
	font-variant-numeric: tabular-nums; }
.bar { flex: 1; height: 4px; background: var(--edge); }
.bar i { display: block; height: 100%; width: ${score}%;
	background: var(--accept); }
.stats { font-size: 0.72rem; color: var(--dim); margin-top: 0.45rem;
	font-variant-numeric: tabular-nums; }
.chips { display: flex; flex-wrap: wrap; gap: 0.3rem; padding: 0.6rem 1.1rem 0.4rem; }
.chip { display: inline-flex; align-items: center; gap: 0.35rem;
	border: 1px solid var(--edge); background: none; color: var(--ink);
	border-radius: 999px; padding: 0.15rem 0.6rem; font-size: 0.74rem;
	cursor: pointer; }
.chip i { width: 8px; height: 8px; border-radius: 50%; }
.chip[aria-pressed="true"] { border-color: var(--ink); }
.chip b { color: var(--dim); font-weight: 600; }
.bulk { display: flex; gap: 0.4rem; padding: 0.35rem 1.1rem 0.6rem;
	border-bottom: 1px solid var(--edge); }
.bulk button { border: 1px solid var(--edge); background: none;
	color: var(--ink); padding: 0.25rem 0.7rem;
	font-size: 0.75rem; cursor: pointer; }
.bulk #accept-all, .bulk #accept-scope { border-color: var(--accept);
	color: var(--accept); font-weight: 600; }
#cards { overflow-y: auto; padding: 0.75rem; display: flex;
	flex-direction: column; gap: 0.55rem; }
.card { border: 1px solid var(--edge);
	padding: 0.65rem 0.75rem; font-size: 0.8rem; background: var(--ground); }
.card header { display: flex; align-items: center; gap: 0.45rem;
	font-weight: 600; font-size: 0.76rem; }
.card header span { margin-left: auto; color: var(--dim); font-weight: 400;
	font-variant-numeric: tabular-nums; }
.card header i { width: 9px; height: 9px; border-radius: 50%;
	background: var(--dim); flex: none; }
.card blockquote { margin: 0.4rem 0 0.25rem; padding: 0 0 0 0.55rem;
	border-left: 2px solid var(--edge); color: var(--dim); font-style: italic; }
.card p { margin: 0.2rem 0 0.5rem; color: var(--dim); }
.card button { border: 1px solid var(--edge); background: none;
	color: var(--ink); padding: 0.2rem 0.65rem;
	font-size: 0.74rem; cursor: pointer; margin-right: 0.35rem; }
.card button[data-act="accept"] { border-color: var(--accept);
	color: var(--accept); font-weight: 600; }
.card[data-accepted] { border-color: var(--accept); }
.card[data-accepted] button[data-act="accept"] { background: var(--accept);
	color: var(--ground); }
.card[data-dismissed] { opacity: 0.45; }
mark { background: none; color: inherit; cursor: pointer;
	padding: 0.04em 0;
	text-decoration-thickness: 2px; text-underline-offset: 3px; }
mark:focus-visible { outline: 2px solid var(--dim); }
${catRules}
/* The commonest flag gets the faintest wash, or the page reads as tinted. */
mark.w-hard-sentence { background: color-mix(in srgb,
	var(--c-hard-sentence) 14%, transparent); }
mark[data-accepted], mark[data-dismissed] {
	background: none !important; text-decoration: none !important; }
mark.flash { outline: 2px solid var(--ink); }
body[data-filter]:not([data-filter=""]) mark:not(.matched) {
	background: none !important; text-decoration: none !important; }
body[data-filter]:not([data-filter=""]) .card:not(.matched) { display: none; }
@media (max-width: 920px) {
	#app { grid-template-columns: 1fr; }
	aside { height: auto; position: static; border-left: none;
		border-top: 1px solid var(--edge); }
	#cards { max-height: 45vh; }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
</style>
<artifact-sync><div id="app">
<main>${body}</main>
<aside>
	<header>
		<h1>${escapeHtml(basename(file))}</h1>
		<div class="scoreline"><b id="score">${score}</b><div class="bar"><i></i></div>
			<span id="tally">${flags.length} issues</span></div>
		<div class="stats">${statsHtml(stats)}</div>
	</header>
	<nav class="chips">${chipsHtml(flags)}</nav>
	<div class="bulk">
		<button id="accept-scope" hidden></button>
		<button id="accept-all">Accept all (${flags.length})</button>
		<button id="clear-all">Clear all</button>
	</div>
	<section id="cards">${cards}</section>
</aside>
</div></artifact-sync>
<script type="application/json" id="flag-data">${JSON.stringify(flagData)}</script>
<script>
const tally = document.getElementById('tally');
const acceptScope = document.getElementById('accept-scope');
const total = ${flags.length};
let filter = '';
function marksFor(id) {
	return document.querySelectorAll('mark[data-flags~="' + id + '"]');
}
function setAccepted(card, on) {
	card.toggleAttribute('data-accepted', on);
	card.removeAttribute('data-dismissed');
	marksFor(card.dataset.id).forEach((m) => m.toggleAttribute('data-accepted', on));
}
function clearCard(card) {
	card.removeAttribute('data-accepted');
	card.removeAttribute('data-dismissed');
	marksFor(card.dataset.id).forEach((m) => {
		m.removeAttribute('data-accepted');
		m.removeAttribute('data-dismissed');
	});
}
function cardsOf(cat) {
	return document.querySelectorAll(
		cat ? '.card[data-cat="' + cat + '"]' : '.card');
}
function recount() {
	const a = document.querySelectorAll('.card[data-accepted]').length;
	tally.textContent = a > 0 ? a + ' of ' + total + ' accepted' : total + ' issues';
}
function applyFilter() {
	document.querySelectorAll('mark, .card').forEach((el) => {
		const match = !filter || el.classList.contains(filter) ||
			el.dataset.cat === filter;
		el.classList.toggle('matched', match);
	});
	document.body.setAttribute('data-filter', filter);
	acceptScope.hidden = !filter;
	if (filter) {
		const label = document.querySelector('.chip[data-cat="' + filter + '"]')
			.textContent.replace(/\s*\d+$/, '').trim();
		acceptScope.textContent = 'Accept ' + label.toLowerCase() +
			' (' + cardsOf(filter).length + ')';
	}
}
document.getElementById('cards').addEventListener('click', (e) => {
	const card = e.target.closest('.card');
	if (!card) return;
	const act = e.target.closest('button')?.dataset.act;
	if (act === 'accept') {
		setAccepted(card, !card.hasAttribute('data-accepted'));
		recount();
		return;
	}
	if (act === 'dismiss') {
		const on = !card.hasAttribute('data-dismissed');
		clearCard(card);
		card.toggleAttribute('data-dismissed', on);
		marksFor(card.dataset.id).forEach((m) => m.toggleAttribute('data-dismissed', on));
		recount();
		return;
	}
	const m = marksFor(card.dataset.id)[0];
	if (!m) return;
	m.scrollIntoView({ behavior: 'smooth', block: 'center' });
	marksFor(card.dataset.id).forEach((el) => el.classList.add('flash'));
	setTimeout(() => marksFor(card.dataset.id).forEach((el) =>
		el.classList.remove('flash')), 1200);
});
acceptScope.addEventListener('click', () => {
	cardsOf(filter).forEach((card) => setAccepted(card, true));
	recount();
});
document.getElementById('accept-all').addEventListener('click', () => {
	cardsOf('').forEach((card) => setAccepted(card, true));
	recount();
});
document.getElementById('clear-all').addEventListener('click', () => {
	cardsOf('').forEach(clearCard);
	recount();
});
document.querySelector('main').addEventListener('click', (e) => {
	const mark = e.target.closest('mark');
	if (!mark) return;
	const card = document.querySelector(
		'.card[data-id="' + mark.dataset.flags.split(' ')[0] + '"]');
	if (!card) return;
	card.scrollIntoView({ behavior: 'smooth', block: 'center' });
	card.style.outline = '2px solid var(--accept)';
	setTimeout(() => { card.style.outline = ''; }, 1200);
});
document.querySelector('.chips').addEventListener('click', (e) => {
	const chip = e.target.closest('.chip');
	if (!chip) return;
	document.querySelectorAll('.chip').forEach((c) =>
		c.setAttribute('aria-pressed', String(c === chip)));
	filter = chip.dataset.cat;
	applyFilter();
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
