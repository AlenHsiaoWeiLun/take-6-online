import type { Card, Row } from './types';

export const DECK_SIZE = 104;
export const HAND_SIZE = 10;
export const ROW_COUNT = 4;
/** A row "fills" at 5 cards; whoever plays the 6th card takes the row. */
export const MAX_ROW_LENGTH = 5;
export const CLASSIC_TARGET = 66;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;

export const getBullheads = (value: number): number => {
  if (value === 55) return 7;
  if (value % 11 === 0) return 5;
  if (value % 10 === 0) return 3;
  if (value % 5 === 0) return 2;
  return 1;
};

export const makeCard = (value: number): Card => ({ value, bullheads: getBullheads(value) });

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (let i = 1; i <= DECK_SIZE; i++) deck.push(makeCard(i));
  return deck;
};

export const shuffle = <T>(array: T[], random: () => number = Math.random): T[] => {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const rowPenalty = (cards: Card[]): number =>
  cards.reduce((sum, card) => sum + card.bullheads, 0);

/** Index of the row a card must go to, or -1 if the card is lower than every row end. */
export const findTargetRow = (card: Card | number, rows: Row[]): number => {
  const value = typeof card === 'number' ? card : card.value;
  let target = -1;
  let minDiff = Infinity;
  rows.forEach((row, index) => {
    const last = row.cards[row.cards.length - 1];
    if (last && value > last.value && value - last.value < minDiff) {
      minDiff = value - last.value;
      target = index;
    }
  });
  return target;
};

/** Row a player is forced to take with a low card when they don't choose: fewest bullheads, then shortest. */
export const cheapestRow = (rows: Row[]): number => {
  let best = 0;
  rows.forEach((row, index) => {
    const a = rowPenalty(row.cards);
    const b = rowPenalty(rows[best].cards);
    if (a < b || (a === b && row.cards.length < rows[best].cards.length)) best = index;
  });
  return best;
};

/** Standard competition ranking (1,1,3) by ascending score. */
export const rankScores = (scores: number[]): number[] =>
  scores.map((score) => 1 + scores.filter((other) => other < score).length);
