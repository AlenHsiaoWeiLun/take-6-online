# Launch guide

The stack is **GitHub** (code) → **Railway** (game server) + **Vercel** (website) → **Supabase** (Postgres via Prisma, plus Auth) → **Stripe** (Plus purchases) → **AdSense** (ads) → **Cloudflare** (domain/DNS).

Budget about an hour. Do everything in Stripe **test mode** first, and switch to live keys at the end.

Throughout this guide, `play.example.com` is the website and `api.example.com` is the game server. Replace them with your own domains.

---

## Current setup (InsForge)

The live stack is **Vercel** (website) + **InsForge** (Postgres, sign-in, game server on InsForge Compute / Fly.io, region `sin`).

| Piece | Where |
|---|---|
| Website | `https://bullheads.vercel.app` (Vercel project `bullheads-online`; the old `bullheads-online.vercel.app` 308-redirects here) |
| Game server | InsForge Compute service `bullheads-server` — deploy with `scripts/deploy-server-insforge.sh` |
| Database | InsForge project `bullheads-online` (`npx @insforge/cli db connection-string`) |
| Sign-in | InsForge auth: Google + 6-digit email code. The server verifies tokens via `INSFORGE_URL/.well-known/jwks.json` |

**Redeploy the server:** link a folder once (`npx @insforge/cli link --project-id <id>`), keep production secrets in `apps/server/.env.production` (gitignored), then run
`INSFORGE_PROJECT_DIR=<linked folder> scripts/deploy-server-insforge.sh`. It packages the committed code, applies migrations and ships the image.

**Free-plan limits to watch:** 120 compute hours a month (the server scales to zero when idle, so only active time counts, with a few seconds of cold start on the first visit), 500 MB database, and projects pause after a week of inactivity. Upgrade to Pro, or run the server always-on (`--always-on`), before real traffic arrives.

The Supabase and Railway sections below remain as an alternative path.

## 0. Pick a name

"Take 6!" and "6 nimmt!" are AMIGO Spiele trademarks. Ad networks and payment processors can suspend accounts over trademark complaints, so launch under your own brand:

1. `apps/web/src/brand.ts`: `name`, `short`, `plus`, `supportEmail`, `company`
2. `apps/web/index.html`: `<title>` and meta tags
3. `scripts/art-prompts.json`: any mention of the name, then `npm run art -- --force --only=logo-mark,og-cover`

"Inspired by the classic bullhead card game" is fine to say. Don't use their logo or card art.

## 1. GitHub

```bash
git add -A && git commit -m "Launch-ready monorepo"
git remote add origin git@github.com:<you>/<repo>.git   # if not set
git push -u origin launch/v1
```

Merge into `main` once you're happy. Railway and Vercel both deploy from `main` by default.

## 2. Supabase (database + auth)

1. Create a project at supabase.com.
2. **Connect → ORMs → Prisma** gives you two strings:
   - `DATABASE_URL`: the **transaction pooler** (port 6543). Append `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL`: the **direct / session** connection (port 5432). Used only for migrations.
3. **Authentication → Providers → Google**: enable it. In Google Cloud Console, create an OAuth client (Web) with the redirect URI Supabase shows (`https://<ref>.supabase.co/auth/v1/callback`), then paste the client ID and secret back into Supabase. Email magic links work out of the box.
4. **Authentication → URL Configuration**:
   - Site URL: `https://play.example.com`
   - Redirect URLs: `https://play.example.com/**` and `http://localhost:5173/**`
5. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key** for Vercel.
6. **Project Settings → JWT**: newer projects use asymmetric signing keys, and the server verifies them through the project's JWKS automatically. If your project still uses the **legacy JWT secret**, copy it into `SUPABASE_JWT_SECRET` on Railway.

The first Railway deploy creates the tables (`prisma migrate deploy`). The migration also enables Row Level Security on every table, so Supabase's public Data API can't read or edit profiles.

## 3. Railway (game server)

1. **New Project → Deploy from GitHub repo**, and pick this repo. Railway reads `railway.json`: it builds `apps/server/Dockerfile`, runs migrations before each deploy, and health-checks `/api/health`.
2. **Variables**:

   | Variable | Value |
   |---|---|
   | `WEB_ORIGINS` | `https://play.example.com,https://<project>.vercel.app` |
   | `WEB_URL` | `https://play.example.com` |
   | `DATABASE_URL` / `DIRECT_URL` | from step 2 |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_JWT_SECRET` | only for legacy-secret projects |
   | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PLUS` | from step 6 |
   | `BOT_ENGINE` | `builtin` |

   Railway sets `PORT` itself.
3. **Settings → Networking → Custom Domain**: add `api.example.com` and note the CNAME target it gives you.
4. Keep **one replica**. Rooms live in server memory, so running more than one instance needs sticky sessions plus the Socket.IO Redis adapter. A redeploy ends games in progress, so deploy at quiet hours.

## 4. Vercel (website)

1. **Add New → Project** and import the repo. Leave **Root Directory** as the repo root; `vercel.json` sets the install, build and output folder.
2. **Environment Variables** (Production):

   | Variable | Value |
   |---|---|
   | `VITE_SERVER_URL` | `https://api.example.com` |
   | `VITE_SITE_URL` | `https://play.example.com` |
   | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | from step 2 |
   | `VITE_ADSENSE_CLIENT` / `VITE_ADSENSE_SLOT_BANNER` / `VITE_ADSENSE_SLOT_RESULTS` | from step 7 (add later, then redeploy) |
   | `VITE_SHOW_AD_PLACEHOLDERS` | `false` |
3. **Settings → Domains**: add `play.example.com` and note the DNS record Vercel asks for.

## 5. Cloudflare (DNS)

In **DNS → Records**:

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `play` | the value Vercel shows (e.g. `cname.vercel-dns.com`) | **DNS only** (grey cloud) |
| CNAME | `api` | the value Railway shows (`xxxx.up.railway.app`) | **DNS only** at first |

- Vercel recommends DNS-only so it can issue and renew certificates.
- For Railway, wait until the custom domain shows as verified with a certificate. After that you can switch `api` to **Proxied** (orange cloud) if you want Cloudflare's DDoS protection: set **SSL/TLS → Full (strict)**, and WebSockets work by default.
- For an apex domain (`example.com`) on Vercel, use the A record Vercel shows. Cloudflare's CNAME flattening also works.

## 6. Stripe (Plus)

1. **Product catalogue → Add product**: "Bullheads Plus", with a **one-time** price, e.g. US$4.99. Copy the `price_…` ID into `STRIPE_PRICE_PLUS`.
2. **Developers → API keys**: copy the secret key into `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**: `https://api.example.com/api/stripe/webhook` with the events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Test it: sign in on the site, open **Plus**, pay with card `4242 4242 4242 4242`, and confirm ads disappear and the locked styles unlock. Refund the payment in the dashboard and confirm Plus is removed.
5. Local webhook testing:
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```
6. When ready, repeat steps 1–3 in **live mode** and swap the three variables on Railway.

## 7. AdSense (ads)

1. Apply at adsense.google.com with `play.example.com`. The site already has the content pages reviewers look for (rules, privacy, terms). Put your real contact email in `brand.ts` first.
2. Once approved, create two **Display** ad units (responsive): one for banners (home, lobby, leaderboard) and one for the post-game results. Put the `ca-pub-…` client ID and both slot IDs in Vercel, then redeploy. The build emits `/ads.txt` automatically.
3. **Privacy & messaging**: turn on Google's consent message (a certified CMP) for EEA, UK and Switzerland traffic. This is required for serving ads there.
4. Ads never render for Plus members or on the live table. That keeps the game pleasant, which is what sells Plus.

## 7b. Contact email and form

- **Email:** in Cloudflare, open **Email → Email Routing** for the domain and add `hello@bullheadsonline.com` → your personal inbox. This is free, and your real address stays private.
- **Form:** messages from `/contact` are saved in the `Feedback` table. View them in Supabase → Table Editor. To also get them by email, set `RESEND_API_KEY`, `FEEDBACK_TO` (your inbox) and `FEEDBACK_FROM` on Railway (resend.com, after verifying the domain).

## 8. Verify production

```bash
SERVER_URL=https://api.example.com node scripts/smoke-test.mjs
```

Then on a phone: create a private room, join from a second device with the code, play a full game, and check the leaderboard after signing in.

## Launch checklist

- [ ] Brand renamed; `supportEmail` and `company` filled in
- [ ] Privacy and terms reviewed for your jurisdiction (`apps/web/src/pages/Legal.tsx`)
- [ ] Art generated (`npm run art`) and committed, including `og.png`
- [ ] Stripe live mode tested with a real purchase and refund
- [ ] AdSense approved and consent message on
- [ ] Supabase backups enabled (Pro plan) or a scheduled `pg_dump`
- [ ] Railway usage alerts set; error logs checked after the first day
