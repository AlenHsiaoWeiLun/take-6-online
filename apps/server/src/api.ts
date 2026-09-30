import express, { type Router } from 'express';
import { LEADERBOARD_MIN_GAMES } from '@take6/shared';
import { env, features } from './env';
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
    const rank =
      profile.ratedGames >= LEADERBOARD_MIN_GAMES
        ? 1 + (await prisma!.profile.count({ where: { ratedGames: { gte: LEADERBOARD_MIN_GAMES }, rating: { gt: profile.rating } } }))
        : null;
    res.json({ profile: { ...safe, rank, provisional: profile.ratedGames < LEADERBOARD_MIN_GAMES } });
  });

  router.get('/api/leaderboard', async (_req, res) => {
    if (!prisma) return res.json({ players: [], minGames: LEADERBOARD_MIN_GAMES });
    res.set('Cache-Control', 'public, max-age=60');
    const players = await prisma.profile.findMany({
      where: { ratedGames: { gte: LEADERBOARD_MIN_GAMES } },
      orderBy: [{ rating: 'desc' }, { ratedGames: 'desc' }],
      take: 100,
      select: { displayName: true, avatar: true, isPlus: true, rating: true, peakRating: true, ratedGames: true, gamesWon: true, gamesPlayed: true },
    });
    res.json({
      minGames: LEADERBOARD_MIN_GAMES,
      players: players.map((p, i) => ({
        rank: i + 1,
        displayName: p.displayName,
        avatar: p.avatar,
        isPlus: p.isPlus,
        rating: p.rating,
        peakRating: p.peakRating,
        games: p.ratedGames,
        winRate: p.gamesPlayed ? Math.round((p.gamesWon / p.gamesPlayed) * 100) : 0,
      })),
    });
  });

  const feedbackLimiter = new Map<string, number[]>();
  router.post('/api/feedback', async (req, res) => {
    const body = req.body ?? {};
    const message = String(body.message ?? '').trim().slice(0, 4000);
    const topic = ['bug', 'idea', 'payment', 'other'].includes(body.topic) ? body.topic : 'other';
    const email = String(body.email ?? '').trim().slice(0, 200);
    const name = String(body.name ?? '').trim().slice(0, 80);
    if (message.length < 5) return res.status(400).json({ error: 'Please write a little more.' });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'That email doesn’t look right.' });
    if (body.website) return res.json({ ok: true }); // honeypot field: bots fill it, people never see it

    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const recent = (feedbackLimiter.get(ip) ?? []).filter((t) => now - t < 3_600_000);
    if (recent.length >= 5) return res.status(429).json({ error: 'Too many messages — please try again later.' });
    feedbackLimiter.set(ip, [...recent, now]);

    const user = await userFromRequest(req.headers.authorization);
    if (!prisma) return res.status(503).json({ error: 'Messages are not available yet — please email us instead.' });
    await prisma.feedback.create({
      data: {
        profileId: user?.id ?? null,
        name: name || null,
        email: email || user?.email || null,
        topic,
        message,
        page: String(body.page ?? '').slice(0, 200) || null,
        userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300) || null,
      },
    });
    void notifyFeedback({ topic, message, email: email || user?.email || '', name });
    res.json({ ok: true });
  });

  return router;
}

/** Optional: forward new feedback by email through Resend when it's configured. */
async function notifyFeedback(f: { topic: string; message: string; email: string; name: string }) {
  if (!env.resendApiKey || !env.feedbackTo) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.feedbackFrom,
        to: [env.feedbackTo],
        reply_to: f.email || undefined,
        subject: `[Bullheads ${f.topic}] ${f.message.slice(0, 60)}`,
        text: `${f.message}\n\n— ${f.name || 'anonymous'} ${f.email ? `<${f.email}>` : ''}`,
      }),
    });
  } catch (error) {
    console.error('[feedback] email failed', error);
  }
}
