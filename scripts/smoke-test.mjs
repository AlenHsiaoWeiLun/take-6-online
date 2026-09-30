#!/usr/bin/env node
/**
 * End-to-end smoke test: three guest clients create/join a room, add a bot,
 * and play a full quick game through the real server.
 *
 *   node scripts/smoke-test.mjs                         # against http://localhost:3001
 *   SERVER_URL=https://api.example.com node scripts/smoke-test.mjs
 */
import { io } from 'socket.io-client';

const url = process.env.SERVER_URL || 'http://localhost:3001';
const connect = (name) =>
  new Promise((resolve, reject) => {
    const s = io(url, { transports: ['websocket'], auth: { guestId: `smoke${name}${Date.now()}`, name, avatar: 'bruno' } });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
const ask = (s, event, payload) =>
  new Promise((resolve) => (payload === undefined ? s.emit(event, resolve) : s.emit(event, payload, resolve)));

const clients = await Promise.all(['Ana', 'Ben', 'Cy'].map(connect));
const [host, ...guests] = clients;
const created = await ask(host, 'room:create', { maxPlayers: 4, turnSeconds: 15 });
if (!created.ok) throw new Error(created.error);
console.log(`room ${created.code}`);
for (const g of guests) {
  const r = await ask(g, 'room:join', { code: created.code });
  if (!r.ok) throw new Error(r.error);
}

const latest = new Map();
let ended = null;
for (const c of clients) {
  c.on('room:state', (snap) => {
    latest.set(c, snap);
    const { room, self } = snap;
    if (room.phase === 'selecting' && self.selected === null && self.hand.length) {
      const card = self.hand[Math.floor(Math.random() * self.hand.length)].value;
      setTimeout(() => c.emit('game:play', card), 50 + Math.random() * 200);
    }
    if (room.phase === 'choosingRow' && room.choosingPlayerId === self.playerId) c.emit('game:chooseRow', 0);
    if (room.phase === 'gameEnd') ended = room;
  });
}

host.emit('room:addBot');
await new Promise((r) => setTimeout(r, 300));
const started = await ask(host, 'game:start');
if (!started.ok) throw new Error(started.error);

const deadline = Date.now() + 120_000;
while (!ended && Date.now() < deadline) await new Promise((r) => setTimeout(r, 250));
clients.forEach((c) => c.close());
if (!ended) {
  console.error('✘ game did not finish in time');
  process.exit(1);
}
console.log('✔ game finished');
for (const s of ended.result.standings) console.log(`  ${s.rank}. ${s.name.padEnd(12)} ${s.score}${s.isBot ? ' (bot)' : ''}`);
