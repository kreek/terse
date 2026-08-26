// Fetches public HTTP sources while refusing private-network and metadata hops.
import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList } from 'node:net';

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const BLOCKED_HOSTS = new Set(['metadata.google.internal']);
const BLOCKED_V4 = new BlockList();
const BLOCKED_V6 = new BlockList();

for (const [network, prefix] of [
	['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
	['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
	['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16],
	['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
	['224.0.0.0', 4], ['240.0.0.0', 4],
]) BLOCKED_V4.addSubnet(network, prefix, 'ipv4');

for (const [network, prefix] of [
	['::', 128], ['::1', 128], ['::ffff:0:0', 96], ['64:ff9b::', 96],
	['2001:db8::', 32], ['fc00::', 7], ['fec0::', 10], ['fe80::', 10],
	['ff00::', 8],
]) BLOCKED_V6.addSubnet(network, prefix, 'ipv6');

/**
 * Return whether an IP address is safe for a public-source request.
 *
 * @param {string} address - Numeric IPv4 or IPv6 address.
 * @param {number|string} family - Address family (`4`, `6`, `ipv4`, or `ipv6`).
 * @returns {boolean} True only when the address is outside blocked ranges.
 */
export function isPublicAddress(address, family) {
	const type = family === 6 || family === 'ipv6' ? 'ipv6' : 'ipv4';
	const blockList = type === 'ipv6' ? BLOCKED_V6 : BLOCKED_V4;
	return !blockList.check(address, type);
}

async function resolvePublicAddress(url, resolveHost) {
	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new Error(`unsupported source protocol ${url.protocol}`);
	}
	if (url.username || url.password) throw new Error('source URL credentials are not allowed');
	if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) {
		throw new Error(`refused private source ${url.hostname}`);
	}
	const addresses = await resolveHost(url.hostname, { all: true, verbatim: true });
	if (addresses.length === 0) throw new Error(`no address for ${url.hostname}`);
	if (addresses.some(({ address, family }) => !isPublicAddress(address, family))) {
		throw new Error(`refused private source ${url.hostname}`);
	}
	return addresses[0];
}

function readBody(response) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		response.on('data', (chunk) => {
			size += chunk.length;
			if (size > MAX_RESPONSE_BYTES) {
				response.destroy(new Error('source response exceeds 5 MiB'));
				return;
			}
			chunks.push(chunk);
		});
		response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
		response.on('error', reject);
	});
}

function responseFrom(response) {
	const status = response.statusCode ?? 0;
	if (status >= 300 && status < 400) {
		response.resume();
		if (!response.headers.location) {
			throw new Error(`HTTP ${status} redirect without location`);
		}
		return { redirect: response.headers.location };
	}
	if (status < 200 || status >= 300) {
		response.resume();
		throw new Error(`HTTP ${status}`);
	}
	return readBody(response).then((body) => ({ body, redirect: null }));
}

function requestAtAddress(url, address, timeout) {
	const client = url.protocol === 'https:' ? https : http;
	const options = {
		hostname: address.address,
		family: address.family,
		port: url.port || undefined,
		path: `${url.pathname}${url.search}`,
		method: 'GET',
		headers: { Host: url.host, 'User-Agent': 'Terse quote verifier',
			'Accept-Encoding': 'identity' },
		signal: AbortSignal.timeout(timeout),
	};
	if (url.protocol === 'https:') options.servername = url.hostname;
	return new Promise((resolve, reject) => {
		const request = client.request(options, (response) => {
			Promise.resolve().then(() => responseFrom(response))
				.then(resolve, reject);
		});
		request.on('error', reject);
		request.end();
	});
}

/**
 * Fetch a public HTTP source with DNS pinning, redirect checks, and size limits.
 *
 * @param {string} rawUrl - Absolute HTTP or HTTPS URL.
 * @param {number} timeout - Per-hop timeout in milliseconds.
 * @param {object} dependencies - Test-only resolver and request overrides.
 * @returns {Promise<string>} UTF-8 response body.
 * @throws {Error} For invalid URLs, unsafe destinations, request failures, or limits.
 */
export async function fetchPublicText(rawUrl, timeout,
		{ resolveHost = lookup, requestHop = requestAtAddress } = {}) {
	if (!Number.isFinite(timeout) || timeout <= 0) {
		throw new Error('source timeout must be a positive number');
	}
	let url = new URL(rawUrl);
	for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
		const address = await resolvePublicAddress(url, resolveHost);
		const response = await requestHop(url, address, timeout);
		if (!response.redirect) return response.body;
		if (redirects === MAX_REDIRECTS) throw new Error('too many redirects');
		const next = new URL(response.redirect, url);
		if (url.protocol === 'https:' && next.protocol === 'http:') {
			throw new Error('refused HTTPS downgrade redirect');
		}
		url = next;
	}
	throw new Error('too many redirects');
}
