# Bullheads Online

A free, ad-supported multiplayer version of the bullhead card game (2–10 players), with a one-time **Plus** upgrade. English UI, mobile-first, playable in the browser.

Live at **bullheads.vercel.app**. The game uses the classic 104-card rules known from 6 nimmt!®, but it is an independent product: never use AMIGO's names, logo or card art as branding. The brand lives in [`apps/web/src/brand.ts`](apps/web/src/brand.ts).

## What's inside

| | |
|---|---|
| **Game** | Multi-room server-authoritative engine. Private rooms with 4-letter codes, public matchmaking that auto-fills with bots, spectators, reconnect, turn timers, AFK auto-play, host controls, emotes. Quick game (10 turns) or Race to 66. |
| **Bots** | Monte Carlo bot in TypeScript (easy / normal / hard). Your Python FAI agents still plug in with `BOT_ENGINE=fai`. |
| **Accounts** | Guests by default. Supabase Auth (Google + email magic link) for saved stats, the leaderboard and Plus. |
| **Money** | Google AdSense slots (home, lobby, leaderboard, results; never during play) and Stripe Checkout for a one-time Plus purchase (no ads, 3 card styles, 2 characters). Webhook, refund handling and a verify fallback are included. |
| **Art** | A hand-built SVG/CSS art set (logo, 10 characters, icons, card themes, felt, 3D deck box) that ships as-is, plus `npm run art`, which generates illustrations, characters, backgrounds, 3D renders, product shots, stickers and textures with OpenAI or Gemini and swaps them in automatically. |

## Layout

```
apps/web         React 19 + Vite + Tailwind v4 + Framer Motion    → Vercel
apps/server      Express 5 + Socket.IO + Prisma + Stripe          → Railway (Docker)
packages/shared  Rules, protocol types, cosmetics, bot AI (used by both)
bots/            Optional Python AI (BOT_ENGINE=fai): worker, adapters, FAI project, rl-6-nimmt
docs/            Launch guide
scripts/         generate-art.mjs + art-prompts.json, smoke-test.mjs, og-fallback.svg
```

## Run locally

```bash
npm install
npm run dev          # server on :3001, web on :5173
```

Open http://localhost:5173. Supabase, Stripe and AdSense are all optional locally: without them you get guest-only play with ad placeholders.

```bash
npm test                       # rules, bot and full-game simulations
node scripts/smoke-test.mjs    # 3 live socket clients play a full game against the running server
npm run typecheck
```

## Generate the art

```bash
cp .env.example .env           # add OPENAI_API_KEY or GEMINI_API_KEY
npm run art -- --list          # see what exists
npm run art -- --only=character,logo
npm run art                    # everything that's missing
```

Images land in `apps/web/public/art/*.webp` and are registered in `apps/web/src/art/manifest.json`. Commit both. To change the look, edit the `style` and `prompt` fields in [`scripts/art-prompts.json`](scripts/art-prompts.json) and rerun with `--force`.

## Deploy

Full step-by-step guide: **[docs/LAUNCH.md](docs/LAUNCH.md)** (GitHub → Supabase → Railway → Vercel → Cloudflare → Stripe → AdSense).
