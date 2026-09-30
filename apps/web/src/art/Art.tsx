import { useState, type ReactNode } from 'react';
import manifest from './manifest.json';

const generated = manifest as Record<string, string>;

/** URL of a generated asset, or null if it hasn't been generated yet. */
export const artUrl = (id: string): string | null => generated[id] ?? null;

/**
 * Renders a generated image from /public/art when the art pipeline has produced it,
 * otherwise the hand-built vector fallback. Keeps the site shippable before any art exists.
 */
export function Art({ id, alt, fallback, className }: { id: string; alt: string; fallback: ReactNode; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = artUrl(id);
  if (!src || failed) return <>{fallback}</>;
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />;
}
