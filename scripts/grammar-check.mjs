// Adapter around the pinned Harper runtime. Harper owns tokenization and its
// grammar rules; Terse owns rule admission, output shape, and false-positive
// policy. No upstream rule is enabled merely because Harper enables it.
import { webcrypto } from 'node:crypto';
import { LocalLinter, Dialect } from '../vendor/harper-2.7.0/index.js';
import { binary } from '../vendor/harper-2.7.0/binary.js';

// Harper's WASM glue reads Web Crypto from the global. Node 18 exposes the
// implementation from node:crypto but does not define the global in script
// files unless an experimental flag is set.
if (!globalThis.crypto) {
	Object.defineProperty(globalThis, 'crypto', { value: webcrypto,
		configurable: true });
}

const ADMITTED_RULES = [
	'AnA',
	'CommaFixes',
	'ItsPossessive',
	'ModalOf',
	'NounVerbConfusion',
	'PronounVerbAgreement',
	'RepeatedWords',
];

const DIALECTS = {
	american: Dialect.American,
	british: Dialect.British,
	australian: Dialect.Australian,
	canadian: Dialect.Canadian,
	indian: Dialect.Indian,
};

// These adjacent forms are grammatical at common clause and phrasal-verb
// boundaries. Harper's repeated-word rule does not use enough context to tell
// them from accidental duplication, so precision wins and Terse leaves them.
const VALID_REPEATED_WORDS = new Set([
	'a a', 'had had', 'in in', 'is is', 'on on', 'that that', 'this this',
]);

export function normalizeGrammarConfig(grammar) {
	if (grammar === undefined) return { spelling: false, dialect: 'american', words: [] };
	if (!grammar || typeof grammar !== 'object' || Array.isArray(grammar)) {
		throw new Error('.terse/config.json: grammar must be an object');
	}
	const spelling = grammar.spelling ?? false;
	if (typeof spelling !== 'boolean') {
		throw new Error('.terse/config.json: grammar.spelling must be a boolean');
	}
	if (grammar.dialect !== undefined && !Object.hasOwn(DIALECTS, grammar.dialect)) {
		throw new Error('.terse/config.json: grammar.dialect must be american, british, ' +
			'australian, canadian, or indian');
	}
	if (spelling && grammar.dialect === undefined) {
		throw new Error('.terse/config.json: grammar.dialect is required when grammar.spelling is true');
	}
	if (grammar.words !== undefined && !Array.isArray(grammar.words)) {
		throw new Error('.terse/config.json: grammar.words must be an array of strings');
	}
	const words = [];
	for (const word of grammar.words ?? []) {
		if (typeof word !== 'string') {
			throw new Error('.terse/config.json: grammar.words must be an array of strings');
		}
		const clean = word.trim();
		if (clean && !words.includes(clean)) words.push(clean);
	}
	return { spelling, dialect: grammar.dialect ?? 'american', words };
}

function configKey(config) {
	return JSON.stringify({ ...config, words: [...config.words].sort() });
}

async function createChecker(config) {
	const linter = new LocalLinter({ binary, dialect: DIALECTS[config.dialect] });
	try {
		await linter.setup();
		const defaults = await linter.getDefaultLintConfig();
		const inventory = [...ADMITTED_RULES, 'SpellCheck'];
		const enabled = [...ADMITTED_RULES, ...(config.spelling ? ['SpellCheck'] : [])];
		const missing = inventory.filter((rule) => !(rule in defaults));
		if (missing.length) {
			throw new Error(`Harper 2.7.0 is missing admitted rule(s): ${missing.join(', ')}`);
		}
		await linter.setLintConfig(Object.fromEntries(
			Object.keys(defaults).map((rule) => [rule, enabled.includes(rule)])));
		if (config.words.length) await linter.importWords(config.words);
		return linter;
	} catch (err) {
		try { await linter.dispose(); } catch { /* keep the setup error */ }
		throw err;
	}
}

function uniqueSuggestions(lint) {
	return [...new Set(lint.suggestions()
		.map((suggestion) => suggestion.get_replacement_text())
		.filter((suggestion) => typeof suggestion === 'string'))];
}

function findingOf(rawText, file, ruleId, lint, spelling) {
	const span = lint.span();
	const start = span.start;
	const end = span.end;
	if (!Number.isInteger(start) || !Number.isInteger(end) ||
			start < 0 || end <= start || end > rawText.length) return null;
	const match = rawText.slice(start, end);
	if (ruleId === 'RepeatedWords' &&
		VALID_REPEATED_WORDS.has(match.toLowerCase().replace(/\s+/g, ' '))) return null;
	const suggestions = uniqueSuggestions(lint)
		.filter((suggestion) => suggestion !== match);
	if (spelling) {
		if (suggestions.length === 0) return null;
		return { file, category: 'grammar', match, span: [start, end],
			hint: `check spelling; try ${suggestions.map((s) => `"${s}"`).join(', ')}`,
			engine: 'harper', ruleId: `harper/${ruleId}`, suggestions };
	}
	if (suggestions.length !== 1) return null;
	return { file, category: 'grammar', match, span: [start, end],
		hint: `use "${suggestions[0]}"`, engine: 'harper',
		ruleId: `harper/${ruleId}`, suggestions };
}

export function createGrammarPool() {
	const checkers = new Map();
	let disposed = false;
	return {
		async check(rawText, { file = '(text)', grammar } = {}) {
			if (disposed) throw new Error('grammar checker pool is disposed');
			const config = normalizeGrammarConfig(grammar);
			const key = configKey(config);
			let pending = checkers.get(key);
			if (!pending) {
				pending = createChecker(config);
				checkers.set(key, pending);
			}
			const linter = await pending;
			const groups = await linter.organizedLints(rawText, { language: 'markdown' });
			const findings = [];
			for (const [ruleId, lints] of Object.entries(groups)) {
				const spelling = ruleId === 'SpellCheck';
				if (!ADMITTED_RULES.includes(ruleId) && !(config.spelling && spelling)) continue;
				for (const lint of lints) {
					const finding = findingOf(rawText, file, ruleId, lint, spelling);
					if (finding) findings.push(finding);
				}
			}
			return findings;
		},
		async dispose() {
			if (disposed) return;
			disposed = true;
			const settled = await Promise.allSettled(checkers.values());
			await Promise.all(settled.filter((x) => x.status === 'fulfilled')
				.map((x) => x.value.dispose()));
			checkers.clear();
		},
	};
}

export { ADMITTED_RULES };
