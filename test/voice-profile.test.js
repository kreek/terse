// The voice skill's measurements: the AI-tell screen that keeps a model's
// polish out of a voice, and the profile and config it measures from the
// samples that remain.
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { profileSamples } from '../scripts/voice-profile.mjs';

const ROOT = join(import.meta.dirname, '..');
const SCRIPT = join(ROOT, 'scripts', 'voice-profile.mjs');
const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
const hemingway = (name) => ({
	file: name,
	text: readFileSync(join(ROOT, 'samples', 'hemingway', name), 'utf8'),
});

// Claude's default README register: five tells in about 120 words.
const MODEL_README = [
	'# logsift',
	'',
	'logsift is a powerful, lightweight command-line tool that helps you filter and search structured logs. Whether you are debugging a production incident or exploring local output, logsift makes it easy to find exactly what you need.',
	'',
	'## Key Features',
	'',
	'- **Fast filtering**: Filter by level, time range, or any field.',
	'- **Flexible output**: Print as text, JSON, or a table.',
	'- **Zero config**: Works out of the box with sensible defaults.',
	'',
	'## Conclusion',
	'',
	'In summary, logsift streamlines your workflow and unlocks deeper insight into your systems.',
].join('\n');

describe('the AI-tell screen', () => {
	it('sets aside a sample dense with AI tells and keeps human prose', () => {
		const { samples } = profileSamples([
			hemingway('ambulance-run.md'),
			{ file: 'readme.md', text: MODEL_README },
		]);
		expect(samples.map((s) => [s.file, s.kept])).toEqual([
			['ambulance-run.md', true],
			['readme.md', false],
		]);
		expect(samples[1].aiTellsPerKword).toBeGreaterThanOrEqual(3);
	});

	it('keeps a sample whose only evidence is a single tell', () => {
		const text = 'It is worth noting that the deploy failed twice. We fixed the script.';
		const { samples } = profileSamples([{ file: 'short.md', text }]);
		expect(samples[0]).toMatchObject({ aiTells: 1, kept: true });
	});

	it('keeps a sample with two tells under 3 per 1,000 words, unrounded', () => {
		const filler = Array.from({ length: 94 }, () => 'The team shipped the build on time.');
		const text = ['It is worth noting that the deploy failed.', ...filler,
			'The fix is a game changer for us.'].join(' ');
		const { samples } = profileSamples([{ file: 'long.md', text }]);
		expect(samples[0]).toMatchObject({ words: 674, aiTells: 2, kept: true });
	});

	it('does not count emoji, which people use in chat and PRs', () => {
		const text = 'Shipped the fix 🎉 thanks all 🙏 for the help today.';
		const { samples } = profileSamples([{ file: 'pr.md', text }]);
		expect(samples[0]).toMatchObject({ aiTells: 0, kept: true });
	});

	it('keeps every sample when screening is off', () => {
		const { samples } = profileSamples([{ file: 'readme.md', text: MODEL_README }],
			{ screen: false });
		expect(samples[0].kept).toBe(true);
	});
});

describe('the measured profile', () => {
	it('measures only the kept samples', () => {
		const ambulance = hemingway('ambulance-run.md');
		const { samples, profile } = profileSamples([ambulance,
			{ file: 'readme.md', text: MODEL_README }]);
		expect(profile.samples).toBe(1);
		expect(profile.words).toBe(samples[0].words);
		expect(profile.rates['ai-tell']).toBeUndefined();
	});

	it('reports the sentence-length spread', () => {
		const text = 'One two. One two three four. One two three four five six. ' +
			'One two three four five six seven eight. ' +
			'One two three four five six seven eight nine ten.';
		const { profile } = profileSamples([{ file: 'a.md', text }]);
		expect(profile.sentenceLength).toEqual({ mean: 6, median: 6, p10: 2, p90: 10 });
	});

	it('gives each category a rate per thousand words and an example', () => {
		const { profile } = profileSamples([hemingway('battle-of-raid-squads.md')]);
		const passive = profile.rates['passive-voice'];
		expect(passive.perKword).toBeCloseTo((passive.count * 1000) / profile.words, 1);
		expect(passive.default).toBe(8.2);
		expect(passive.example).toMatchObject({ file: 'battle-of-raid-squads.md' });
		expect(passive.example.line).toBeGreaterThan(0);
	});

	it('offers a word-level keep per match and a structural keep per category', () => {
		const text = 'We utilize the tool. We utilize the API. Stale entries — every night. ' +
			'The cache was cleared.';
		const { profile } = profileSamples([{ file: 'a.md', text }]);
		expect(profile.candidates.map((c) => c.ignore)).toEqual(['simpler-alternative:utilize',
			'em-dash']);
		expect(profile.candidates[0]).toMatchObject({ count: 2,
			example: { file: 'a.md', line: 1, match: 'utilize' } });
	});

	it('never offers a keep for grammar or for a rate a target governs', () => {
		const text = 'We could of shipped it. The cache was cleared quickly, perhaps.';
		const { profile } = profileSamples([{ file: 'a.md', text }]);
		expect(Object.keys(profile.rates)).toEqual(
			expect.arrayContaining(['grammar', 'passive-voice', 'adverb']));
		expect(profile.candidates).toEqual([]);
	});

	it('suggests a target only for a rate above the default', () => {
		const { profile } = profileSamples([hemingway('battle-of-raid-squads.md')]);
		const passive = profile.rates['passive-voice'].perKword;
		expect(passive).toBeGreaterThan(8.2);
		expect(profile.rates.adverb.perKword).toBeLessThan(7.5);
		expect(profile.suggested.targets).toEqual({ passivePerKword: passive });
	});

	it('suggests a grade limit above the measured grade, and only past the default', () => {
		const dense = 'Multifaceted organizational transformation necessitates comprehensive ' +
			'stakeholder alignment procedures. Transformative institutional methodologies ' +
			'precipitate unprecedented developmental paradigm restructuring.';
		const high = profileSamples([{ file: 'a.md', text: dense }], { screen: false }).profile;
		expect(high.suggested.maxGrade).toBe(high.grade + 1);
		const plain = profileSamples([hemingway('treat-em-rough.md')]).profile;
		expect(plain.grade).toBeLessThan(10);
		expect(plain.suggested).not.toHaveProperty('maxGrade');
	});

	it('calls a corpus of three samples under 1,500 words thin', () => {
		const short = ['recruits-for-tanks.md', 'paris-full-of-russians.md', 'treat-em-rough.md'];
		const profile = profileSamples(short.map(hemingway)).profile;
		expect(profile.words).toBeLessThan(1500);
		expect(profile.thin).toBe(true);
	});

	it('calls a corpus under three samples or 1,500 words thin', () => {
		const two = profileSamples([hemingway('ambulance-run.md'),
			hemingway('battle-of-raid-squads.md')]).profile;
		expect(two.thin).toBe(true);
		const three = profileSamples([hemingway('ambulance-run.md'),
			hemingway('battle-of-raid-squads.md'), hemingway('kerensky-fighting-flea.md')]).profile;
		expect(three.thin).toBe(false);
	});

	it('has no profile when screening sets every sample aside', () => {
		const { profile } = profileSamples([{ file: 'readme.md', text: MODEL_README }]);
		expect(profile).toBeNull();
	});
});

describe('voice-profile CLI', () => {
	function corpus() {
		const dir = mkdtempSync(join(tmpdir(), 'terse-voice-'));
		mkdirSync(join(dir, 'posts'));
		mkdirSync(join(dir, '.drafts'));
		writeFileSync(join(dir, 'posts', 'run.md'), hemingway('ambulance-run.md').text);
		writeFileSync(join(dir, 'letter.txt'), hemingway('treat-em-rough.md').text);
		writeFileSync(join(dir, 'readme.md'), MODEL_README);
		writeFileSync(join(dir, '.drafts', 'hidden.md'), MODEL_README);
		writeFileSync(join(dir, 'notes.js'), '// not prose');
		return dir;
	}

	it('reads the prose files in a folder, skipping hidden folders', () => {
		const dir = corpus();
		const r = run(dir, '--json');
		expect(r.status).toBe(0);
		const files = JSON.parse(r.stdout).samples.map((s) => s.file);
		expect(files).toEqual([join(dir, 'letter.txt'), join(dir, 'posts', 'run.md'),
			join(dir, 'readme.md')]);
	});

	it('prints which samples it kept and the profile', () => {
		const r = run(corpus());
		expect(r.status).toBe(0);
		expect(r.stdout).toMatch(/^set aside .*readme\.md/m);
		expect(r.stdout).toMatch(/^2 kept samples, \d+ words/m);
		expect(r.stdout).toContain('sentence length: mean');
	});

	it('reads a file once when two paths reach it, however spelled', () => {
		const dir = corpus();
		const r = run(dir, `${dir}/./letter.txt`, '--json');
		const files = JSON.parse(r.stdout).samples.map((s) => s.file);
		expect(files.filter((f) => f.endsWith('letter.txt'))).toHaveLength(1);
	});

	it('keeps every sample under --no-screen', () => {
		const r = run(corpus(), '--no-screen', '--json');
		expect(JSON.parse(r.stdout).samples.every((s) => s.kept)).toBe(true);
	});

	it('exits 2 with usage when no path is given', () => {
		const r = run('--json');
		expect(r.status).toBe(2);
		expect(r.stderr).toContain('usage:');
	});

	it('exits 2 when there is nothing to read', () => {
		const empty = mkdtempSync(join(tmpdir(), 'terse-voice-empty-'));
		expect(run(empty).status).toBe(2);
		expect(run(join(empty, 'missing')).status).toBe(2);
	});

	it('exits 2 on an unknown flag', () => {
		expect(run(corpus(), '--nope').status).toBe(2);
	});
});
