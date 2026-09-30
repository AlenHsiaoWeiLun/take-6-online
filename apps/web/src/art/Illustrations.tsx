import type { CSSProperties } from 'react';
import { CHARACTERS, makeCard } from '@take6/shared';
import { Art } from './Art';
import { HeroScene } from './HeroScene';
import { BullPortrait, characterById } from './BullPortrait';
import { GameCard } from '../components/GameCard';
import { LogoMark } from './Logo';
import { BRAND } from '../brand';

/** Landing hero: the sixth-card moment on loop (see HeroScene). */
export function HeroArt() {
  return <HeroScene />;
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
