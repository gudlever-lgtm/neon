#!/usr/bin/env node
/** Neon reliability E2E: isolated database only; never run against production. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';

if (process.env.NEON_E2E_ISOLATED_DB !== '1') {
  console.error('Refusing writes: set NEON_E2E_ISOLATED_DB=1 for an isolated test database.');
  process.exit(2);
}
const base = (process.env.NEON_E2E_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) {
  console.error('Reliability tests require a loopback address.');
  process.exit(2);
}
const api = base + '/api';
const socketUrl = base.replace(/^http/, 'ws') + '/ws';
const sockets = [];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(path, token, method = 'GET', body, expected = 200) {
  const response = await fetch(api + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(8_000)
  });
  assert.equal(response.status, expected, `${method} ${path}: expected ${expected}, received ${response.status}`);
  return expected === 204 ? null : response.json();
}

async function eventually(label, check, timeout = 8_000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const result = await check();
    if (result) return result;
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function socket(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(socketUrl, { handshakeTimeout: 6_000 });
    sockets.push(ws);
    const peer = { ws, events: [], closed: false };
    const timeout = setTimeout(() => reject(new Error('WebSocket auth timeout')), 7_000);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
    ws.on('message', bytes => {
      let event;
      try { event = JSON.parse(bytes.toString()); } catch { return; }
      peer.events.push(event);
      if (peer.events.length > 50) peer.events.shift();
      if (event.type === 'authenticated') { clearTimeout(timeout); resolve(peer); }
    });
    ws.on('error', error => { clearTimeout(timeout); reject(error); });
    ws.on('close', () => { peer.closed = true; });
  });
}

async function close(peer) {
  peer.ws.close(1000, 'Test disconnect');
  await eventually('socket close', () => peer.closed);
}

async function createMatch(a, b) {
  const invitation = await request('/invitations', a.token, 'POST', { recipientId: b.id }, 201);
  const match = await request(`/invitations/${invitation.invitationId}/accept`, b.token, 'POST');
  assert.equal(match.status, 'active');
  return match.matchId;
}

async function run() {
  const suffix = randomBytes(5).toString('hex');
  const password = randomBytes(24).toString('base64url');
  const a = await request('/auth/register', null, 'POST', { username: `neon_rel_a_${suffix}`, password }, 201);
  const b = await request('/auth/register', null, 'POST', { username: `neon_rel_b_${suffix}`, password }, 201);
  const A = { id: a.user.id, token: a.token };
  const B = { id: b.user.id, token: b.token };
  const pa = await socket(A.token);
  let pb = await socket(B.token);

  // Reconnect inside the 20-second grace window; the match must survive.
  const first = await createMatch(A, B);
  await eventually('initial game state', () => pb.events.find(e => e.type === 'game_state' && e.matchId === first));
  await close(pb);
  await wait(350);
  pb = await socket(B.token);
  await eventually('restored match state', () => pb.events.find(e => e.type === 'game_state' && e.matchId === first));
  const current = await request('/matches/current', B.token);
  assert.equal(current.match.matchId, first);
  console.log('PASS reconnect keeps the active match');

  // Repeated forfeit must not settle (or rank) the same match twice.
  await request(`/matches/${first}/forfeit`, B.token, 'POST');
  await eventually('forfeit event', () => pa.events.find(e => e.type === 'match_finished' && e.matchId === first));
  await request(`/matches/${first}/forfeit`, B.token, 'POST', undefined, 404);
  const firstRecord = await request(`/matches/${first}`, A.token);
  assert.equal(firstRecord.match.finish_reason, 'forfeit');
  assert.equal(Number(firstRecord.match.winner_id), A.id);
  console.log('PASS duplicate forfeit cannot settle twice');

  // The server must award a disconnect win after its 20-second grace period.
  const second = await createMatch(A, B);
  await close(pb);
  await eventually('disconnect settlement', async () => {
    const result = await request(`/matches/${second}`, A.token);
    return result.match.status === 'finished' ? result.match : null;
  }, 28_000).then(result => {
    assert.equal(result.finish_reason, 'disconnect');
    assert.equal(Number(result.winner_id), A.id);
  });
  const history = await request('/matches/history', A.token);
  assert.equal(history.matches.filter(m => m.id === first).length, 1);
  assert.equal(history.matches.filter(m => m.id === second).length, 1);
  const stats = await request('/me', A.token);
  assert.deepEqual(stats.stats, { wins: 2, losses: 0, points: 1060 });
  console.log('PASS disconnect victory after grace period and single counted results');

  await request('/auth/logout', A.token, 'POST', undefined, 204);
  await request('/auth/logout', B.token, 'POST', undefined, 204);
  console.log('PASSED Neon multiplayer reliability E2E');
}

try { await run(); }
catch (error) { console.error('FAIL Neon multiplayer reliability:', error.message); process.exitCode = 1; }
finally { for (const ws of sockets) ws.terminate(); }
