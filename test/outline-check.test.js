// The outline's promises are arithmetic: which sections, in what order,
// under what budget. A script proves them; the model no longer self-reports.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareOutline } from '../scripts/outline-check.mjs';

const outline = `---
status: approved (user, 2026-09-01)
---
# Kafka naming

Reader: platform engineers.
target: 400

## Why names collide
Claim: dots and underscores share a metric namespace.
budget: 120

## What to do
Claim: pick one separator per cluster.
budget: 80
`;

const doc = (sections) => sections.map(([h, n]) =>
	`## ${h}\n\n${Array.from({ length: n }, () => 'word').join(' ')}.`).join('\n\n');

describe('compareOutline', () => {
	it('passes a document that keeps every promise', () => {
		expect(compareOutline(outline, doc([['Why names collide', 100], ['What to do', 60]])).findings).toEqual([]);
	});

	it('reports a missing, an extra, and a reordered section', () => {
		const { findings } = compareOutline(outline,
			doc([['What to do', 10], ['Why names collide', 10], ['Rollout', 10]]));
		const matches = findings.map((f) => f.match);
		expect(matches).toContain('extra: Rollout');
		expect(matches.filter((m) => m.startsWith('order: '))).toHaveLength(1);
		expect(findings.every((f) => f.category === 'structure')).toBe(true);
	});

	it('reports a section over its budget, with the numbers', () => {
		const { findings } = compareOutline(outline, doc([['Why names collide', 150], ['What to do', 60]]));
		expect(findings).toHaveLength(1);
		expect(findings[0].match).toBe('budget: Why names collide');
		expect(findings[0].hint).toContain('150 words over a budget of 120');
	});

	it('reports the document over its target', () => {
		const long = compareOutline(outline.replace('budget: 120', 'budget: 500'),
			doc([['Why names collide', 450], ['What to do', 60]]));
		expect(long.findings.map((f) => f.match)).toContain('target');
		expect(long.stats).toMatchObject({ words: 510, target: 400 });
	});

	it('matches headings loosely: case, punctuation, and spacing', () => {
		expect(compareOutline(outline, doc([['Why Names Collide?', 10], ['what to do', 10]])).findings).toEqual([]);
	});
});

describe('outline-check CLI', () => {
	const dir = mkdtempSync(join(tmpdir(), 'terse-outline-'));
	const script = join(import.meta.dirname, '..', 'scripts', 'outline-check.mjs');
	const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

	it('finds <name>-outline.md beside the document and exits by the contract', () => {
		writeFileSync(join(dir, 'kafka-outline.md'), outline);
		writeFileSync(join(dir, 'kafka.md'), doc([['Why names collide', 100], ['What to do', 60]]));
		expect(run(join(dir, 'kafka.md')).status).toBe(0);
		writeFileSync(join(dir, 'kafka.md'), doc([['Why names collide', 100]]));
		const r = run(join(dir, 'kafka.md'));
		expect(r.status).toBe(1);
		expect(r.stdout).toContain('[structure] "missing: What to do"');
	});

	it('exits 2 without an outline', () => {
		writeFileSync(join(dir, 'lonely.md'), '## A\n\nText.');
		expect(run(join(dir, 'lonely.md')).status).toBe(2);
	});

});

describe('outline parsing edge cases', () => {
	it('reads budget and target only from their own labeled lines', () => {
		const tricky = outline
			.replace('Claim: dots and underscores share a metric namespace.', 'Claim: the budget 2024 review found collisions.')
			.replace('target: 400', 'Readers who target 2 clusters.\n\ntarget: 400');
		const { findings, stats } = compareOutline(tricky, doc([['Why names collide', 130], ['What to do', 60]]));
		expect(findings.map((f) => f.match)).toEqual(['budget: Why names collide']);
		expect(stats.target).toBe(400);
	});

	it('accepts an approximate budget', () => {
		const approx = outline.replace('budget: 120', 'budget: ~120');
		expect(compareOutline(approx, doc([['Why names collide', 130], ['What to do', 60]])).findings).toHaveLength(1);
	});

	it('refuses to compare a document against itself', () => {
		const dir = mkdtempSync(join(tmpdir(), 'terse-outline-self-'));
		const script = join(import.meta.dirname, '..', 'scripts', 'outline-check.mjs');
		writeFileSync(join(dir, 'notes.txt'), '## A\n\nText.');
		expect(spawnSync(process.execPath, [script, join(dir, 'notes.txt')], { encoding: 'utf8' }).status).toBe(2);
	});
});
