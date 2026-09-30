import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import clsx from 'clsx';
import { MAX_ROW_LENGTH, findTargetRow, makeCard, rowPenalty, type Card } from '@take6/shared';
import { GameCard } from '../components/GameCard';
import { Bullhead, IconArrowRight, IconCheck } from '../art/icons';
import { BullMark } from '../art/BullMark';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { fx } from '../fx/fx';
import { request, useSession } from '../state/session';
import { sound } from '../lib/sound';
import { useT } from '../i18n';

interface Step {
  title: string;
  prompt: string;
  rows: number[][];
  hand: number[];
  /** The card the step wants played (step 2 lets you pick any row instead). */
  play: number;
  chooseRow?: boolean;
}

const STEPS: Step[] = [
  {
    title: 'Cards go after the closest lower number',
    prompt: 'Each card joins the row whose last card is lower and closest to it. Play 33 — where will it go?',
    rows: [[12], [30], [48], [75]],
    hand: [33, 51, 90],
    play: 33,
  },
  {
    title: 'Too low? You pick a row to take',
    prompt: 'Your 5 is lower than the end of every row, so you must take a whole row. Tip: pick the one with the fewest bullheads.',
    rows: [[20, 24], [41], [57, 60, 62], [88]],
    hand: [5],
    play: 5,
    chooseRow: true,
  },
  {
    title: 'The sixth card takes the row',
    prompt: 'Row 2 already has five cards. Your 31 would be the sixth. Play it and see what happens.',
    rows: [[9], [14, 17, 22, 26, 29], [45], [70]],
    hand: [31, 80],
    play: 31,
  },
];

export function Learn() {
  const t = useT();
  const navigate = useNavigate();
  const { socket } = useSession();
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<Card[][]>(() => STEPS[0].rows.map((r) => r.map(makeCard)));
  const [hand, setHand] = useState<Card[]>(() => STEPS[0].hand.map(makeCard));
  const [score, setScore] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);
  const [awaitingRow, setAwaitingRow] = useState(false);
  const [sweeping, setSweeping] = useState<number | null>(null);
  const chip = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cur = STEPS[step];
  const finished = step >= STEPS.length;

  const load = (i: number) => {
    setStep(i);
    setDone(null);
    setNudge(null);
    setAwaitingRow(false);
    if (i < STEPS.length) {
      setRows(STEPS[i].rows.map((r) => r.map(makeCard)));
      setHand(STEPS[i].hand.map(makeCard));
    }
  };

  const take = (rowIndex: number, card: Card, why: string, vars: Record<string, number> = {}) => {
    const taken = rows[rowIndex];
    const penalty = rowPenalty(taken);
    setSweeping(rowIndex);
    setRows((r) => r.map((row, i) => (i === rowIndex ? [...row, card] : row)));
    setHand((h) => h.filter((c) => c.value !== card.value));
    window.setTimeout(() => {
      const target = chip.current?.getBoundingClientRect();
      const els = [...(boardRef.current?.querySelectorAll<HTMLElement>(`[data-row="${rowIndex}"] [data-card]`) ?? [])].filter(
        (el) => Number(el.dataset.card) !== card.value,
      );
      if (target) {
        fx.flyCards(
          els.map((el) => ({ card: taken.find((c) => c.value === Number(el.dataset.card))!, rect: el.getBoundingClientRect() })),
          target,
          'classic',
        );
        const badge = boardRef.current?.querySelector<HTMLElement>(`[data-row="${rowIndex}"] [data-badge]`)?.getBoundingClientRect();
        if (badge) fx.token(badge, target, `+${penalty}`, penalty >= 7, 150);
      }
      sound.play('take', penalty);
      setRows((r) => r.map((row, i) => (i === rowIndex ? [card] : row)));
      setSweeping(null);
      setScore((s) => s + penalty);
      setDone(t(why, { p: penalty, ...vars }));
    }, 420);
  };

  const onPlay = (card: Card) => {
    if (done || awaitingRow || finished) return;
    if (card.value !== cur.play) {
      setNudge(t('Try {v} for this step.', { v: cur.play }));
      return;
    }
    sound.play('play');
    if (cur.chooseRow) {
      setAwaitingRow(true);
      return;
    }
    const target = findTargetRow(card, rows.map((cards) => ({ cards })));
    if (rows[target].length >= MAX_ROW_LENGTH) {
      take(target, card, 'Sixth card! You swallowed the whole row: +{p} bullheads. Avoid rows that already have five cards.');
      return;
    }
    setRows((r) => r.map((row, i) => (i === target ? [...row, card] : row)));
    setHand((h) => h.filter((c) => c.value !== card.value));
    window.setTimeout(() => sound.play('place', rows[target].length + 1), 240);
    setDone(t('{v} went after {last} on row {r} — the closest lower number.', { v: card.value, last: rows[target].at(-1)!.value, r: target + 1 }));
  };

  const onRow = (i: number) => {
    if (!awaitingRow) return;
    setAwaitingRow(false);
    const cheapest = rows.reduce((best, r, j) => (rowPenalty(r) < rowPenalty(rows[best]) ? j : best), 0);
    const card = hand.find((c) => c.value === cur.play)!;
    take(
      i,
      card,
      i === cheapest ? 'Smart — the cheapest row. +{p} bullheads, and your 5 starts a new row.' : 'That cost +{p} bullheads. The cheapest was row {c} — remember that next time!',
      { c: cheapest + 1 },
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">{t('Interactive tutorial')}</div>
          <h1 className="mt-0.5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{finished ? t('You’re ready.') : t(cur.title)}</h1>
        </div>
        <div className="flex gap-1.5" aria-label={t('Step {n} of {total}', { n: Math.min(step + 1, STEPS.length), total: STEPS.length })}>
          {STEPS.map((_, i) => (
            <span key={i} className={clsx('h-2 w-8 rounded-full', i < step ? 'bg-mint' : i === step ? 'bg-hay' : 'bg-white/10')} />
          ))}
        </div>
      </div>

      {finished ? (
        <div className="panel mt-6 p-6 text-center">
          <div className="mx-auto w-fit">
            <BullMark size={96} mood="smug" />
          </div>
          <p className="mt-4 text-mist">{t('That’s the whole game: dodge full rows, keep low cards for emergencies, and make your friends take the sixth card.')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <button
              className="btn btn-primary btn-lg"
              onClick={async () => {
                const res = await request<{ ok: boolean; code?: string }>(socket, (s, ack) => s.emit('room:quickplay', { vsBots: true }, ack as never)).catch(() => null);
                if (res?.ok && res.code) navigate(`/play/${res.code}`);
              }}
            >
              {t('Practise vs bots')}
            </button>
            <Link to="/" className="btn btn-ghost btn-lg">
              {t('Play with friends')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-mist sm:text-base">{t(cur.prompt)}</p>

          <LayoutGroup>
            <div ref={boardRef} className="felt mt-3 rounded-[1.6rem] p-2.5 sm:p-3" style={{ '--card-w': 'clamp(32px, min(calc((100vw - 110px) / 7.4), calc((100dvh - 420px) / 6.2)), 70px)' } as React.CSSProperties}>
              <div className="flex flex-col gap-[calc(var(--card-w)*0.09)]">
                {rows.map((row, i) => (
                  <div
                    key={i}
                    data-row={i}
                    className={clsx('relative flex items-center gap-[calc(var(--card-w)*0.09)] rounded-xl', awaitingRow && 'cursor-pointer ring-2 ring-hay/60 ring-offset-2 ring-offset-transparent')}
                    onClick={() => onRow(i)}
                    role={awaitingRow ? 'button' : undefined}
                    aria-label={awaitingRow ? t('Take row {r}', { r: i + 1 }) : undefined}
                  >
                    <div data-badge className={clsx('flex w-[calc(var(--card-w)*0.62)] shrink-0 flex-col items-center rounded-xl py-1.5', sweeping === i ? 'bg-bull text-white' : 'bg-black/25 text-mist')}>
                      <span className="text-[9px] font-bold uppercase opacity-70">{t('row')}</span>
                      <span className="font-display text-base font-extrabold tabular">{rowPenalty(row)}</span>
                      <Bullhead size={12} />
                    </div>
                    <div className="flex gap-[calc(var(--card-w)*0.07)]">
                      {Array.from({ length: MAX_ROW_LENGTH + 1 }, (_, j) =>
                        row[j] ? (
                          <motion.div key={row[j].value} data-card={row[j].value} layoutId={`learn-${row[j].value}`} transition={{ type: 'spring', stiffness: 520, damping: 30 }}>
                            <GameCard card={row[j]} />
                          </motion.div>
                        ) : (
                          <div key={`s${j}`} className={clsx('slot grid place-items-center', j === MAX_ROW_LENGTH && 'slot-danger')}>
                            {j === MAX_ROW_LENGTH && <span className="font-display text-[calc(var(--card-w)*0.34)] font-extrabold text-bull/40">6</span>}
                          </div>
                        ),
                      )}
                    </div>
                    {awaitingRow && (
                      <span className="absolute right-2 rounded-full bg-hay px-2.5 py-0.5 text-xs font-extrabold text-ink-950">
                        {t('Take')} · {rowPenalty(row)} <Bullhead size={10} className="inline" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div className="flex gap-2">
                {hand.map((c) => (
                  <motion.button
                    key={c.value}
                    layoutId={`learn-${c.value}`}
                    onClick={() => onPlay(c)}
                    whileHover={{ y: -6 }}
                    className={clsx('rounded-[10px]', c.value === cur.play && !done && !awaitingRow && 'ring-[3px] ring-hay ring-offset-2 ring-offset-ink-950')}
                    aria-label={t('Card {v}', { v: c.value })}
                  >
                    <GameCard card={c} width="clamp(44px, calc((100dvh - 300px) / 6), 64px)" className={clsx(c.value !== cur.play && 'opacity-60')} />
                  </motion.button>
                ))}
              </div>
              <div ref={chip} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-1.5 pl-2 pr-3">
                <BullMark size={28} />
                <span className="leading-tight">
                  <span className="block text-xs font-semibold text-mist">{t('You')}</span>
                  <span className="flex items-center gap-1 font-display text-lg font-extrabold tabular">
                    <Bullhead size={12} className="text-bull" /> <AnimatedNumber value={score} delay={0.9} />
                  </span>
                </span>
              </div>
            </div>
          </LayoutGroup>

          <div className="mt-3 min-h-[3.5rem]">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-mint/30 bg-mint/10 px-4 py-3">
                  <span className="flex items-start gap-2 text-sm text-white">
                    <IconCheck size={18} className="mt-0.5 shrink-0 text-mint" /> {done}
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={() => load(step + 1)}>
                    {step + 1 < STEPS.length ? t('Next') : t('Finish')} <IconArrowRight size={15} />
                  </button>
                </motion.div>
              ) : awaitingRow ? (
                <motion.p key="row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-hay/10 p-4 text-sm font-semibold text-hay">
                  {t('Now tap the row you want to take.')}
                </motion.p>
              ) : nudge ? (
                <motion.p key="nudge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-1 text-sm text-mist">
                  {nudge}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
