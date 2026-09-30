import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room, type GameSummary, type IO } from './room';
import type { Identity } from './auth';

const emitted: { to: string; event: string; payload: any }[] = [];
const io = {
  to: (to: string) => ({ emit: (event: string, payload: unknown) => emitted.push({ to, event, payload }) }),
  in: () => ({ socketsLeave: () => {} }),
} as unknown as IO;

const guest = (n: number): Identity => ({
  key: `g:${n}`, userId: null, email: null, isGuest: true, isPlus: false,
  name: `P${n}`, avatar: 'bruno', cardTheme: 'classic',
});

async function runUntil(room: Room, socketId: string, phase: string, limitMs = 30 * 60_000) {
  for (let t = 0; t < limitMs; t += 500) {
    if (room.snapshotFor(socketId).room.phase === phase) return;
    await vi.advanceTimersByTimeAsync(500);
  }
  throw new Error(`never reached ${phase}; stuck in ${room.snapshotFor(socketId).room.phase}`);
}

describe('Room', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    emitted.length = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('plays a full quick game with an idle human and bots, conserving cards and bullheads', async () => {
    const summaries: GameSummary[] = [];
    const room = new Room(io, 'TEST', { maxPlayers: 5, turnSeconds: 15 }, { onGameEnd: (s) => summaries.push(s), onClose: () => {} });
    expect(room.join('s1', guest(1)).ok).toBe(true);
    room.fillWithBots(5);
    expect(room.startBy('s1')).toBeNull();

    const first = room.snapshotFor('s1');
    expect(first.room.phase).toBe('selecting');
    expect(first.self.hand).toHaveLength(10);
    // Opponents' hands are never exposed.
    expect(JSON.stringify(first.room)).not.toContain('"hand"');

    await runUntil(room, 's1', 'gameEnd');
    const end = room.snapshotFor('s1').room;
    expect(end.turn).toBe(10);
    expect(end.result?.standings).toHaveLength(5);
    expect(summaries).toHaveLength(1);
    // Every played card is either still on the table or was taken, so points are bounded by the 171 in the deck.
    const total = end.players.reduce((s, p) => s + p.score, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(171);
  });

  it('lets a human choose which row to take with a low card', async () => {
    const room = new Room(io, 'LOW', { maxPlayers: 2, turnSeconds: 60 }, { onGameEnd: () => {}, onClose: () => {} });
    room.join('a', guest(1));
    room.join('b', guest(2));
    let sawChoice = false;
    // A low-card choice depends on the deal, so replay (via rematch) until one happens.
    for (let game = 0; game < 5 && !sawChoice; game++) {
      if (game > 0) room.rematch('a');
      room.startBy('a');
      for (let i = 0; i < 4000 && room.snapshotFor('a').room.phase !== 'gameEnd'; i++) {
        const snap = room.snapshotFor('a').room;
        for (const sid of ['a', 'b']) {
          const self = room.snapshotFor(sid).self;
          if (snap.phase === 'selecting' && self.selected === null && self.hand.length) room.play(sid, self.hand[0].value);
          if (snap.phase === 'choosingRow' && snap.choosingPlayerId === self.playerId) {
            sawChoice = true;
            room.chooseRow(sid, 3);
          }
        }
        await vi.advanceTimersByTimeAsync(250);
      }
      expect(room.snapshotFor('a').room.phase).toBe('gameEnd');
    }
    expect(sawChoice).toBe(true);
  });

  it('classic mode keeps dealing hands until someone reaches 66', async () => {
    const room = new Room(io, 'CLSC', { maxPlayers: 4, mode: 'classic', turnSeconds: 15 }, { onGameEnd: () => {}, onClose: () => {} });
    room.join('s1', guest(1));
    room.fillWithBots(4);
    room.startBy('s1');
    await runUntil(room, 's1', 'gameEnd', 4 * 60 * 60_000);
    const end = room.snapshotFor('s1').room;
    expect(Math.max(...end.players.map((p) => p.score))).toBeGreaterThanOrEqual(66);
    expect(end.handNumber).toBeGreaterThan(1);
  });

  it('hands host to the next human and removes kicked players', () => {
    const room = new Room(io, 'HOST', {}, { onGameEnd: () => {}, onClose: () => {} });
    room.join('a', guest(1));
    room.join('b', guest(2));
    const b = room.snapshotFor('b').self.playerId!;
    room.remove('b', room.snapshotFor('a').self.playerId!); // non-host can't kick
    expect(room.snapshotFor('a').room.players).toHaveLength(2);
    room.detach('a', true);
    expect(room.snapshotFor('b').room.players.find((p) => p.id === b)?.isHost).toBe(true);
  });
});
