import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const script = join(HERE, '..', 'scripts', 'eval-score.mjs');

describe('eval-score combined grammar path', () => {
	it('includes Harper findings while reusing one checker across arms', () => {
		const path = join(mkdtempSync(join(tmpdir(), 'terse-eval-score-')), 'result.json');
		writeFileSync(path, JSON.stringify({ cases: [{
			name: 'grammar-fixture',
			tags: ['grammar'],
			deliverables: ['notes.md'],
			arms: {
				with: [{ files: { 'notes.md': 'She goes home.' } }],
				without: [{ files: { 'notes.md': 'She go home.' } }],
			},
		}] }));
		const result = spawnSync(process.execPath, [script, path], { encoding: 'utf8' });
		expect(result.status).toBe(0);
		expect(result.stdout).toContain('delta grammar-fixture: 333.3 fewer flags/kword');
		expect(result.stdout).toContain('eval-score: improvement demonstrated');
	});
});
