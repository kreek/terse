// Milestone 2 proof: measured recall on a labeled corpus of tells, and
// zero false positives from the lexical categories on edited human prose
// (Hemingway's newspaper journalism, public domain, in fixtures/).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkText } from '../scripts/style-check.mjs';

const FIXTURES = join(import.meta.dirname, 'fixtures', 'human-prose');

// Each entry plants exactly one tell. Recall must be total: a miss here
// means the lexicon lost coverage it once had.
const LABELED_TELLS = [
	{ text: "We're thrilled to announce our newest feature.", tell: 'thrilled to announce' },
	{ text: 'Under the hood, the sync engine batches writes.', tell: 'under the hood' },
	{ text: 'This is just the beginning for the platform.', tell: 'this is just the beginning' },
	{ text: "We can't wait to see what you build.", tell: "can't wait to see" },
	{ text: 'The update is a game-changer for small teams.', tell: 'game-changer' },
	{ text: 'Our tool will revolutionize your workflow.', tell: 'revolutionize' },
	{ text: 'The editor empowers writers to move fast.', tell: 'empowers' },
	{ text: 'Unleash the full potential of your notes.', tell: 'unleash' },
	{ text: 'Setup is effortless and takes one minute.', tell: 'effortless' },
	{ text: 'Take a deep dive into the scheduler.', tell: 'deep dive' },
	{ text: "In today's fast-paced world, speed wins.", tell: "in today's fast-paced world" },
	{ text: 'The pipeline uses state-of-the-art caching.', tell: 'state-of-the-art' },
	{ text: 'Say goodbye to merge conflicts.', tell: 'say goodbye to' },
	{ text: 'Deploy every branch with confidence.', tell: 'with confidence' },
	{ text: 'The design is robust and seamless.', tell: 'robust' },
	{ text: 'Worth noting: the cache is shared.', tell: 'worth noting' },
	{ text: 'This sentence is load-bearing for the argument.', tell: 'load-bearing' },
	{ text: "It's not just a checker, it's an editor.", tell: "it's not X, it's Y" },
	{ text: 'The tool not only checks but also rewrites.', tell: 'not only X but also Y' },
	{ text: 'No staging queue, no broken builds, no waiting.', tell: 'no X, no Y, no Z' },
	{ text: 'Stop guessing. Start shipping.', tell: 'stop Xing, start Ying' },
	{ text: "Whether you're a founder, a writer, or a student, it fits.", tell: "whether you're X, Y, or Z" },
];

const WEAK_VERBS = [
	{ text: 'The metric is a reflection of real usage.', verb: 'reflects' },
	{ text: 'The queue has the ability to pause consumers.', verb: 'can' },
	{ text: 'The parser makes use of a lookup table.', verb: 'uses' },
	{ text: 'The gateway serves as the entry point.', verb: 'is' },
	{ text: 'Latency is dependent on the region.', verb: 'depends on' },
];

describe('labeled tell corpus: total recall', () => {
	for (const { text, tell } of LABELED_TELLS) {
		it(`detects: ${tell}`, () => {
			const tells = checkText(text).flags
				.filter((f) => f.category === 'ai-tell').map((f) => f.match);
			expect(tells).toContain(tell);
		});
	}
});

describe('weak verbs: detected with the plain verb as the hint', () => {
	for (const { text, verb } of WEAK_VERBS) {
		it(`suggests "${verb}"`, () => {
			const flag = checkText(text).flags.find((f) => f.category === 'weak-verb');
			expect(flag).toBeDefined();
			expect(flag.hint).toContain(`"${verb}"`);
		});
	}
});

describe('edited human prose: zero lexical false positives', () => {
	const LEXICAL = new Set(['ai-tell', 'weak-verb', 'simpler-alternative', 'em-dash']);
	for (const f of readdirSync(FIXTURES)) {
		it(`${f} carries no lexical flags`, () => {
			const { flags } = checkText(readFileSync(join(FIXTURES, f), 'utf8'));
			const lexical = flags.filter((x) => LEXICAL.has(x.category));
			expect(lexical.map((x) => `${x.category}:${x.match}`)).toEqual([]);
		});
	}
});
