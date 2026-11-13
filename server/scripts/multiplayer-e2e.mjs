#!/usr/bin/env node
/**
 * Neon multiplayer end-to-end test with TWO real API accounts and WebSockets.
 * Use only against a disposable database: accounts and matches are intentionally
 * retained so the CI service container can be discarded after the test.
 *
 * Local:  node scripts/multiplayer-e2e.mjs
 * Public: NEON_E2E_ALLOW_PUBLIC=1 node scripts/multiplayer-e2e.mjs --public-write
 * Public mode WRITES real users/matches. It is never run by GitHub Actions.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';

const publicWrite = process.argv.includes('--public-write');
if (publicWrite && process.env.NEON_E2E_ALLOW_PUBLIC !== '1') {
  console.error('Public writes blocked: set NEON_E2E_ALLOW_PUBLIC=1 explicitly.');
  process.exit(2);
}
const base = (publicWrite
  ? process.env.NEON_PUBLIC_URL || 'https://dulmens.dk/neon'
  : process.env.NEON_E2E_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const parsed = new URL(base);
if (!publicWrite && !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) {
  console.error('Refusing write test against a non-local host without --public-write.');
  process.exit(2);
}

const apiBase = `${base}/api`;
const wsUrl = `${base.replace(/^http/, 'ws')}/ws`;
const sockets = [];
const deadlineMs = 110_000;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const startedAt = Date.now();

async function request(path, { method = 'GET', token, body, status = 200 } = {}) {
  const response = await fetch(apiBase + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
    redirect: 'manual'
  });
  assert.equal(response.status, status, `${method} ${path}: expected HTTP ${status}, received ${response.status}`);
  return status === 204 ? null : response.json();
}

function connectedPlayer(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { handshakeTimeout: 8_000 });
    sockets.push(ws);
    const player = { ws, messages: [], closed: false, error: null, lastState: null };
    const timer = setTimeout(() => reject(new Error('WebSocket authentication timed out')), 9_000);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
    ws.on('message', raw => {
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      player.messages.push(message);
      if (player.messages.length > 150) player.messages.shift();
      if (message.type === 'game_state') player.lastState = message;
      if (message.type === 'authenticated') { clearTimeout(timer); resolve(player); }
    });
    ws.on('error', error => { player.error = error; clearTimeout(timer); reject(error); });
    ws.on('close', code => { player.closed = true; player.closeCode = code; });
  });
}

async function until(label, condition, timeoutMs = 8_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const value = condition();
    if (value) return value;
    await delay(40);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
  console.log(`Neon E2E target: ${base} (${publicWrite ? 'PUBLIC WRITE' : 'local isolated DB required'})`);
  const health = await request('/health');
  assert.equal(health.ok, true);
  console.log('PASS API health');

  const suffix = randomBytes(5).toString('hex');
  const password = randomBytes(24).toString('base64url');
  const a = await request('/auth/register', { method: 'POST', body: { username: `neon_e2e_a_${suffix}`, password }, status: 201 });
  const b = await request('/auth/register', { method: 'POST', body: { username: `neon_e2e_b_${suffix}`, password }, status: 201 });
  assert.notEqual(a.user.id, b.user.id);
  console.log('PASS registered two unique temporary players');

  const aLogin = await request('/auth/login', { method: 'POST', body: { username: a.user.username, password } });
  const bLogin = await request('/auth/login', { method: 'POST', body: { username: b.user.username, password } });
  assert.equal(aLogin.user.id, a.user.id);
  assert.equal(bLogin.user.id, b.user.id);
  console.log('PASS both login sessions');

  const pa = await connectedPlayer(aLogin.token);
  const pb = await connectedPlayer(bLogin.token);
  console.log('PASS both authenticated WebSocket connections');

  const invitation = await request('/invitations', { method: 'POST', token: aLogin.token, body: { recipientId: b.user.id }, status: 201 });
  await until('invitation notification', () => pb.messages.find(m => m.type === 'invitation_received' && m.invitationId === invitation.invitationId));
  const match = await request(`/invitations/${invitation.invitationId}/accept`, { method: 'POST', token: bLogin.token });
  assert.equal(match.status, 'active');
  assert.equal(match.topId, a.user.id);
  assert.equal(match.bottomId, b.user.id);
  await until('both match_started events', () =>
    pa.messages.some(m => m.type === 'match_started' && m.matchId === match.matchId) &&
    pb.messages.some(m => m.type === 'match_started' && m.matchId === match.matchId));
  console.log('PASS invitation accepted and same match started for both players');

  let framesA = 0;
  let framesB = 0;
  let seenPoint = false;
  let finished;
  while (Date.now() - startedAt < deadlineMs) {
    assert.equal(pa.closed, false, 'Player A WebSocket closed unexpectedly');
    assert.equal(pb.closed, false, 'Player B WebSocket closed unexpectedly');
    const snapA = pa.lastState, snapB = pb.lastState;
    if (snapA?.matchId === match.matchId) framesA++;
    if (snapB?.matchId === match.matchId) framesB++;
    if (pa.messages.some(m => m.type === 'point') || pb.messages.some(m => m.type === 'point')) seenPoint = true;
    finished = pa.messages.find(m => m.type === 'match_finished' && m.matchId === match.matchId);
    if (finished) break;
    // Deliberately avoid the ball so that a genuine server-scored match ends.
    // Server owns physics, points, winning conditions and DB settlement.
    const ballX = snapA?.ball?.x ?? 195;
    const farSide = ballX < 195 ? 328 : 62;
    for (const player of [pa, pb]) {
      player.ws.send(JSON.stringify({ type: 'paddle', matchId: match.matchId, x: farSide }));
    }
    await delay(90);
  }
  assert.ok(finished, `Score-based match did not complete within ${deadlineMs / 1000}s`);
  const finishedB = await until('player B match_finished', () => pb.messages.find(m => m.type === 'match_finished' && m.matchId === match.matchId));
  assert.deepEqual({ winnerId: finishedB.winnerId, topScore: finishedB.topScore, bottomScore: finishedB.bottomScore },
    { winnerId: finished.winnerId, topScore: finished.topScore, bottomScore: finished.bottomScore });
  assert.equal(finished.reason, 'score');
  assert.ok(finished.topScore === 7 || finished.bottomScore === 7, 'Match must finish at seven points');
  assert.ok(seenPoint, 'Neither player received a point notification');
  assert.ok(framesA > 0 && framesB > 0, 'Both players must receive game snapshots');
  console.log(`PASS real server-scored match: ${finished.topScore}-${finished.bottomScore}, winner ${finished.winnerId}`);

  const record = await request(`/matches/${match.matchId}`, { token: aLogin.token });
  assert.equal(record.match.status, 'finished');
  assert.equal(Number(record.match.winner_id), finished.winnerId);
  assert.equal(record.match.finish_reason, 'score');
  assert.equal(Number(record.match.top_score), finished.topScore);
  assert.equal(Number(record.match.bottom_score), finished.bottomScore);
  const historyA = await request('/matches/history', { token: aLogin.token });
  const historyB = await request('/matches/history', { token: bLogin.token });
  const entryA = historyA.matches.find(m => m.id === match.matchId);
  const entryB = historyB.matches.find(m => m.id === match.matchId);
  assert.ok(entryA && entryB, 'Both player histories must include the match');
  assert.equal(entryA.opponentId, b.user.id);
  assert.equal(entryB.opponentId, a.user.id);
  assert.notEqual(entryA.outcome, entryB.outcome);
  console.log('PASS persisted match and participant-scoped histories');

  const winnerToken = finished.winnerId === a.user.id ? aLogin.token : bLogin.token;
  const loserToken = finished.winnerId === a.user.id ? bLogin.token : aLogin.token;
  const winner = await request('/me', { token: winnerToken });
  const loser = await request('/me', { token: loserToken });
  assert.deepEqual(winner.stats, { wins: 1, losses: 0, points: 1030 });
  assert.deepEqual(loser.stats, { wins: 0, losses: 1, points: 990 });
  const profile = await request(`/players/${b.user.id}/profile`, { token: aLogin.token });
  assert.equal(profile.headToHead.played, 1);
  const leaderboard = await request('/leaderboard');
  // Global top-ten may contain established players on a public server.
  if (!publicWrite) assert.ok(leaderboard.top.some(p => p.userId === finished.winnerId && p.points === 1030));
  console.log('PASS rankings, profiles and head-to-head statistics');

  await request('/auth/logout', { method: 'POST', token: aLogin.token, status: 204 });
  await request('/auth/logout', { method: 'POST', token: bLogin.token, status: 204 });
  console.log('PASS logout and session invalidation requests');
  console.log(`PASSED Neon multiplayer E2E in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  if (publicWrite) console.log(`PUBLIC TEST DATA REMAINS: player IDs ${a.user.id}, ${b.user.id}; match ID ${match.matchId}. Review manually before deleting.`);
}

try { await main(); }
catch (error) { console.error(`FAIL Neon multiplayer E2E: ${error.message}`); process.exitCode = 1; }
finally { for (const ws of sockets) ws.terminate(); }
