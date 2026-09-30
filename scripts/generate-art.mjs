#!/usr/bin/env node
/**
 * Generates the game's art with an image model and wires it into the web app.
 *
 *   OPENAI_API_KEY=... npm run art                      # everything missing
 *   GEMINI_API_KEY=... npm run art -- --only=character  # a category or ids, comma separated
 *   npm run art -- --force --only=logo-mark             # regenerate
 *   npm run art -- --list                               # show what exists
 *
 * Output: apps/web/public/art/<id>.webp (+ og.png for "og-cover"), and
 * apps/web/src/art/manifest.json, which the <Art> component reads. Anything not
 * generated keeps its hand-built SVG/CSS fallback, so partial runs are fine.
 *
 * Env: ART_PROVIDER=openai|gemini (auto-detected from keys), OPENAI_IMAGE_MODEL (default gpt-image-1),
 *      GEMINI_IMAGE_MODEL (default gemini-2.5-flash-image), ART_QUALITY=low|medium|high (OpenAI only).
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'apps/web/public/art');
const manifestPath = path.join(root, 'apps/web/src/art/manifest.json');
const spec = JSON.parse(await readFile(path.join(root, 'scripts/art-prompts.json'), 'utf8'));

try {
  process.loadEnvFile(path.join(root, '.env'));
} catch {}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : {};

if (args.list) {
  for (const a of spec.assets) console.log(`${manifest[a.id] ? '✔' : '·'} ${a.category.padEnd(12)} ${a.id}`);
  process.exit(0);
}

const provider = args.provider || process.env.ART_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : process.env.GEMINI_API_KEY ? 'gemini' : null);
if (!provider) {
  console.error('Set OPENAI_API_KEY or GEMINI_API_KEY (or ART_PROVIDER) to generate art.');
  process.exit(1);
}

const only = typeof args.only === 'string' ? new Set(args.only.split(',')) : null;
const queue = spec.assets.filter((a) => (!only || only.has(a.id) || only.has(a.category)) && (args.force || !manifest[a.id]));
if (!queue.length) {
  console.log('Nothing to generate. Use --force to regenerate.');
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
console.log(`Generating ${queue.length} asset(s) with ${provider}…`);

const concurrency = Number(args.concurrency || 3);
let failures = 0;
for (let i = 0; i < queue.length; i += concurrency) {
  await Promise.all(
    queue.slice(i, i + concurrency).map(async (asset) => {
      try {
        const png = await generate(asset);
        const url = await save(asset, png);
        manifest[asset.id] = url;
        await writeFile(manifestPath, JSON.stringify(sortKeys(manifest), null, 2) + '\n');
        console.log(`  ✔ ${asset.id} → ${url}`);
      } catch (error) {
        failures++;
        console.error(`  ✘ ${asset.id}: ${error.message}`);
      }
    }),
  );
}
console.log(failures ? `Done with ${failures} failure(s).` : 'Done. Rebuild the web app to ship the new art.');
process.exit(failures ? 1 : 0);

// ---------------------------------------------------------------------------

function fullPrompt(asset) {
  const bg = asset.transparent && provider !== 'openai' ? ' Place the subject on a plain pure white background.' : '';
  return `${asset.prompt}${bg}\n\nArt direction: ${spec.style}`;
}

async function generate(asset) {
  return provider === 'openai' ? openai(asset) : gemini(asset);
}

async function openai(asset) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      prompt: fullPrompt(asset),
      size: asset.size || '1024x1024',
      quality: process.env.ART_QUALITY || 'high',
      background: asset.transparent ? 'transparent' : 'opaque',
      n: 1,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message || `OpenAI ${res.status}`);
  return Buffer.from(body.data[0].b64_json, 'base64');
}

async function gemini(asset) {
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const [w, h] = (asset.size || '1024x1024').split('x').map(Number);
  const aspectRatio = w === h ? '1:1' : w > h ? '3:2' : '2:3';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt(asset) }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message || `Gemini ${res.status}`);
  const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error('Gemini returned no image');
  let png = Buffer.from(part.inlineData.data, 'base64');
  if (asset.transparent) png = await whiteToAlpha(png);
  return png;
}

/** Cheap background removal for providers without transparent output: keys out near-white pixels. */
async function whiteToAlpha(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    if (min > 244) data[i + 3] = 0;
    else if (min > 228) data[i + 3] = Math.round(((244 - min) / 16) * 255);
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function save(asset, png) {
  const image = sharp(png).resize({ width: asset.width || 1024, withoutEnlargement: true });
  const webp = await image.clone().webp({ quality: 86, alphaQuality: 90, effort: 5 }).toBuffer();
  const file = `${asset.id}.webp`;
  await writeFile(path.join(outDir, file), webp);
  if (asset.id === 'og-cover') {
    await sharp(png).resize(1200, 630, { fit: 'cover' }).png().toFile(path.join(root, 'apps/web/public/og.png'));
  }
  const hash = createHash('sha1').update(webp).digest('hex').slice(0, 8);
  return `/art/${file}?v=${hash}`;
}

function sortKeys(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}
