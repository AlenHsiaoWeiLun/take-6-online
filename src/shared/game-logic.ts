import { Card } from './types';

export const getBullheads = (value: number): number => {
  if (value === 55) return 7;
  if (value % 11 === 0) return 5;
  if (value % 10 === 0) return 3;
  if (value % 5 === 0) return 2;
  return 1;
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (let i = 1; i <= 104; i++) {
    deck.push({ value: i, bullheads: getBullheads(i) });
  }
  return deck;
};

export const shuffle = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const calculateRowBullheads = (cards: Card[]): number => {
  return cards.reduce((sum, card) => sum + card.bullheads, 0);
};

export const findTargetRow = (card: Card, rows: { cards: Card[] }[]): number => {
  let targetIndex = -1;
  let minDiff = Infinity;

  rows.forEach((row, index) => {
    const lastCard = row.cards[row.cards.length - 1];
    if (card.value > lastCard.value) {
      const diff = card.value - lastCard.value;
      if (diff < minDiff) {
        minDiff = diff;
        targetIndex = index;
      }
    }
  });

  return targetIndex;
};
