import { SeatIndex, Position } from './types';

export const getRelativePosition = (mySeatIndex: SeatIndex | null, targetSeatIndex: number): Position => {
  if (mySeatIndex === null) {
    // Spectator view: map 0->bottom, 1->left, 2->top, 3->right
    if (targetSeatIndex === 0) return 'bottom';
    if (targetSeatIndex === 1) return 'left';
    if (targetSeatIndex === 2) return 'top';
    return 'right';
  }

  const diff = (targetSeatIndex - mySeatIndex + 4) % 4;
  switch (diff) {
    case 0: return 'bottom';
    case 1: return 'left';
    case 2: return 'top';
    case 3: return 'right';
    default: return 'bottom';
  }
};

export const BOT_NAMES = [
  'BullBot', 'ChaosCow', 'SafeSteve', 'MooMancer',
  'HornLord', 'MilkDealer', 'RedBarn', 'SirMoo',
  'Haywire', 'VelvetHorn'
];

export const COLORS = [
  '#F87171', // Red
  '#60A5FA', // Blue
  '#34D399', // Green
  '#FBBF24'  // Yellow
];
