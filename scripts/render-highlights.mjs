#!/usr/bin/env node
// Renders a checked document as a self-contained review page: Hemingway
// style sentence washes and word underlines in the text, and a Grammarly
// style ordered issue panel with per-item accept and dismiss. No
// dependencies, no network.
// Usage: node render-highlights.mjs <file> [--out page.html] [--max-grade N]
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { checkText } from './style-check.mjs';

// Two visual channels: sentence-level categories wash the background;
// word-level categories underline. Hues repeat only across channels.
const CATEGORIES = {
	'very-hard-sentence': { label: 'Very hard sentence', kind: 'wash' },
	'hard-sentence': { label: 'Hard sentence', kind: 'wash' },
	aside: { label: 'Aside', kind: 'wash' },
	'ai-tell': { label: 'AI tell', kind: 'line' },
	'passive-voice': { label: 'Passive voice', kind: 'line' },
	adverb: { label: 'Adverb', kind: 'line' },
	qualifier: { label: 'Qualifier', kind: 'line' },
	'simpler-alternative': { label: 'Wordy', kind: 'line' },
	'weak-verb': { label: 'Weak verb', kind: 'line' },
	'em-dash': { label: 'Em dash', kind: 'line' },
};

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
	const tip = run.ids.map((id) =>
		`${CATEGORIES[flags[id].category]?.label ?? flags[id].category}: ${flags[id].hint}`)
		.join('\n');
	return `<mark class="${cats.join(' ')}" data-flags="${run.ids.join(' ')}" ` +
		`title="${escapeHtml(tip)}" tabindex="0">${inner}</mark>`;
}

function cardHtml(flag, id) {
	const cat = CATEGORIES[flag.category] ?? { label: flag.category };
	const quote = flag.match.length > 60 ? flag.match.slice(0, 60) + '...' : flag.match;
	return `<article class="card ${flag.category}" data-id="${id}" data-cat="${flag.category}">
	<header><i></i>${cat.label}<span>line ${flag.line}</span></header>
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
		.map(([cat, { label }]) => `<button class="chip ${cat}" data-cat="${cat}" ` +
			`aria-pressed="false">${label} <b>${counts[cat]}</b></button>`);
	return `<button class="chip" data-cat="" aria-pressed="true">All <b>${flags.length}</b></button>\n${chips.join('\n')}`;
}

// 100 for clean prose, falling with flag density; square root keeps dense
// drafts on the scale instead of pinning them to zero.
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

export function renderPage(rawText, { file = 'document', maxGrade } = {}) {
	const { flags, stats } = checkText(rawText, { maxGrade, file });
	const body = buildRuns(rawText, flags).map((r) => runHtml(r, flags)).join('');
	const ordered = flags.map((f, id) => ({ f, id }))
		.sort((a, b) => (a.f.span?.[0] ?? 0) - (b.f.span?.[0] ?? 0));
	const cards = ordered.map(({ f, id }) => cardHtml(f, id)).join('\n');
	const score = qualityScore(stats, flags.length);
	const flagData = flags.map((f, id) => ({ id, category: f.category,
		line: f.line, match: f.match, hint: f.hint }));
	return `<title>${escapeHtml(basename(file))} · Terse</title>
<style>
:root {
	--ground: #FAFAF7; --ink: #20241F; --dim: #6B6F66; --chrome: #FFFFFF;
	--edge: #E2E1DA; --accept: #2F7D4F; --score: #2F7D4F;
	--w-vhard: rgba(224,96,96,.30); --w-hard: rgba(240,208,96,.38);
	--w-aside: rgba(150,150,165,.22);
	--l-tell: #E8862E; --l-passive: #3F9E5F; --l-adverb: #4A8FD4;
	--l-qual: #9A6BD0; --l-wordy: #D45FA8; --l-weak: #2FA7A0;
	--l-dash: #E8862E;
}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
		--ground: #15181A; --ink: #E8E6E0; --dim: #9A9E96; --chrome: #1C2023;
		--edge: #2C3134; --accept: #6FCB93; --score: #6FCB93;
		--w-vhard: rgba(224,96,96,.26); --w-hard: rgba(240,208,96,.20);
		--w-aside: rgba(160,160,180,.18);
		--l-tell: #F0A05A; --l-passive: #66BE85; --l-adverb: #74AEE6;
		--l-qual: #B48FE0; --l-wordy: #E387C2; --l-weak: #58C2BB;
		--l-dash: #F0A05A;
	}
}
:root[data-theme="dark"] {
	--ground: #15181A; --ink: #E8E6E0; --dim: #9A9E96; --chrome: #1C2023;
	--edge: #2C3134; --accept: #6FCB93; --score: #6FCB93;
	--w-vhard: rgba(224,96,96,.26); --w-hard: rgba(240,208,96,.20);
	--w-aside: rgba(160,160,180,.18);
	--l-tell: #F0A05A; --l-passive: #66BE85; --l-adverb: #74AEE6;
	--l-qual: #B48FE0; --l-wordy: #E387C2; --l-weak: #58C2BB;
	--l-dash: #F0A05A;
}
* { box-sizing: border-box; }
body { background: var(--ground); color: var(--ink); margin: 0;
	font: 16px/1.7 Charter, Georgia, 'Iowan Old Style', serif; }
#app { display: grid; grid-template-columns: minmax(0, 1fr) 360px;
	max-width: 1200px; margin: 0 auto; gap: 0; }
main { padding: 2.5rem 2.5rem 5rem; white-space: pre-wrap;
	overflow-wrap: break-word; max-width: 72ch; }
aside { border-left: 1px solid var(--edge); background: var(--chrome);
	font-family: system-ui, sans-serif; height: 100vh; position: sticky;
	top: 0; display: flex; flex-direction: column; }
aside > header { padding: 1rem 1.1rem 0.75rem; border-bottom: 1px solid var(--edge); }
aside h1 { font-size: 0.95rem; margin: 0 0 0.2rem; }
.scoreline { display: flex; align-items: center; gap: 0.6rem;
	font-size: 0.8rem; color: var(--dim); }
.scoreline b { color: var(--score); font-size: 1.05rem;
	font-variant-numeric: tabular-nums; }
.bar { flex: 1; height: 4px; background: var(--edge); border-radius: 2px; }
.bar i { display: block; height: 100%; width: ${score}%;
	background: var(--score); border-radius: 2px; }
.stats { font-size: 0.72rem; color: var(--dim); margin-top: 0.45rem;
	font-variant-numeric: tabular-nums; }
.chips { display: flex; flex-wrap: wrap; gap: 0.3rem; padding: 0.6rem 1.1rem;
	border-bottom: 1px solid var(--edge); }
.chip { border: 1px solid var(--edge); background: none; color: var(--ink);
	border-radius: 999px; padding: 0.15rem 0.6rem; font-size: 0.74rem;
	cursor: pointer; }
.chip[aria-pressed="true"] { border-color: var(--ink); }
.chip b { color: var(--dim); font-weight: 600; }
#cards { overflow-y: auto; padding: 0.75rem; display: flex;
	flex-direction: column; gap: 0.55rem; }
.card { border: 1px solid var(--edge); border-radius: 8px;
	padding: 0.65rem 0.75rem; font-size: 0.8rem; background: var(--ground); }
.card header { display: flex; align-items: center; gap: 0.45rem;
	font-weight: 600; font-size: 0.76rem; }
.card header span { margin-left: auto; color: var(--dim); font-weight: 400;
	font-variant-numeric: tabular-nums; }
.card header i { width: 9px; height: 9px; border-radius: 50%;
	background: var(--dim); }
.card blockquote { margin: 0.4rem 0 0.25rem; padding: 0 0 0 0.55rem;
	border-left: 2px solid var(--edge); color: var(--dim); font-style: italic; }
.card p { margin: 0.2rem 0 0.5rem; color: var(--dim); }
.card button { border: 1px solid var(--edge); background: none;
	color: var(--ink); border-radius: 5px; padding: 0.2rem 0.65rem;
	font-size: 0.74rem; cursor: pointer; margin-right: 0.35rem; }
.card button[data-act="accept"] { border-color: var(--accept);
	color: var(--accept); font-weight: 600; }
.card[data-accepted] { border-color: var(--accept); }
.card[data-accepted] button[data-act="accept"] { background: var(--accept);
	color: var(--chrome); }
.card[data-dismissed] { opacity: 0.45; }
.very-hard-sentence .card header i, .card.very-hard-sentence header i { background: var(--w-vhard); }
.card.hard-sentence header i { background: var(--w-hard); }
.card.aside header i { background: var(--w-aside); }
.card.ai-tell header i { background: var(--l-tell); }
.card.passive-voice header i { background: var(--l-passive); }
.card.adverb header i { background: var(--l-adverb); }
.card.qualifier header i { background: var(--l-qual); }
.card.simpler-alternative header i { background: var(--l-wordy); }
.card.weak-verb header i { background: var(--l-weak); }
.card.em-dash header i { background: var(--l-dash); }
mark { background: none; color: inherit; cursor: pointer;
	border-radius: 2px; padding: 0.04em 0; }
mark:focus-visible { outline: 2px solid var(--dim); }
.hard-sentence { background: var(--w-hard); }
.very-hard-sentence { background: var(--w-vhard); }
.aside { background: var(--w-aside); }
.ai-tell { text-decoration: underline; text-decoration-color: var(--l-tell);
	text-decoration-thickness: 2px; text-underline-offset: 3px; }
.passive-voice { text-decoration: underline; text-decoration-color: var(--l-passive);
	text-decoration-thickness: 2px; text-underline-offset: 3px; }
.adverb { text-decoration: underline; text-decoration-color: var(--l-adverb);
	text-decoration-thickness: 2px; text-underline-offset: 3px; }
.qualifier { text-decoration: underline; text-decoration-color: var(--l-qual);
	text-decoration-thickness: 2px; text-underline-offset: 3px; }
.simpler-alternative { text-decoration: underline; text-decoration-color: var(--l-wordy);
	text-decoration-thickness: 2px; text-underline-offset: 3px; }
.weak-verb { text-decoration: underline; text-decoration-color: var(--l-weak);
	text-decoration-thickness: 2px; text-underline-offset: 3px; }
.em-dash { text-decoration: underline; text-decoration-color: var(--l-dash);
	text-decoration-thickness: 3px; text-underline-offset: 3px; }
mark[data-accepted] { text-decoration: line-through;
	text-decoration-color: var(--accept); text-decoration-thickness: 2px; }
mark.flash { outline: 2px solid var(--ink); }
body[data-filter]:not([data-filter=""]) mark { background: none;
	text-decoration: none; }
body[data-filter="hard-sentence"] .hard-sentence { background: var(--w-hard); }
body[data-filter="very-hard-sentence"] .very-hard-sentence { background: var(--w-vhard); }
body[data-filter="aside"] .aside { background: var(--w-aside); }
body[data-filter="ai-tell"] mark.ai-tell,
body[data-filter="passive-voice"] mark.passive-voice,
body[data-filter="adverb"] mark.adverb,
body[data-filter="qualifier"] mark.qualifier,
body[data-filter="simpler-alternative"] mark.simpler-alternative,
body[data-filter="weak-verb"] mark.weak-verb,
body[data-filter="em-dash"] mark.em-dash { text-decoration: underline;
	text-decoration-thickness: 2px; text-underline-offset: 3px; }
body[data-filter]:not([data-filter=""]) .card { display: none; }
body[data-filter=""] .card, body:not([data-filter]) .card { display: block; }
body[data-filter="hard-sentence"] .card.hard-sentence,
body[data-filter="very-hard-sentence"] .card.very-hard-sentence,
body[data-filter="aside"] .card.aside,
body[data-filter="ai-tell"] .card.ai-tell,
body[data-filter="passive-voice"] .card.passive-voice,
body[data-filter="adverb"] .card.adverb,
body[data-filter="qualifier"] .card.qualifier,
body[data-filter="simpler-alternative"] .card.simpler-alternative,
body[data-filter="weak-verb"] .card.weak-verb,
body[data-filter="em-dash"] .card.em-dash { display: block; }
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
	<section id="cards">${cards}</section>
</aside>
</div></artifact-sync>
<script type="application/json" id="flag-data">${JSON.stringify(flagData)}</script>
<script>
const tally = document.getElementById('tally');
const total = ${flags.length};
function marksFor(id) {
	return document.querySelectorAll('mark[data-flags~="' + id + '"]');
}
function recount() {
	const a = document.querySelectorAll('.card[data-accepted]').length;
	tally.textContent = a > 0 ? a + ' of ' + total + ' accepted' : total + ' issues';
}
document.getElementById('cards').addEventListener('click', (e) => {
	const card = e.target.closest('.card');
	if (!card) return;
	const act = e.target.closest('button')?.dataset.act;
	const id = card.dataset.id;
	if (act === 'accept') {
		card.toggleAttribute('data-accepted');
		card.removeAttribute('data-dismissed');
		const on = card.hasAttribute('data-accepted');
		marksFor(id).forEach((m) => m.toggleAttribute('data-accepted', on));
		recount();
		return;
	}
	if (act === 'dismiss') {
		card.toggleAttribute('data-dismissed');
		card.removeAttribute('data-accepted');
		marksFor(id).forEach((m) => m.removeAttribute('data-accepted'));
		recount();
		return;
	}
	const m = marksFor(id)[0];
	if (!m) return;
	m.scrollIntoView({ behavior: 'smooth', block: 'center' });
	marksFor(id).forEach((el) => el.classList.add('flash'));
	setTimeout(() => marksFor(id).forEach((el) => el.classList.remove('flash')), 1200);
});
document.querySelector('main').addEventListener('click', (e) => {
	const mark = e.target.closest('mark');
	if (!mark) return;
	const id = mark.dataset.flags.split(' ')[0];
	const card = document.querySelector('.card[data-id="' + id + '"]');
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
	document.body.setAttribute('data-filter', chip.dataset.cat);
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
