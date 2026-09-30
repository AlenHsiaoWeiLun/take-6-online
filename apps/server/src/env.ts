const list = (value: string | undefined, fallback: string[]) =>
  value ? value.split(',').map((s) => s.trim()).filter(Boolean) : fallback;

export const env = {
  port: Number(process.env.PORT || 3001),
  isProd: process.env.NODE_ENV === 'production',
  webOrigins: list(process.env.WEB_ORIGINS, ['http://localhost:5173']),
  webUrl: process.env.WEB_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  /** InsForge project base URL, e.g. https://xxxx.ap-southeast.insforge.app (auth tokens are verified against its JWKS). */
  insforgeUrl: (process.env.INSFORGE_URL || '').replace(/\/$/, ''),
  supabaseUrl: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripePricePlus: process.env.STRIPE_PRICE_PLUS || '',
  botEngine: (process.env.BOT_ENGINE || 'builtin') as 'builtin' | 'fai',
  resendApiKey: process.env.RESEND_API_KEY || '',
  feedbackTo: process.env.FEEDBACK_TO || '',
  feedbackFrom: process.env.FEEDBACK_FROM || 'Bullheads <feedback@bullheadsonline.com>',
};

export const features = {
  db: !!env.databaseUrl,
  auth: !!(env.insforgeUrl || env.supabaseUrl || env.supabaseJwtSecret),
  payments: !!(env.stripeSecretKey && env.stripePricePlus && env.databaseUrl),
};
