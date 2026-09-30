#!/usr/bin/env node
/**
 * Stability scenarios against a running server (local or deployed):
 *   1. reconnect — a player drops mid-game and comes back to the same seat and hand
 *   2. matchmaking — two strangers hit "Play online", land at the same public table, and bots fill it
 *   3. sync — two players see identical table state and replay with instant rematch
 *
 *   node scripts/scenarios.mjs            # http://localhost:3001
 *   SERVER_URL=https://… node scripts/scenarios.mjs
 */
import { io } from 'socket.io-client';

const url = process.env.SERVER_URL || 'http://localhost:3001';
const tag = Date.now().toString(36);
const connect = (name, guestId = `scn${name}${tag}`) =>
  new Promise((resolve, reject) => {
    const s = io(url, { transports: ['websocket'], forceNew: true, auth: { guestId, name, avatar: 'bruno' } });
    s.latest = null;
    s.on('room:state', (snap) => (s.latest = snap));
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
const ask = (s, event, payload) =>
  new Promise((resolve) => (payload === undefined ? s.emit(event, resolve) : s.emit(event, payload, resolve)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, label) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return;
    await wait(100);
  }
  throw new Error(`timed out: ${label}`);
};
const autoplay = (s) =>
  s.on('room:state', ({ room, self }) => {
    if (room.phase === 'selecting' && self.selected === null && self.hand.length) setTimeout(() => s.emit('game:play', self.hand[0].value), 20);
    if (room.phase === 'choosingRow' && room.choosingPlayerId === self.playerId) s.emit('game:chooseRow', 0);
  });

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// 1. reconnect -----------------------------------------------------------
{
  const a = await connect('Ana');
  const b = await connect('Ben');
  const { code } = await ask(a, 'room:create', { maxPlayers: 2, turnSeconds: 60 });
  await ask(b, 'room:join', { code });
  await ask(a, 'game:start');
  await until(() => a.latest?.room.phase === 'selecting', 5000, 'deal');
  const seatBefore = a.latest.self.playerId;
  const handBefore = a.latest.self.hand.map((c) => c.value).join(',');
  a.close();
  await wait(800);
  check('reconnect: dropped player shows as away', b.latest.room.players.find((p) => p.id === seatBefore)?.connected === false);
  const a2 = await connect('Ana', `scnAna${tag}`);
  const res = await ask(a2, 'room:join', { code });
  await until(() => a2.latest?.room.code === code, 5000, 'rejoin state');
  check('reconnect: same seat', res.ok && a2.latest.self.playerId === seatBefore);
  check('reconnect: same hand', a2.latest.self.hand.map((c) => c.value).join(',') === handBefore);
  check('reconnect: marked back online', !!a2.latest.room.players.find((p) => p.id === seatBefore)?.connected);
  a2.close();
  b.close();
}

// 2. matchmaking ---------------------------------------------------------
{
  const x = await connect('Xia');
  const y = await connect('Yui');
  const r1 = await ask(x, 'room:quickplay', { vsBots: false });
  const r2 = await ask(y, 'room:quickplay', { vsBots: false });
  check('matchmaking: strangers share a public table', r1.ok && r2.ok && r1.code === r2.code, r1.code);
  await until(() => x.latest?.room.code === r1.code, 5000, 'lobby state');
  check('matchmaking: countdown is running', typeof x.latest.room.deadline === 'number');
  const code = r1.code;
  await until(() => x.latest?.room.phase === 'selecting', 25_000, 'auto start');
  const players = x.latest.room.players;
  check('matchmaking: bots fill empty seats and the deal starts', players.length >= 4 && players.filter((p) => p.isBot).length >= 2, `${players.length} players`);
  x.emit('room:leave');
  y.emit('room:leave');
  x.close();
  y.close();
  void code;
}

// 3. sync + instant rematch ---------------------------------------------
{
  const p = await connect('Pia');
  const q = await connect('Qin');
  const { code } = await ask(p, 'room:create', { maxPlayers: 3, turnSeconds: 15 });
  await ask(q, 'room:join', { code });
  p.emit('room:addBot');
  await wait(200);
  autoplay(p);
  autoplay(q);
  await ask(p, 'game:start');
  let mismatches = 0;
  const probe = setInterval(() => {
    const a = p.latest?.room;
    const b = q.latest?.room;
    if (a && b && a.lastEvent?.id === b.lastEvent?.id && JSON.stringify(a.rows) !== JSON.stringify(b.rows)) mismatches++;
  }, 150);
  await until(() => p.latest?.room.phase === 'gameEnd' && q.latest?.room.phase === 'gameEnd', 90_000, 'game end');
  clearInterval(probe);
  check('sync: both players saw identical rows at every event', mismatches === 0, `${mismatches} mismatches`);
  check('sync: both see the same result', JSON.stringify(p.latest.room.result) === JSON.stringify(q.latest.room.result));
  p.emit('game:rematch', { instant: true });
  await until(() => q.latest?.room.phase === 'selecting' && q.latest.room.handNumber === 1, 5000, 'instant rematch');
  check('rematch: same room, same players, fresh deal', q.latest.room.code === code && q.latest.room.players.length === 3);
  check('rematch: tonight’s tally carried over', q.latest.room.players.every((pl) => pl.session.games === 1));
  p.close();
  q.close();
}

const failed = results.filter((r) => !r).length;
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${results.length} checks passed`);
process.exit(failed ? 1 : 0);
