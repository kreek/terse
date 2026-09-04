#!/usr/bin/env node
// Local acceptance benchmark for the always-on grammar path. This measures
// Harper's in-process setup and checking cost, not end-to-end hook process
// startup. Run on an otherwise idle machine for comparable numbers.
import { performance } from 'node:perf_hooks';
import { createGrammarPool } from './grammar-check.mjs';

const COLD_LIMIT_MS = 750;
const WARM_LIMIT_MS = 100;
const BYTES = 10 * 1024;
const SAMPLE = [
	'# Deployment notes\n\n',
	'The service reads the manifest, checks each entry, and writes the result. ',
	'Operators can review the report before the deployment starts.\n\n',
].join('');
const document = SAMPLE.repeat(Math.ceil(BYTES / SAMPLE.length)).slice(0, BYTES);
const pool = createGrammarPool();

try {
	const coldStart = performance.now();
	await pool.check(document);
	const coldMs = performance.now() - coldStart;

	const samples = [];
	for (let i = 0; i < 5; i++) {
		const start = performance.now();
		await pool.check(document);
		samples.push(performance.now() - start);
	}
	samples.sort((a, b) => a - b);
	const warmMs = samples[Math.floor(samples.length / 2)];
	const result = {
		bytes: Buffer.byteLength(document),
		coldMs: Number(coldMs.toFixed(1)),
		warmMedianMs: Number(warmMs.toFixed(1)),
		limitsMs: { cold: COLD_LIMIT_MS, warm: WARM_LIMIT_MS },
	};
	console.log(JSON.stringify(result, null, 2));
	if (coldMs >= COLD_LIMIT_MS || warmMs >= WARM_LIMIT_MS) process.exitCode = 1;
} finally {
	await pool.dispose();
}
