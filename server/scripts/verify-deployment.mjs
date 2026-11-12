#!/usr/bin/env node
/**
 * Read-only Neon deployment verification. Node >=20 and the installed 'ws' package.
 *
 * Local backend:
 *   node scripts/verify-deployment.mjs
 * Public HTTPS/lighttpd proxy:
 *   node scripts/verify-deployment.mjs --public
 *
 * No registrations, invitations, database writes, or game sessions.
 */
import { WebSocket } from 'ws';

const external = process.argv.includes('--public');
const base = external
  ? (process.env.NEON_PUBLIC_URL || 'https://dulmens.dk/neon').replace(/\/$/, '')
  : (process.env.NEON_LOCAL_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const wsUrl = base.replace(/^http/, 'ws') + (external ? '/ws' : '/ws');
const api = base + '/api';
const results = [];

async function check(label, fn) {
  try {
    const detail = await fn();
    results.push({ label, passed: true, detail });
    console.log('PASS', label, '-', detail);
  } catch (err) {
    results.push({ label, passed: false, detail: err.message });
    console.error('FAIL', label, '-', err.message);
  }
}
async function jsonResponse(path, status) {
  const response = await fetch(api + path, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(7000),
    redirect: 'manual'
  });
  if (response.status !== status) {
    throw new Error('Expected HTTP ' + status + ', got HTTP ' + response.status);
  }
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object') throw new Error('Expected a JSON response');
  return data;
}

await check('API health and DB ping', async () => {
  const data = await jsonResponse('/health', 200);
  if (data.ok !== true) throw new Error('Health did not return ok=true');
  if (data.version !== '0.10.0') throw new Error('API code is not current: ' + data.version);
  return 'v' + data.version;
});
await check('Leaderboard read', async () => {
  const data = await jsonResponse('/leaderboard', 200);
  if (!Array.isArray(data.top)) throw new Error('Leaderboard top must be an array');
  return data.top.length + ' ranked players';
});
await check('History requires login', async () => {
  const data = await jsonResponse('/matches/history', 401);
  if (!data.error) throw new Error('Missing auth error');
  return 'HTTP 401';
});
await check('Player profile requires login', async () => {
  const data = await jsonResponse('/players/1/profile', 401);
  if (!data.error) throw new Error('Missing auth error');
  return 'HTTP 401';
});
await check('WebSocket reaches the Neon service', () => new Promise((resolve, reject) => {
  let opened = false, done = false;
  const socket = new WebSocket(wsUrl, { handshakeTimeout: 7000 });
  const timer = setTimeout(() => finish(new Error('WebSocket timed out')), 8500);
  function finish(error, msg) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    socket.terminate();
    if (error) reject(error); else resolve(msg);
  }
  socket.once('open', () => {
    opened = true;
    // Intentionally send no authentication. A valid Neon server rejects after 5s.
  });
  socket.once('error', error => finish(error));
  socket.once('close', (code) => {
    if (!opened) return finish(new Error('WebSocket never opened'));
    if (code !== 4001) return finish(new Error('Expected unauthenticated timeout 4001, got ' + code));
    finish(null, 'Handshake OK; unauthenticated connection rejected (4001)');
  });
}));

const failed = results.filter(r => !r.passed).length;
console.log('\n' + (failed ? 'FAILED' : 'PASSED') + ' ' + (results.length - failed) + '/' + results.length + ' read-only checks against ' + base);
if (external) console.log('Public route requires lighttpd proxy for /neon/api/* and /neon/ws.');
process.exitCode = failed ? 1 : 0;
