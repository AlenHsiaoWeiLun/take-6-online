import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { config } from '../lib/config';
import { useSession } from '../state/session';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptRequested = false;
function loadAdSense() {
  if (scriptRequested || !config.adsenseClient) return;
  scriptRequested = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsenseClient}`;
  document.head.appendChild(s);
}

/**
 * Google AdSense unit. Never rendered for Plus members and never placed over the live table —
 * only on menus, lobby, and between games.
 */
export function AdSlot({ slot, className, label = 'Advertisement' }: { slot: keyof typeof config.adSlots; className?: string; label?: string }) {
  const { session } = useSession();
  const ref = useRef<HTMLModElement>(null);
  const slotId = config.adSlots[slot];
  const live = !!config.adsenseClient && !!slotId && !session.isPlus;

  useEffect(() => {
    if (!live || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
    loadAdSense();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blockers */
    }
  }, [live]);

  if (session.isPlus) return null;
  if (!live) {
    if (!config.showAdPlaceholders) return null;
    return (
      <div className={clsx('grid min-h-[90px] place-items-center rounded-2xl border border-dashed border-white/10 text-xs text-fog/70', className)}>
        Ad slot · {slot}
      </div>
    );
  }
  return (
    <div className={clsx('overflow-hidden', className)}>
      <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-fog/50">{label}</div>
      <ins
        ref={ref}
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={config.adsenseClient}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
