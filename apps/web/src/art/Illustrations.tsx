import type { CSSProperties } from 'react';
import { CHARACTERS, makeCard } from '@take6/shared';
import { Art } from './Art';
import { BullPortrait, characterById } from './BullPortrait';
import { GameCard } from '../components/GameCard';
import { LogoMark } from './Logo';
import { BRAND } from '../brand';

/** Landing hero: a fan of cards with Bruno charging through the middle. */
export function HeroArt() {
  const fan = [104, 11, 55, 6, 42];
  return (
    <Art
      id="illustration-hero"
      alt="A cartoon bull bursting through a fan of numbered cards"
      className="mx-auto w-full max-w-[520px] drop-shadow-2xl"
      fallback={
        <div className="relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden="true">
          <div className="absolute inset-[12%] rounded-full bg-bull/25 blur-3xl" />
          <div className="absolute inset-[22%] rounded-full bg-hay/15 blur-2xl" />
          {/* Hand fan: every card pivots around a point well below the fan. */}
          <div className="absolute left-1/2 top-[14%]">
            {fan.map((v, i) => (
              <div
                key={v}
                className="absolute left-0 top-0"
                style={{ transform: `translateX(-50%) rotate(${(i - 2) * 14}deg)`, transformOrigin: '50% 216%' }}
              >
                <GameCard card={makeCard(v)} width="clamp(70px, 18vw, 96px)" className="shadow-2xl" />
              </div>
            ))}
          </div>
          <div className="absolute bottom-[2%] left-1/2 w-[40%] -translate-x-1/2 drop-shadow-[0_24px_30px_rgba(0,0,0,.55)]">
            <BullPortrait character={characterById('bruno')} />
          </div>
          <FloatingCard value={7} className="left-[2%] top-[14%]" r={-18} delay={0} />
          <FloatingCard value={66} className="right-[3%] top-[8%]" r={14} delay={1.2} />
          <FloatingCard value={22} className="bottom-[20%] right-[0%]" r={22} delay={2.1} />
        </div>
      }
    />
  );
}

function FloatingCard({ value, className, r, delay }: { value: number; className: string; r: number; delay: number }) {
  return (
    <div className={`absolute animate-float ${className}`} style={{ '--r': `${r}deg`, animationDelay: `${delay}s` } as CSSProperties}>
      <GameCard card={makeCard(value)} width="clamp(42px, 10vw, 60px)" className="opacity-90" />
    </div>
  );
}

/** Product shot for Plus: a 3D deck box built in CSS. */
export function PlusProductArt() {
  return (
    <Art
      id="product-plus"
      alt={`${BRAND.plus} deck box`}
      className="mx-auto w-full max-w-[420px] drop-shadow-2xl"
      fallback={
        <div className="relative mx-auto grid aspect-square w-full max-w-[380px] place-items-center [perspective:900px]" aria-hidden="true">
          <div className="absolute inset-[15%] rounded-full bg-hay/25 blur-3xl" />
          <div className="deckbox relative h-[62%] w-[46%]">
            {/* cards peeking out of the box */}
            {[55, 11, 104].map((v, i) => (
              <div key={v} className="absolute left-[8%] top-[-18%]" style={{ transform: `translateZ(${-8 - i * 6}px) rotate(${(i - 1) * 7}deg) translateX(${i * 12}%)` }}>
                <GameCard card={makeCard(v)} theme={['gilded', 'midnight', 'meadow'][i]} width={96} />
              </div>
            ))}
            <div className="face" style={{ transform: 'translateZ(22px)', background: 'linear-gradient(160deg,#2a2112,#141008)', boxShadow: 'inset 0 0 0 2px #d9b45a, inset 0 0 0 6px #2a2112, inset 0 0 0 7px #8a6a22' }}>
              <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
                <div className="size-16"><LogoMark size={64} /></div>
                <div className="font-display text-2xl font-extrabold tracking-tight text-[#f5c95a]">PLUS</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#f5c95a]/70">Collector deck</div>
              </div>
            </div>
            <div className="face" style={{ transform: 'rotateY(90deg) translateZ(calc(100% - 22px))', width: 44, left: 'auto', right: -22, background: 'linear-gradient(180deg,#3a2d15,#1d160a)' }} />
            <div className="face" style={{ transform: 'rotateX(90deg) translateZ(22px)', height: 44, top: -22, background: '#4a3a1c' }} />
          </div>
          <div className="absolute bottom-[10%] left-1/2 h-6 w-[50%] -translate-x-1/2 rounded-[50%] bg-black/50 blur-xl" />
        </div>
      }
    />
  );
}

/** Game-over illustration: the winner's bull wearing the crown. */
export function WinnerArt({ avatar }: { avatar: string }) {
  const base = characterById(avatar);
  const crowned = { ...base, accessory: 'crown' as const };
  return (
    <div className="relative mx-auto size-28">
      <div className="absolute inset-0 rounded-full bg-hay/30 blur-2xl" />
      <div className="relative size-full">
        <BullPortrait character={crowned} />
      </div>
    </div>
  );
}

export const allCharacters = CHARACTERS;
