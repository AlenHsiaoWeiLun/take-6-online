import { describe, it, expect } from 'vitest';
import { getBullheads, createDeck, findTargetRow } from './game-logic';

describe('Take 6 Game Logic', () => {
  it('calculates bullheads correctly', () => {
    expect(getBullheads(55)).toBe(7);
    expect(getBullheads(11)).toBe(5);
    expect(getBullheads(10)).toBe(3);
    expect(getBullheads(5)).toBe(2);
    expect(getBullheads(1)).toBe(1);
  });

  it('creates a deck of 104 cards', () => {
    const deck = createDeck();
    expect(deck.length).toBe(104);
    expect(deck[0].value).toBe(1);
    expect(deck[103].value).toBe(104);
  });

  it('finds the correct target row', () => {
    const rows = [
      { cards: [{ value: 10, bullheads: 3 }] },
      { cards: [{ value: 20, bullheads: 3 }] },
      { cards: [{ value: 30, bullheads: 3 }] },
      { cards: [{ value: 40, bullheads: 3 }] }
    ];

    // Card 25 should go to row 2 (last card 20)
    expect(findTargetRow({ value: 25, bullheads: 2 }, rows)).toBe(1);
    
    // Card 5 should go to no row (must choose)
    expect(findTargetRow({ value: 5, bullheads: 2 }, rows)).toBe(-1);
    
    // Card 45 should go to row 4 (last card 40)
    expect(findTargetRow({ value: 45, bullheads: 2 }, rows)).toBe(3);
  });
});
