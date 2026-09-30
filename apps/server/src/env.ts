const list = (value: string | undefined, fallback: string[]) =>
  value ? value.split(',').map((s) => s.trim()).filter(Boolean) : fallback;

export const env = {
  port: Number(process.env.PORT || 3001),
  isProd: process.env.NODE_ENV === 'production',
  webOrigins: list(process.env.WEB_ORIGINS, ['http://localhost:5173']),
  webUrl: process.env.WEB_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  supabaseUrl: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripePricePlus: process.env.STRIPE_PRICE_PLUS || '',
  botEngine: (process.env.BOT_ENGINE || 'builtin') as 'builtin' | 'fai',
};

export const features = {
  db: !!env.databaseUrl,
  auth: !!(env.supabaseUrl || env.supabaseJwtSecret),
  payments: !!(env.stripeSecretKey && env.stripePricePlus && env.databaseUrl),
};
