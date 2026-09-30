import express, { type Router } from 'express';
import Stripe from 'stripe';
import { env, features } from './env';
import { prisma } from './db';
import { userFromRequest } from './auth';
import type { RoomManager } from './rooms';

const PRODUCT = 'plus_lifetime';
const stripe = features.payments ? new Stripe(env.stripeSecretKey) : null;

let cachedPrice: { amount: number; currency: string } | null = null;
export async function plusPrice() {
  if (!stripe) return null;
  if (cachedPrice) return cachedPrice;
  try {
    const price = await stripe.prices.retrieve(env.stripePricePlus);
    cachedPrice = { amount: price.unit_amount ?? 0, currency: price.currency };
  } catch (error) {
    console.error('[billing] could not load price', error);
  }
  return cachedPrice;
}

async function grantPlus(session: Stripe.Checkout.Session, rooms: RoomManager) {
  const profileId = session.client_reference_id || session.metadata?.profileId;
  if (!prisma || !profileId || session.payment_status !== 'paid') return false;
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

  await prisma.$transaction([
    prisma.purchase.upsert({
      where: { stripeSessionId: session.id },
      update: {},
      create: {
        profileId,
        product: PRODUCT,
        stripeSessionId: session.id,
        paymentIntentId,
        amountTotal: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
      },
    }),
    prisma.profile.update({
      where: { id: profileId },
      data: { isPlus: true, plusSince: new Date(), ...(customerId ? { stripeCustomerId: customerId } : {}) },
    }),
  ]);
  rooms.refreshUser(profileId, { isPlus: true });
  return true;
}

async function revokeForPaymentIntent(paymentIntentId: string, rooms: RoomManager) {
  if (!prisma) return;
  const purchase = await prisma.purchase.findUnique({ where: { paymentIntentId } });
  if (!purchase) return;
  await prisma.$transaction([
    prisma.purchase.update({ where: { id: purchase.id }, data: { refunded: true } }),
    prisma.profile.update({ where: { id: purchase.profileId }, data: { isPlus: false } }),
  ]);
  rooms.refreshUser(purchase.profileId, { isPlus: false, cardTheme: 'classic' });
}

/** Must be mounted before express.json(): Stripe signs the raw body. */
export function stripeWebhook(rooms: RoomManager): Router {
  const router = express.Router();
  router.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe || !env.stripeWebhookSecret) return res.status(503).send('payments disabled');
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, env.stripeWebhookSecret);
    } catch (error) {
      return res.status(400).send(`Webhook Error: ${(error as Error).message}`);
    }
    try {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
          await grantPlus(event.data.object, rooms);
          break;
        case 'charge.refunded': {
          const pi = event.data.object.payment_intent;
          if (pi) await revokeForPaymentIntent(typeof pi === 'string' ? pi : pi.id, rooms);
          break;
        }
      }
      res.json({ received: true });
    } catch (error) {
      console.error('[billing] webhook handler failed', error);
      res.status(500).send('handler error');
    }
  });
  return router;
}

export function billingRoutes(rooms: RoomManager): Router {
  const router = express.Router();

  router.post('/api/billing/checkout', async (req, res) => {
    if (!stripe || !prisma) return res.status(503).json({ error: 'Payments are not configured yet.' });
    const user = await userFromRequest(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Sign in to buy Plus.' });
    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found. Reconnect and try again.' });
    if (profile.isPlus) return res.status(409).json({ error: 'You already have Plus.' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: env.stripePricePlus, quantity: 1 }],
      client_reference_id: profile.id,
      metadata: { profileId: profile.id, product: PRODUCT },
      ...(profile.stripeCustomerId
        ? { customer: profile.stripeCustomerId }
        : { customer_creation: 'always' as const, customer_email: profile.email ?? user.email ?? undefined }),
      allow_promotion_codes: true,
      success_url: `${env.webUrl}/plus/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.webUrl}/plus`,
    });
    res.json({ url: session.url });
  });

  /** Fallback for the success page in case the webhook is slow or misconfigured. */
  router.get('/api/billing/verify', async (req, res) => {
    if (!stripe) return res.status(503).json({ error: 'Payments are not configured yet.' });
    const user = await userFromRequest(req.headers.authorization);
    const sessionId = String(req.query.session_id ?? '');
    if (!user || !sessionId.startsWith('cs_')) return res.status(400).json({ error: 'Bad request' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== user.id) return res.status(403).json({ error: 'Not your session' });
    const granted = await grantPlus(session, rooms);
    res.json({ isPlus: granted });
  });

  return router;
}
