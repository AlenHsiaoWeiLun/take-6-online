import express, { type Router } from 'express';
import { features } from './env';
import { prisma } from './db';
import { userFromRequest } from './auth';
import { plusPrice } from './billing';
import type { RoomManager } from './rooms';

export function apiRoutes(rooms: RoomManager): Router {
  const router = express.Router();

  router.get('/api/health', (_req, res) => res.json({ ok: true, ...rooms.stats }));

  router.get('/api/config', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ features, plusPrice: await plusPrice() });
  });

  router.get('/api/rooms', (_req, res) => res.json({ rooms: rooms.publicRooms() }));

  router.get('/api/me', async (req, res) => {
    const user = await userFromRequest(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    const profile = prisma ? await prisma.profile.findUnique({ where: { id: user.id } }) : null;
    if (!profile) return res.json({ profile: null });
    const { stripeCustomerId: _omit, ...safe } = profile;
    res.json({ profile: safe });
  });

  router.get('/api/leaderboard', async (_req, res) => {
    if (!prisma) return res.json({ players: [] });
    res.set('Cache-Control', 'public, max-age=60');
    const players = await prisma.profile.findMany({
      where: { onlineGames: { gte: 3 } },
      orderBy: [{ onlineWins: 'desc' }, { onlineGames: 'asc' }],
      take: 50,
      select: { id: true, displayName: true, avatar: true, isPlus: true, onlineGames: true, onlineWins: true, totalBullheads: true, gamesPlayed: true },
    });
    res.json({
      players: players.map(({ id: _id, ...p }, i) => ({
        rank: i + 1,
        ...p,
        avgBullheads: p.gamesPlayed ? Math.round((p.totalBullheads / p.gamesPlayed) * 10) / 10 : 0,
      })),
    });
  });

  return router;
}
