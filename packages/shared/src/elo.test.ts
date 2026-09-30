import { describe, expect, it } from 'vitest';
import { eloDeltas } from './elo';

const p = (id: string, rating: number, rank: number, rated = true, games = 20) => ({ id, rating, rank, rated, games });

describe('eloDeltas', () => {
  it('rewards the winner and penalises the loser symmetrically for equal ratings', () => {
    const d = eloDeltas([p('a', 1200, 1), p('b', 1200, 2)]);
    expect(d.get('a')).toBe(16);
    expect(d.get('b')).toBe(-16);
  });

  it('gives nothing for a tie between equals', () => {
    const d = eloDeltas([p('a', 1200, 1), p('b', 1200, 1)]);
    expect(d.get('a')).toBe(0);
  });

  it('pays less for beating a much weaker field', () => {
    const vsWeak = eloDeltas([p('a', 1500, 1), p('b', 900, 2, false), p('c', 900, 3, false)]).get('a')!;
    const vsEqual = eloDeltas([p('a', 1500, 1), p('b', 1500, 2, false), p('c', 1500, 3, false)]).get('a')!;
    expect(vsWeak).toBeLessThan(vsEqual);
    expect(vsWeak).toBeGreaterThanOrEqual(0);
  });

  it('only moves rated players and scales K by table size', () => {
    const d = eloDeltas([p('a', 1200, 1), p('bot1', 1150, 2, false), p('bot2', 1150, 3, false), p('bot3', 1150, 4, false)]);
    expect([...d.keys()]).toEqual(['a']);
    expect(d.get('a')!).toBeLessThanOrEqual(32);
  });

  it('moves provisional players faster', () => {
    const fresh = eloDeltas([p('a', 1200, 1, true, 0), p('b', 1200, 2)]).get('a')!;
    const vet = eloDeltas([p('a', 1200, 1, true, 50), p('b', 1200, 2)]).get('a')!;
    expect(fresh).toBeGreaterThan(vet);
  });
});
