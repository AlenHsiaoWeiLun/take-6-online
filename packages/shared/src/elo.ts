import type { BotLevel } from './types';

export const DEFAULT_RATING = 1200;
/** Bots are fixed rating anchors: beating easy bots over and over quickly stops paying. */
export const BOT_RATINGS: Record<BotLevel, number> = { easy: 900, normal: 1150, hard: 1400 };
/** Rated games needed before a player appears on the public leaderboard. */
export const LEADERBOARD_MIN_GAMES = 5;

export interface EloEntry {
  id: string;
  rating: number;
  /** 1 = best. Ties share a rank. */
  rank: number;
  /** Only signed-in humans move; bots and guests act as anchors. */
  rated: boolean;
  /** Rated games played so far (new players move faster). */
  games: number;
}

/**
 * Multiplayer Elo: every table is scored as a round-robin of head-to-head results
 * (beat, tie, lost to each opponent), and K is split across opponents so a 10-player
 * game swings about as much as a 1v1.
 */
export function eloDeltas(entries: EloEntry[], baseK = 32): Map<string, number> {
  const deltas = new Map<string, number>();
  const opponents = entries.length - 1;
  if (opponents < 1) return deltas;
  for (const a of entries) {
    if (!a.rated) continue;
    const k = (a.games < 10 ? baseK * 1.5 : baseK) / opponents;
    let sum = 0;
    for (const b of entries) {
      if (b === a) continue;
      const actual = a.rank < b.rank ? 1 : a.rank === b.rank ? 0.5 : 0;
      const expected = 1 / (1 + 10 ** ((b.rating - a.rating) / 400));
      sum += actual - expected;
    }
    deltas.set(a.id, Math.round(k * sum));
  }
  return deltas;
}
