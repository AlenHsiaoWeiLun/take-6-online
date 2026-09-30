import { describe, it, expect } from 'vitest';
import { getBullheads, createDeck, findTargetRow, cheapestRow, rankScores, makeCard } from './rules';

const row = (...values: number[]) => ({ cards: values.map(makeCard) });

describe('rules', () => {
  it('scores bullheads like the physical deck', () => {
    expect(getBullheads(55)).toBe(7);
    expect(getBullheads(11)).toBe(5);
    expect(getBullheads(10)).toBe(3);
    expect(getBullheads(5)).toBe(2);
    expect(getBullheads(1)).toBe(1);
    const total = createDeck().reduce((s, c) => s + c.bullheads, 0);
    expect(total).toBe(171);
  });

  it('creates 104 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(104);
    expect(new Set(deck.map((c) => c.value)).size).toBe(104);
  });

  it('finds the row with the closest lower end', () => {
    const rows = [row(10), row(20), row(30), row(40)];
    expect(findTargetRow(25, rows)).toBe(1);
    expect(findTargetRow(5, rows)).toBe(-1);
    expect(findTargetRow(45, rows)).toBe(3);
  });

  it('picks the cheapest row for forced takes', () => {
    expect(cheapestRow([row(55), row(10, 11), row(2, 3), row(4)])).toBe(3);
  });

  it('ranks ties together', () => {
    expect(rankScores([5, 3, 5, 10])).toEqual([2, 1, 2, 4]);
  });
});
