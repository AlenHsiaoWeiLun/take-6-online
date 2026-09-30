/**
 * Writes a static HTML file per landing page (and the main pages) into dist/, with
 * page-specific <title>, description, canonical, hreflang and readable content inside
 * #root, so crawlers index real text without running JavaScript. React replaces
 * the static markup on load.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../dist');
const site = (process.env.VITE_SITE_URL || 'https://bullheadsonline.com').replace(/\/$/, '');
const landings = JSON.parse(await readFile(path.resolve(here, '../src/seo/landings.json'), 'utf8'));
// Source files are written against a placeholder origin; every built file gets the real one.
const PLACEHOLDER = 'https://bullheadsonline.com';
const withSite = (s) => s.replaceAll(PLACEHOLDER, site);
const template = withSite(await readFile(path.join(dist, 'index.html'), 'utf8'));
for (const file of ['robots.txt', 'sitemap.xml']) {
  await writeFile(path.join(dist, file), withSite(await readFile(path.join(dist, file), 'utf8')));
}
// Untouched shell for client-only routes (/play/:code, /plus/success…), so they don't flash landing copy.
await writeFile(path.join(dist, 'app.html'), template);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pages = [
  {
    path: '/',
    lang: 'en',
    title: null,
    description: null,
    body: `<h1>Bullheads Online — the free bullhead card game</h1><p>Don’t take the sixth card. Play the classic 104-card bullhead game with 6 nimmt! rules free in your browser: private rooms for 2–10 friends, public matches and smart bots.</p><p><a href="/rules">How to play</a> · <a href="/6-nimmt-online">6 nimmt! online</a> · <a href="/take-5-online">Take 5 online</a> · <a href="/zh-tw">誰是牛頭王 線上版</a></p>`,
  },
  {
    path: '/rules',
    lang: 'en',
    title: 'How to Play Bullheads (6 nimmt! Rules) — Rules in Two Minutes | Bullheads',
    description: 'Learn the bullhead card game in two minutes: 104 cards, four rows, and whoever plays the sixth card takes the row. Same rules as 6 nimmt! and Take 5.',
    body: `<h1>Bullheads rules in two minutes</h1><p>Collect as few bullheads as possible. Everyone picks a card at the same time; cards are placed from lowest to highest on the row whose last card is closest below. Play the sixth card on a row and you take the five cards before it. A card lower than every row takes a row of your choice. Fewest bullheads after ten turns wins.</p>`,
  },
  ...landings.map((l) => ({
    ...l,
    body:
      `<h1>${esc(l.h1)}</h1><p>${esc(l.lead)}</p>` +
      l.sections.map((s) => `<h2>${esc(s.h2)}</h2>${s.p.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('') +
      `<p><a href="/">${esc(l.cta)}</a></p><p><small>${esc(l.disclaimer)}</small></p>`,
  })),
];

const zhPage = landings.find((l) => l.lang === 'zh');
const hreflang = (p) => {
  const en = p.lang === 'zh' ? p.alternate : p.path;
  const zh = p.lang === 'zh' ? p.path : zhPage?.path;
  return [
    `<link rel="alternate" hreflang="en" href="${site}${en === '/' ? '/' : en}" />`,
    zh ? `<link rel="alternate" hreflang="zh-Hant-TW" href="${site}${zh}" />` : '',
    `<link rel="alternate" hreflang="x-default" href="${site}/" />`,
  ].join('\n    ');
};

for (const page of pages) {
  const url = `${site}${page.path === '/' ? '/' : page.path}`;
  let html = template
    .replace('<html lang="en">', `<html lang="${page.lang === 'zh' ? 'zh-Hant-TW' : 'en'}">`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />\n    ${hreflang(page)}`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`)
    .replace('<div id="root"></div>', `<div id="root"><main style="max-width:720px;margin:0 auto;padding:48px 16px;font-family:system-ui,sans-serif;color:#ecebe8;background:#0b0d12">${page.body}</main></div>`);
  if (page.title) {
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`)
      .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(page.title)}" />`);
  }
  if (page.description) {
    html = html
      .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(page.description)}" />`)
      .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(page.description)}" />`);
  }
  const out = page.path === '/' ? path.join(dist, 'index.html') : path.join(dist, page.path, 'index.html');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, html);
  console.log(`prerendered ${page.path}`);
}
