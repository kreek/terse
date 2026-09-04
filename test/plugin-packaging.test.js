import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

describe('plugin packaging', () => {
	it('exposes the skills through a Codex plugin manifest', () => {
		const manifest = readJson('.codex-plugin/plugin.json');
		const hooks = readJson('hooks/hooks.json');
		expect(manifest.name).toBe('terse');
		expect(manifest.skills).toBe('./skills/');
		expect(manifest).not.toHaveProperty('hooks');
		expect(manifest.interface.capabilities).toContain('Write');
		expect(hooks.hooks.PostToolUse[0].matcher).toBe('Write|Edit');
		expect(hooks.hooks.PostToolUse[0].hooks[0]).toHaveProperty('commandWindows');
	});

	it('keeps the Codex and Claude package versions aligned', () => {
		const codex = readJson('.codex-plugin/plugin.json');
		const claude = readJson('.claude-plugin/plugin.json');
		const pkg = readJson('package.json');
		expect(codex.version).toBe(pkg.version);
		expect(claude.version).toBe(pkg.version);
	});

	it('publishes the root plugin through the Codex marketplace', () => {
		const marketplace = readJson('.agents/plugins/marketplace.json');
		const terse = marketplace.plugins.find((plugin) => plugin.name === 'terse');
		expect(marketplace.name).toBe('terse');
		expect(terse.source).toEqual({ source: 'local', path: './' });
		expect(terse.policy).toEqual({
			installation: 'AVAILABLE',
			authentication: 'ON_INSTALL',
		});
	});
});
