import { describe, it, expect } from 'vitest';
import { chooseBotCard } from './bot';
import { makeCard } from './rules';

const row = (...values: number[]) => ({ cards: values.map(makeCard) });

describe('bot', () => {
  it('avoids playing the sixth card onto a full row', () => {
    const rows = [row(10, 11, 12, 13, 14), row(60), row(80), row(95)];
    const hand = [makeCard(15), makeCard(61)];
    const choice = chooseBotCard({ hand, rows, opponents: 3, seen: [], level: 'hard', random: mulberry(1) });
    expect(choice).toBe(61);
  });

  it('always returns a card from the hand', () => {
    const rows = [row(3), row(40), row(70), row(100)];
    const hand = [1, 2, 50, 104].map(makeCard);
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const v = chooseBotCard({ hand, rows, opponents: 5, seen: [], level });
      expect(hand.map((c) => c.value)).toContain(v);
    }
  });
});

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
