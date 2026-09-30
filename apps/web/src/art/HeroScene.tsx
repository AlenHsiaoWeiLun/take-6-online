import { useEffect, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { makeCard, rowPenalty } from '@take6/shared';
import { GameCard } from '../components/GameCard';
import { Bullhead } from './icons';
import { BullMark } from './BullMark';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { useT } from '../i18n';

/**
 * The landing hero is the game's best moment on loop: a row already holds five cards,
 * a 67 drifts toward the sixth slot, lands, and the whole row blows up in someone's face.
 * It teaches the core rule and shows the payoff before anyone reads a word.
 */
type Phase = 'idle' | 'approach' | 'land' | 'boom' | 'reset';
const TIMELINE: [Phase, number][] = [
  ['idle', 700],
  ['approach', 1700],
  ['land', 420],
  ['boom', 2300],
  ['reset', 700],
];

const ROWS = [[3, 18], [7, 11, 42, 55, 66], [24, 31, 38], [80, 91, 99]].map((r) => r.map(makeCard));
const DANGER = 1;
const INCOMING = makeCard(67);
const PENALTY = rowPenalty(ROWS[DANGER]);
const SCORE_BEFORE = 11;

export function HeroScene() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPhase('approach');
      return;
    }
    let i = 0;
    let timer: number;
    const tick = () => {
      i = (i + 1) % TIMELINE.length;
      setPhase(TIMELINE[i][0]);
      timer = window.setTimeout(tick, TIMELINE[i][1]);
    };
    timer = window.setTimeout(tick, TIMELINE[0][1]);
    return () => window.clearTimeout(timer);
  }, []);

  const tense = phase === 'approach' || phase === 'land';
  const exploded = phase === 'boom';

  return (
    <div
      className="relative mx-auto w-full max-w-[580px] select-none"
      style={{ '--hw': 'clamp(30px, min(10.5vw, calc((100dvh - 180px) / 6.8)), 68px)', '--g': 'calc(var(--hw) * 0.1)' } as CSSProperties}
      aria-label={t('A sixth card lands on a full row and the player takes all five cards')}
      role="img"
    >
      <div className="absolute inset-[10%] -z-10 rounded-full bg-bull/25 blur-3xl" />

      <motion.div
        className="felt relative rounded-[1.6rem] p-3 sm:p-4"
        animate={phase === 'land' ? { x: [0, -5, 5, -3, 2, 0], y: [0, 2, -2, 1, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.38 }}
      >
        <div className="flex flex-col gap-[var(--g)]">
          {ROWS.map((row, r) => {
            const danger = r === DANGER;
            return (
              <motion.div
                key={r}
                className="relative flex items-center gap-[var(--g)]"
                animate={{
                  ...(danger && phase === 'land' ? { x: [0, -6, 6, -4, 3, 0] } : danger && tense ? { x: [0, -1.5, 1.5, 0] } : { x: 0 }),
                  // Only the row that matters stays lit while the sixth card is in play.
                  opacity: !danger && (tense || exploded) ? 0.4 : 1,
                }}
                transition={danger && tense ? { duration: phase === 'land' ? 0.4 : 0.22, repeat: phase === 'land' ? 0 : Infinity } : { duration: 0.2 }}
              >
                <div
                  className={
                    'flex w-[calc(var(--hw)*0.72)] shrink-0 flex-col items-center justify-center rounded-lg py-1 transition-colors ' +
                    (danger && (tense || exploded) ? 'bg-bull text-white' : 'bg-black/25 text-mist')
                  }
                >
                  <Bullhead size={12} className={danger && (tense || exploded) ? 'text-white' : 'text-fog'} />
                  <span className="font-display text-xs font-bold tabular">{danger ? PENALTY : rowPenalty(row)}</span>
                </div>

                {Array.from({ length: 6 }, (_, i) => {
                  const card = row[i];
                  if (card) {
                    const flying = danger && exploded;
                    return (
                      <motion.div
                        key={card.value}
                        className="relative"
                        animate={
                          flying
                            ? { x: `${-(i * 110 + 60)}%`, y: '340%', rotate: -(20 + i * 18), scale: 0.3, opacity: [1, 1, 0] }
                            : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
                        }
                        transition={flying ? { duration: 0.7, delay: 0.3 + (4 - i) * 0.05, ease: [0.5, 0, 0.8, 0.4] } : { duration: 0.35, delay: phase === 'idle' ? i * 0.04 : 0 }}
                      >
                        <GameCard card={card} width="var(--hw)" />
                      </motion.div>
                    );
                  }
                  const sixth = i === 5;
                  return (
                    <div
                      key={`slot-${i}`}
                      className={
                        'relative shrink-0 rounded-[calc(var(--hw)*0.12)] border-[1.5px] border-dashed ' +
                        (sixth && danger ? 'border-bull/70 bg-bull/10' : 'border-white/10')
                      }
                      style={{ width: 'var(--hw)', height: 'calc(var(--hw) * 1.4)' }}
                    >
                      {sixth && (
                        <span className={'absolute inset-0 grid place-items-center font-display text-[calc(var(--hw)*0.36)] font-extrabold ' + (danger ? 'text-bull/70' : 'text-bull/25')}>6</span>
                      )}
                      {sixth && danger && (
                        <motion.div
                          className="absolute inset-0 z-10"
                          initial={false}
                          animate={
                            phase === 'idle'
                              ? { x: 110, y: -150, rotate: 26, opacity: 0, scale: 1.1 }
                              : phase === 'approach'
                                ? { x: [70, 52, 36], y: [-110, -70, -46], rotate: [20, 8, 16, 6, 12, 8], opacity: 1, scale: 1.08 }
                                : phase === 'land'
                                  ? { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }
                                  : phase === 'boom'
                                    ? { x: '-550%', y: 0, rotate: 0, opacity: 1, scale: 1 }
                                    : { x: '-550%', y: 0, opacity: 0, scale: 0.9 }
                          }
                          transition={
                            phase === 'approach'
                              ? { duration: 1.6, ease: 'easeInOut' }
                              : phase === 'land'
                                ? { type: 'spring', stiffness: 700, damping: 18 }
                                : phase === 'boom'
                                  ? { delay: 0.6, type: 'spring', stiffness: 260, damping: 26 }
                                  : { duration: 0.4 }
                          }
                        >
                          <GameCard card={INCOMING} width="var(--hw)" style={{ boxShadow: '0 0 0 3px #f5b942, 0 16px 30px -8px rgb(0 0 0 / .6)' }} />
                        </motion.div>
                      )}
                    </div>
                  );
                })}

                {danger && (
                  <AnimatePresence>
                    {tense && (
                      <motion.span
                        key="wait"
                        initial={{ opacity: 0, scale: 0.4, rotate: -14 }}
                        animate={{ opacity: 1, scale: 1, rotate: -6 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 16, delay: phase === 'approach' ? 0.5 : 0 }}
                        className="absolute -top-[calc(var(--hw)*0.75)] right-[calc(var(--hw)*0.4)] z-20 whitespace-nowrap rounded-lg bg-bull px-2.5 py-1 font-display text-[11px] font-extrabold text-white shadow-[0_4px_0_#8e1f27] sm:text-sm"
                      >
                        {t('Wait. This one’s the sixth.')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* the payoff: the row lands on "your" score and the bull can't hide its grin */}
      <div className="absolute -bottom-9 left-3 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/95 py-1.5 pl-1.5 pr-3 shadow-xl">
        <BullMark size={30} mood={exploded ? 'shock' : 'neutral'} />
        <span className="leading-tight">
          <span className="block text-xs font-semibold text-mist">{t('You')}</span>
          <span className="flex items-center gap-1 font-display text-lg font-extrabold tabular text-white">
            <Bullhead size={13} className="text-bull" />
            <AnimatedNumber value={exploded ? SCORE_BEFORE + PENALTY : SCORE_BEFORE} delay={exploded ? 1.05 : 0} />
          </span>
        </span>
      </div>
      <AnimatePresence>
        {exploded && (
          <>
            <motion.span
              key="token"
              className="pointer-events-none absolute left-[3%] top-[27%] z-30 flex items-center gap-1 rounded-full bg-bull px-3 py-1 font-display text-lg font-extrabold text-white shadow-[0_4px_0_#8e1f27]"
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1, 0.8], y: [0, -30, 0, 250], x: [0, 10, 14, 10] }}
              transition={{ delay: 0.45, duration: 0.9, times: [0, 0.25, 0.5, 1], ease: 'easeInOut' }}
            >
              +{PENALTY} <Bullhead size={16} />
            </motion.span>
            <motion.div
              key="bull"
              className="pointer-events-none absolute bottom-[3%] right-[18%] z-20"
              initial={{ y: 80, rotate: -20, opacity: 0 }}
              animate={{ y: 0, rotate: [-20, 8, -3, 0], opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 420, damping: 14 }}
            >
              <BullMark size="clamp(70px, 18vw, 96px)" mood="smug" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
