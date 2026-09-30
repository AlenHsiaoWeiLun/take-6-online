import type { BotLevel, Card, Row } from './types';
import { DECK_SIZE, MAX_ROW_LENGTH, cheapestRow, getBullheads, rowPenalty } from './rules';

export interface BotContext {
  hand: Card[];
  rows: Row[];
  /** Number of other players who will also play a card this turn. */
  opponents: number;
  /** Card values already out of the unknown pool (played earlier or on the table). */
  seen: Iterable<number>;
  level: BotLevel;
  random?: () => number;
}

/** Difficulty knobs, measured by bot-strength.test.ts (hard < normal < easy in average bullheads). */
export const BOT_TUNING = {
  sims: { easy: 4, normal: 30, hard: 500 } as Record<BotLevel, number>,
  lookahead: { easy: 0, normal: 0, hard: 0 } as Record<BotLevel, number>,
  noise: { easy: 2.5, normal: 1.6, hard: 0.01 } as Record<BotLevel, number>,
  /** Chance a bot just throws a random card instead of thinking. */
  randomPlay: { easy: 0.65, normal: 0.2, hard: 0 } as Record<BotLevel, number>,
};

interface SimRow {
  last: number;
  length: number;
  penalty: number;
}

/** Penalty the bot would take by playing `mine` against the sampled opponent cards. */
const simulate = (rows: SimRow[], mine: number, others: number[], lookahead: number): number => {
  const table = rows.map((r) => ({ ...r }));
  const cards = [mine, ...others].sort((a, b) => a - b);
  let cost = 0;
  for (const value of cards) {
    let target = -1;
    for (let i = 0; i < table.length; i++) {
      if (table[i].last < value && (target === -1 || table[i].last > table[target].last)) target = i;
    }
    const bulls = getBullheads(value);
    if (target === -1) {
      let cheapest = 0;
      for (let i = 1; i < table.length; i++) if (table[i].penalty < table[cheapest].penalty) cheapest = i;
      if (value === mine) cost += table[cheapest].penalty;
      table[cheapest] = { last: value, length: 1, penalty: bulls };
    } else if (table[target].length >= MAX_ROW_LENGTH) {
      if (value === mine) cost += table[target].penalty;
      table[target] = { last: value, length: 1, penalty: bulls };
    } else {
      const r = table[target];
      table[target] = { last: value, length: r.length + 1, penalty: r.penalty + bulls };
    }
  }
  // Look-ahead (hard bots weigh it more): a card left as the 5th or 4th in a row invites a take later,
  // and a row full of heads makes that worse.
  const landed = table.find((r) => r.last === mine);
  if (landed && landed.length === MAX_ROW_LENGTH) cost += lookahead * (0.6 + landed.penalty * 0.12);
  else if (landed && landed.length === MAX_ROW_LENGTH - 1) cost += lookahead * 0.25;
  return cost;
};

export const chooseBotCard = (ctx: BotContext): number => {
  const random = ctx.random ?? Math.random;
  const hand = ctx.hand.map((c) => c.value);
  if (hand.length === 1) return hand[0];
  if (random() < BOT_TUNING.randomPlay[ctx.level]) return hand[Math.floor(random() * hand.length)];

  const excluded = new Set<number>([...ctx.seen, ...hand]);
  ctx.rows.forEach((r) => r.cards.forEach((c) => excluded.add(c.value)));
  const pool: number[] = [];
  for (let v = 1; v <= DECK_SIZE; v++) if (!excluded.has(v)) pool.push(v);

  const rows: SimRow[] = ctx.rows.map((r) => ({
    last: r.cards[r.cards.length - 1].value,
    length: r.cards.length,
    penalty: rowPenalty(r.cards),
  }));

  const sims = BOT_TUNING.sims[ctx.level];
  const lookahead = BOT_TUNING.lookahead[ctx.level];
  const opponents = Math.min(ctx.opponents, pool.length);
  const totals = new Map<number, number>(hand.map((v) => [v, 0]));
  const sample = [...pool];

  for (let s = 0; s < sims; s++) {
    // Partial Fisher–Yates: the first `opponents` entries become this simulation's opponent cards.
    for (let i = 0; i < opponents; i++) {
      const j = i + Math.floor(random() * (sample.length - i));
      [sample[i], sample[j]] = [sample[j], sample[i]];
    }
    const others = sample.slice(0, opponents);
    for (const v of hand) totals.set(v, totals.get(v)! + simulate(rows, v, others, lookahead));
  }

  let best = hand[0];
  let bestScore = Infinity;
  for (const v of hand) {
    const noise = random() * BOT_TUNING.noise[ctx.level];
    const score = totals.get(v)! / sims + noise;
    if (score < bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
};

export const chooseBotRow = (rows: Row[]): number => cheapestRow(rows);
