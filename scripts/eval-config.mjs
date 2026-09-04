// Builds the minimal Codex configuration needed by the isolated A/B runner.

function readScalar(config, key) {
	return config.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm'))?.[1] ?? null;
}

/**
 * Return an isolated Codex config without copying unrelated settings or secrets.
 *
 * @param {string} sourceConfig - The user's Codex TOML configuration.
 * @param {boolean} terseEnabled - Whether the Terse arm is enabled.
 * @returns {string} Minimal TOML for one evaluation arm.
 * @throws {Error} When the source config does not select a model.
 */
export function buildEvalConfig(sourceConfig, terseEnabled) {
	const model = readScalar(sourceConfig, 'model');
	if (!model) throw new Error('Codex config has no model for A/B setup');
	const optional = ['model_reasoning_effort', 'service_tier']
		.map((key) => [key, readScalar(sourceConfig, key)])
		.filter(([, value]) => value)
		.map(([key, value]) => `${key} = ${value}`);
	return [
		`model = ${model}`,
		...optional,
		'',
		'[plugins."terse@terse"]',
		`enabled = ${terseEnabled}`,
		'',
	].join('\n');
}
