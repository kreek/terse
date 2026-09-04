// Proves isolated Codex eval homes carry only the settings the runner needs.
import { describe, expect, it } from 'vitest';
import { buildEvalConfig } from '../scripts/eval-config.mjs';

describe('Codex eval configuration', () => {
	it('preserves model settings and the selected Terse arm', () => {
		const source = [
			'model = "gpt-test"',
			'model_reasoning_effort = "high"',
			'service_tier = "default"',
		].join('\n');
		expect(buildEvalConfig(source, false)).toBe([
			'model = "gpt-test"',
			'model_reasoning_effort = "high"',
			'service_tier = "default"',
			'',
			'[plugins."terse@terse"]',
			'enabled = false',
			'',
		].join('\n'));
	});

	it('drops MCP servers, environment values, and credentials', () => {
		const source = [
			'model = "gpt-test"',
			'[mcp_servers.example]',
			'command = "secret-bearing-command"',
			'[mcp_servers.example.env]',
			'ACCESS_TOKEN = "sensitive-value"',
		].join('\n');
		const isolated = buildEvalConfig(source, true);
		expect(isolated).not.toContain('mcp_servers');
		expect(isolated).not.toContain('ACCESS_TOKEN');
		expect(isolated).not.toContain('sensitive-value');
		expect(isolated).toContain('enabled = true');
	});

	it('fails closed when no model is configured', () => {
		expect(() => buildEvalConfig('[plugins."terse@terse"]\nenabled = true', true))
			.toThrow('Codex config has no model');
	});
});
