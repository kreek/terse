// Pins the installable Codex manifest and the shared hook entrypoint.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const readRegexGrader = (path) => {
	const source = readFileSync(join(ROOT, path), 'utf8');
	const pattern = source.match(/^pattern: (.+)$/m)?.[1];
	if (!pattern) throw new Error(`Missing regex pattern in ${path}`);
	const decoded = JSON.parse(pattern);
	const inlineFlags = decoded.match(/^\(\?([a-z]+)\)/)?.[1] ?? '';
	return new RegExp(decoded.replace(/^\(\?[a-z]+\)/, ''), inlineFlags);
};

describe('Codex plugin contract', () => {
	it('declares a skills-only productivity plugin', () => {
		const manifest = readJson('.codex-plugin/plugin.json');
		expect(manifest).toMatchObject({
			name: 'terse',
			version: '0.13.0',
			skills: './skills/',
			interface: {
				displayName: 'Terse',
				developerName: 'Alastair Dawson',
				category: 'Productivity',
				capabilities: ['Read', 'Write'],
			},
		});
		expect(manifest.interface.defaultPrompt).toHaveLength(3);
		expect(manifest.interface.defaultPrompt).toEqual([
			'Write a professional document in my voice.',
			'Edit this file for clarity without changing its meaning.',
			'Outline this document before drafting it.',
		]);
		for (const field of [
			'hooks', 'apps', 'mcp', 'mcpServers', 'commands', 'agents',
			'legal', 'legalPolicy', 'assets', 'icon', 'iconSmall', 'iconLarge',
		]) {
			expect(manifest).not.toHaveProperty(field);
		}
	});

	it('keeps both host manifests and package metadata on version 0.13.0', () => {
		const codex = readJson('.codex-plugin/plugin.json');
		const claude = readJson('.claude-plugin/plugin.json');
		const claudeMarketplace = readJson('.claude-plugin/marketplace.json');
		const pkg = readJson('package.json');
		expect([codex.version, claude.version, claudeMarketplace.metadata.version,
			claudeMarketplace.plugins[0].version, pkg.version])
			.toEqual(Array(5).fill('0.13.0'));
	});

	it('uses either host plugin root for the trusted hook', () => {
		const hooks = readJson('hooks/hooks.json');
		const post = hooks.hooks.PostToolUse[0];
		expect(post.matcher).toBe('Write|Edit');
		expect(post.hooks[0].command).toBe(
			'node "${PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}/scripts/style-hook.mjs"');
	});

	it('publishes the repository root through the Codex marketplace', () => {
		const marketplace = readJson('.agents/plugins/marketplace.json');
		expect(marketplace).toMatchObject({
			name: 'terse',
			interface: { displayName: 'Terse' },
			plugins: [{
				name: 'terse',
				source: {
					source: 'url',
					url: 'https://github.com/kreek/terse.git',
				},
				policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
				category: 'Productivity',
			}],
		});
	});
});

describe('Codex fact-grader contract', () => {
	it('accepts equivalent batch and deduplication word order', () => {
		const grader = readRegexGrader(
			'evals/claudism-removal/graders/facts-present.md');
		const facts = [
			'Customer change\nfeeds retry, then batch writes and deduplicate them. Cache\nhit rates increase throughput.',
			'Customer change feeds retry, then batch and deduplicate writes. Cache hit rates increase throughput.',
		];
		for (const prose of facts) expect(grader.test(prose)).toBe(true);
	});

	it('accepts semantic README wording for input and exit codes', () => {
		const grader = readRegexGrader(
			'evals/generation-readme/graders/facts-present.md');
		const prose = [
			'Logsift reads files or standard\ninput.',
			'Use --level, --since, --until, --where, --format, --config, and ~/.logsift.toml.',
			'Install with brew\ninstall logsift or a release\nbinary.',
			'Exit `0` means records matched; `1` means no logs matched; `2` means invalid input or a read error.',
			'License: MIT.',
		].join(' ');
		expect(grader.test(prose)).toBe(true);
	});

	it('accepts wrapped explainer facts', () => {
		const grader = readRegexGrader(
			'evals/generation-explainer/graders/facts-present.md');
		const facts = [
			'A B-tree avoids a full\ntable scan. Writes cost more\nwork, so do\nnot add an index without a measured query.',
			'A B-tree means the engine need not inspect every row. Extra indexes slow writes, so do not automatically index every column.',
			'Without an index, the database may inspect every row. A B-tree narrows the search. More indexes mean write speed falls. Skip one for tiny tables.',
			'A B-tree avoids a full table scan. Indexes make writes more expensive and increase write work. Avoid unused indexes.',
			'An index uses a B-tree instead of reading every table row. Indexes add work to writes. Do not add an index by default.',
		];
		for (const prose of facts) expect(grader.test(prose)).toBe(true);
	});

	it('accepts wrapped launch facts', () => {
		const grader = readRegexGrader(
			'evals/generation-launch/graders/facts-present.md');
		const prose = [
			'QueueLens\n1.0 reads RabbitMQ dead-letter queues and groups by exception\ntype.',
			'It shows the first and latest\noccurrence and exports newline-delimited\nJSON.',
			'Use --confirm and ~/.queuelens.toml. There is no hosted\ncontrol\nplane.',
			'Install with brew\ninstall queuelens. MIT.',
		].join(' ');
		expect(grader.test(prose)).toBe(true);
	});
});
