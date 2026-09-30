import { BRAND } from '../brand';
import { BullMark } from './BullMark';

/** Logo mark: the geometric bull head. Kept as vector so it stays sharp at every size. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return <BullMark size={size} mood="smug" />;
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={38} />
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[1.2rem] font-extrabold tracking-tight">{BRAND.short}</span>
          <span className="mt-0.5 block text-[0.6rem] font-bold uppercase tracking-[0.28em] text-fog">Online</span>
        </span>
      )}
    </span>
  );
}
