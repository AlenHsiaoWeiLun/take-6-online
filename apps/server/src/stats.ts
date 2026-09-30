import { BOT_RATINGS, DEFAULT_RATING, eloDeltas } from '@take6/shared';
import { prisma } from './db';
import type { GameSummary } from './room';

export type RatingUpdates = Record<string, { rating: number; delta: number }>;

/** Persists the match, updates stats and Elo, and returns each rated player's new rating. */
export async function recordGame(summary: GameSummary): Promise<RatingUpdates> {
  if (!prisma) return {};
  const db = prisma;
  const humans = summary.standings.filter((s) => !s.isBot);
  const online = humans.length >= 2;
  const userIds = humans.map((s) => s.userId).filter((id): id is string => !!id);

  try {
    const profiles = new Map(
      (await db.profile.findMany({ where: { id: { in: userIds } }, select: { id: true, rating: true, ratedGames: true, peakRating: true } })).map(
        (p) => [p.id, p],
      ),
    );
    const entries = summary.standings.map((s) => {
      const profile = s.userId ? profiles.get(s.userId) : undefined;
      return {
        id: s.playerId,
        rank: s.rank,
        rated: !!profile,
        games: profile?.ratedGames ?? 0,
        rating: profile?.rating ?? (s.isBot ? BOT_RATINGS[summary.botLevel] : DEFAULT_RATING),
      };
    });
    const deltas = eloDeltas(entries);
    const updates: RatingUpdates = {};

    await db.$transaction([
      db.match.create({
        data: {
          roomCode: summary.code,
          mode: summary.mode,
          playerCount: summary.standings.length,
          humanCount: humans.length,
          hands: summary.hands,
          startedAt: summary.startedAt,
          players: {
            create: summary.standings.map((s) => {
              const profile = s.userId ? profiles.get(s.userId) : undefined;
              return {
                profileId: profile ? s.userId : null,
                name: s.name,
                isBot: s.isBot,
                score: s.score,
                rank: s.rank,
                ratingBefore: profile?.rating ?? null,
                ratingDelta: profile ? deltas.get(s.playerId) ?? 0 : null,
              };
            }),
          },
        },
      }),
      ...humans.flatMap((s) => {
        const profile = s.userId ? profiles.get(s.userId) : undefined;
        if (!profile) return [];
        const delta = deltas.get(s.playerId) ?? 0;
        const rating = Math.max(100, profile.rating + delta);
        updates[s.playerId] = { rating, delta };
        return [
          db.profile.update({
            where: { id: profile.id },
            data: {
              rating,
              peakRating: Math.max(profile.peakRating, rating),
              ratedGames: { increment: 1 },
              gamesPlayed: { increment: 1 },
              gamesWon: { increment: s.rank === 1 ? 1 : 0 },
              onlineGames: { increment: online ? 1 : 0 },
              onlineWins: { increment: online && s.rank === 1 ? 1 : 0 },
              totalBullheads: { increment: s.score },
            },
          }),
        ];
      }),
    ]);
    return updates;
  } catch (error) {
    console.error('[stats] failed to record game', error);
    return {};
  }
}
