import { describe, expect, it } from 'vitest';
import { chooseBotCard, chooseBotRow } from './bot';
import { createDeck, findTargetRow, rowPenalty, shuffle, MAX_ROW_LENGTH } from './rules';
import type { BotLevel, Card, Row } from './types';

/** Minimal headless game: every seat is a bot of the given level; returns each seat's bullheads. */
function playGame(levels: BotLevel[], random: () => number): number[] {
  const deck = shuffle(createDeck(), random);
  const hands: Card[][] = levels.map(() => deck.splice(0, 10));
  let rows: Row[] = Array.from({ length: 4 }, () => ({ cards: [deck.pop()!] }));
  const score = levels.map(() => 0);
  const seen: number[] = [];
  for (let turn = 0; turn < 10; turn++) {
    const picks = levels.map((level, i) => {
      const v = chooseBotCard({ hand: hands[i], rows, opponents: levels.length - 1, seen, level, random });
      hands[i] = hands[i].filter((c) => c.value !== v);
      return { seat: i, card: { value: v, bullheads: 0 } as Card };
    });
    picks.forEach((p) => (p.card = createDeck()[p.card.value - 1]));
    picks.sort((a, b) => a.card.value - b.card.value);
    for (const { seat, card } of picks) {
      seen.push(card.value);
      let target = findTargetRow(card, rows);
      if (target === -1) {
        target = chooseBotRow(rows);
        score[seat] += rowPenalty(rows[target].cards);
        rows = rows.map((r, i) => (i === target ? { cards: [card] } : r));
      } else if (rows[target].cards.length >= MAX_ROW_LENGTH) {
        score[seat] += rowPenalty(rows[target].cards);
        rows = rows.map((r, i) => (i === target ? { cards: [card] } : r));
      } else {
        rows = rows.map((r, i) => (i === target ? { cards: [...r.cards, card] } : r));
      }
    }
  }
  return score;
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('bot difficulty', () => {
  it('hard beats normal beats easy on average', () => {
    const levels: BotLevel[] = ['easy', 'normal', 'hard'];
    const totals = [0, 0, 0];
    const games = 900;
    const random = mulberry(42);
    for (let g = 0; g < games; g++) {
      // rotate seats so no level benefits from seat order
      const order = [0, 1, 2].map((i) => (i + g) % 3);
      const result = playGame(order.map((i) => levels[i]), random);
      order.forEach((lvl, seat) => (totals[lvl] += result[seat]));
    }
    const avg = totals.map((t) => t / games);
    console.log(`avg bullheads — easy ${avg[0].toFixed(1)} · normal ${avg[1].toFixed(1)} · hard ${avg[2].toFixed(1)}`);
    expect(avg[2]).toBeLessThan(avg[1]);
    expect(avg[1]).toBeLessThan(avg[0]);
  }, 120_000);
});
