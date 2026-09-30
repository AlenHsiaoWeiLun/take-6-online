import { prisma } from './db';
import type { GameSummary } from './room';

export async function recordGame(summary: GameSummary) {
  if (!prisma) return;
  const humans = summary.standings.filter((s) => !s.isBot);
  const online = humans.length >= 2;
  try {
    await prisma.$transaction([
      prisma.match.create({
        data: {
          roomCode: summary.code,
          mode: summary.mode,
          playerCount: summary.standings.length,
          humanCount: humans.length,
          hands: summary.hands,
          startedAt: summary.startedAt,
          players: {
            create: summary.standings.map((s) => ({
              profileId: s.userId,
              name: s.name,
              isBot: s.isBot,
              score: s.score,
              rank: s.rank,
            })),
          },
        },
      }),
      ...humans
        .filter((s) => s.userId)
        .map((s) =>
          prisma!.profile.update({
            where: { id: s.userId! },
            data: {
              gamesPlayed: { increment: 1 },
              gamesWon: { increment: s.rank === 1 ? 1 : 0 },
              onlineGames: { increment: online ? 1 : 0 },
              onlineWins: { increment: online && s.rank === 1 ? 1 : 0 },
              totalBullheads: { increment: s.score },
            },
          }),
        ),
    ]);
  } catch (error) {
    console.error('[stats] failed to record game', error);
  }
}
