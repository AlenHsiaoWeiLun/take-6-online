import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CLASSIC_TARGET, type RoomSnapshot } from '@take6/shared';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { AdSlot } from '../components/AdSlot';
import { WinnerArt } from '../art/Illustrations';
import { Art } from '../art/Art';
import { BullMark } from '../art/BullMark';
import { Bullhead, IconBot, IconCrown, IconSparkle, IconTakeRow, IconTrophy } from '../art/icons';
import { useSession } from '../state/session';
import { sound } from '../lib/sound';
import { useCountdown } from './useCountdown';
import { BRAND } from '../brand';
import { useT } from '../i18n';

export function GameOver({
  snapshot,
  ratings,
  onLeave,
}: {
  snapshot: RoomSnapshot;
  ratings: Record<string, { rating: number; delta: number }>;
  onLeave: () => void;
}) {
  const { socket, session, user } = useSession();
  const { room, self } = snapshot;
  const result = room.phase === 'gameEnd' ? room.result : null;
  const me = room.players.find((p) => p.id === self.playerId);
  const iWon = !!result && !!self.playerId && result.winnerIds.includes(self.playerId);
  const celebrated = useRef(false);
  const t = useT();
  // Two-second "moment" first: bullheads rain onto everyone's pile, then the results panel.
  const [stage, setStage] = useState<'drop' | 'panel'>('drop');

  useEffect(() => {
    if (!result) {
      setStage('drop');
      return;
    }
    const timer = window.setTimeout(() => setStage('panel'), DROP_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    if (!result || stage !== 'panel') {
      if (!result) celebrated.current = false;
      return;
    }
    if (celebrated.current) return;
    celebrated.current = true;
    if (iWon) {
      sound.play('win');
      // Light, short and from the edges, so it never sits on top of the ranking.
      const colors = ['#ff6b6b', '#fcc419', '#51cf66', '#4dabf7', '#fff7ea'];
      const base = { disableForReducedMotion: true, ticks: 140, gravity: 1.2, scalar: 0.9, colors };
      confetti({ ...base, particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ ...base, particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
    } else if (self.playerId) sound.play('lose');
  }, [result, stage, iWon, self.playerId]);

  if (!result) return null;
  if (stage === 'drop') return <ScoreDrop standings={result.standings} selfId={self.playerId} onSkip={() => setStage('panel')} />;
  const winner = result.standings[0];
  const myStanding = result.standings.find((s) => s.playerId === self.playerId);
  const iLost = !!myStanding && myStanding.rank === Math.max(...result.standings.map((s) => s.rank)) && result.standings.length > 1;
  const winners = result.standings.filter((s) => s.rank === 1);
  const headline = iWon
    ? winners.length > 1 ? t('Shared victory!') : t('You win!')
    : winners.length > 1 ? t('{names} tie', { names: winners.map((w) => w.name).join(' & ') }) : t('{name} wins', { name: winner.name });

  return (
    <Modal open label={t('Game over')} className="max-w-lg">
      <div className="text-center">
        {iWon ? (
          <Art id="illustration-win" alt="" className="mx-auto size-36 object-contain" fallback={<WinnerArt avatar={winner.avatar} />} />
        ) : iLost ? (
          <Art id="illustration-lose" alt="" className="mx-auto size-36 object-contain" fallback={<div className="mx-auto w-fit"><BullMark size={112} mood="shock" /></div>} />
        ) : (
          <WinnerArt avatar={winner.avatar} />
        )}
        <div className="eyebrow mt-4">{t('Game over')}</div>
        <h2 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{headline}</h2>
        <p className="mt-1 text-sm text-fog">{t('Fewest bullheads wins.')}</p>
      </div>

      <ol className="mt-6 space-y-2">
        {result.standings.map((s, i) => (
          <motion.li
            key={s.playerId}
            initial={{ opacity: 0, x: -24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.25 + i * 0.08, type: 'spring', stiffness: 420, damping: 26 }}
            className={clsx(
              'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
              s.rank === 1 ? 'border-hay/40 bg-hay/10' : 'border-white/7 bg-white/[0.03]',
              s.playerId === self.playerId && s.rank !== 1 && 'border-white/20',
            )}
          >
            <RankBadge rank={s.rank} />
            <Avatar id={s.avatar} size={32} />
            <span className="min-w-0 flex-1 truncate font-semibold">
              {s.playerId === self.playerId ? t('You') : s.name}
              {s.isBot && <IconBot size={13} className="ml-1.5 inline text-fog" />}
            </span>
            <span className="text-right leading-tight">
              <span className="flex items-center justify-end gap-1 font-display text-lg font-bold tabular">
                <AnimatedNumber value={s.score} /> <Bullhead size={14} className="text-bull" />
              </span>
              <span className="block text-[10px] font-medium text-fog">{t('{n} rows taken', { n: s.rowsTaken })}</span>
            </span>
            {ratings[s.playerId] && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className={clsx(
                  'ml-1 w-16 text-right text-xs font-bold tabular',
                  ratings[s.playerId].delta > 0 ? 'text-mint' : ratings[s.playerId].delta < 0 ? 'text-[#ff9ea1]' : 'text-fog',
                )}
                title="Elo"
              >
                {ratings[s.playerId].delta > 0 ? '+' : ''}
                {ratings[s.playerId].delta}
                <span className="block text-[10px] font-medium text-fog">{ratings[s.playerId].rating}</span>
              </motion.span>
            )}
          </motion.li>
        ))}
      </ol>

      <GameStats standings={result.standings} selfId={self.playerId} />

      {/* Main actions first; account/Plus prompts and the ad sit underneath so "Play again" is never pushed away. */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {me?.isHost ? (
          <button className="btn btn-primary" onClick={() => socket?.emit('game:rematch', { instant: true })}>{t('Play again')}</button>
        ) : (
          <div className="grid min-h-[46px] place-items-center rounded-xl bg-black/25 px-3 text-center text-xs text-mist">{t('Waiting for the host…')}</div>
        )}
        <button className="btn btn-ghost" onClick={onLeave}>{t('Leave table')}</button>
      </div>
      {me?.isHost && (
        <button className="btn btn-ghost btn-sm mt-2 w-full" onClick={() => socket?.emit('game:rematch')}>
          {t('Back to lobby to change settings')}
        </button>
      )}

      {self.playerId && !user && <p className="mt-4 text-center text-xs text-fog">{t('Sign in from your profile to save wins and climb the leaderboard.')}</p>}
      {!session.isPlus && (
        <Link to="/plus" className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-fog hover:text-white">
          <IconSparkle size={13} /> {t('Go ad-free with {plus}', { plus: BRAND.plus })}
        </Link>
      )}
      <AdSlot slot="results" className="mt-4" />
    </Modal>
  );
}

export function HandSummary({ snapshot, clockOffset }: { snapshot: RoomSnapshot; clockOffset: MutableRefObject<number> }) {
  const { room, self } = snapshot;
  const left = useCountdown(room.phase === 'handEnd' ? room.deadline : null, clockOffset);
  const t = useT();
  if (room.phase !== 'handEnd') return null;
  const players = [...room.players].sort((a, b) => a.score - b.score);
  return (
    <Modal open label={t('Hand complete')} className="max-w-md">
      <div className="eyebrow">{t('Hand {n} complete', { n: room.handNumber })}</div>
      <h2 className="mt-1 font-display text-3xl font-extrabold">{t('Race to {n}', { n: CLASSIC_TARGET })}</h2>
      <p className="mt-1 text-sm text-fog">{t('The game ends when anyone reaches {n} bullheads.', { n: CLASSIC_TARGET })}</p>
      <ul className="mt-5 space-y-3">
        {players.map((p) => (
          <li key={p.id}>
            <div className="flex items-center gap-2.5 text-sm">
              <Avatar id={p.avatar} size={28} />
              <span className="flex-1 truncate font-semibold">{p.id === self.playerId ? t('You') : p.name}</span>
              <span className="text-fog tabular">+{p.handScore}</span>
              <span className="w-10 text-right font-display font-bold tabular">{p.score}</span>
            </div>
            <div className="ml-[38px] mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className={clsx('h-full rounded-full', p.score / CLASSIC_TARGET > 0.75 ? 'bg-bull' : 'bg-hay')}
                style={{ width: `${Math.min(100, (p.score / CLASSIC_TARGET) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-sm text-fog tabular">{t('Next hand in {n}s', { n: Math.ceil(left ?? 0) })}</p>
    </Modal>
  );
}

function GameStats({ standings, selfId }: { standings: import('@take6/shared').Standing[]; selfId: string | null }) {
  const t = useT();
  const gulp = [...standings].sort((a, b) => b.biggestTake - a.biggestTake)[0];
  const rows = [...standings].sort((a, b) => b.rowsTaken - a.rowsTaken)[0];
  const clean = standings.filter((s) => s.rowsTaken === 0);
  const name = (s: { playerId: string; name: string }) => (s.playerId === selfId ? t('You') : s.name);
  const stats = [
    gulp && gulp.biggestTake > 0 && { icon: <Bullhead size={12} />, label: t('Biggest gulp'), value: t('{name} · {n} in one row', { name: name(gulp), n: gulp.biggestTake }) },
    rows && rows.rowsTaken > 1 && { icon: <IconTakeRow size={13} />, label: t('Row collector'), value: t('{name} · {n} rows', { name: name(rows), n: rows.rowsTaken }) },
    clean.length > 0 && { icon: <IconSparkle size={12} />, label: t('Spotless'), value: clean.map(name).join(', ') },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];
  if (!stats.length) return null;
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {stats.map((st, i) => (
        <motion.div
          key={st.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + i * 0.1 }}
          className="rounded-xl bg-white/[0.04] px-3 py-2"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-fog">
            <span className="inline-flex items-center gap-1">{st.icon} {st.label}</span>
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold">{st.value}</div>
        </motion.div>
      ))}
    </div>
  );
}

const DROP_MS = 2600;

/**
 * The end-of-game moment: every player's bullheads fall from above onto their pile and the
 * count ticks up with them. The biggest pile overflows and spills its heads everywhere.
 */
function ScoreDrop({ standings, selfId, onSkip }: { standings: import('@take6/shared').Standing[]; selfId: string | null; onSkip: () => void }) {
  const t = useT();
  const max = Math.max(...standings.map((s) => s.score));
  const worst = standings.length > 1 && max > 0 ? standings.find((s) => s.score === max)?.playerId : null;
  const COLS = 4;
  const CAP = 28;

  useEffect(() => {
    const ticks = [0, 250, 500, 750, 1000, 1250].map((ms, i) => window.setTimeout(() => sound.play('deal', i), ms + 200));
    const spill = worst ? window.setTimeout(() => sound.play('take', max), 1500) : 0;
    return () => {
      ticks.forEach(window.clearTimeout);
      window.clearTimeout(spill);
    };
  }, [worst, max]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-ink-950/80 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onSkip}
      role="dialog"
      aria-label={t('Game over')}
    >
      <div className="flex max-w-full items-end justify-center gap-3 overflow-hidden sm:gap-6">
        {standings.map((s, col) => {
          const n = Math.min(s.score, CAP);
          const spills = s.playerId === worst;
          return (
            <div key={s.playerId} className="relative flex w-[clamp(56px,18vw,96px)] flex-col items-center">
              <div className="relative h-[180px] w-full sm:h-[220px]">
                {Array.from({ length: n }, (_, i) => {
                  const row = Math.floor(i / COLS);
                  const c = i % COLS;
                  return (
                    <motion.span
                      key={i}
                      className="absolute text-bull"
                      style={{ left: `${c * 25 + 2}%`, bottom: row * 15 }}
                      initial={{ y: -420, rotate: (i % 5) * 30 - 60, opacity: 0 }}
                      animate={{ y: 0, rotate: (i % 3) * 8 - 8, opacity: 1 }}
                      transition={{ delay: 0.15 + col * 0.06 + i * 0.035, type: 'spring', stiffness: 520, damping: 22 }}
                    >
                      <Bullhead size={18} />
                    </motion.span>
                  );
                })}
                {spills &&
                  Array.from({ length: 16 }, (_, i) => {
                    const dir = i % 2 ? 1 : -1;
                    return (
                      <motion.span
                        key={`spill-${i}`}
                        className="absolute bottom-[40%] left-1/2 text-bull"
                        initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
                        animate={{
                          x: [0, dir * (30 + (i % 4) * 26), dir * (60 + (i % 4) * 48)],
                          y: [0, -110 - (i % 5) * 26, 120 + (i % 3) * 30],
                          rotate: dir * (180 + i * 30),
                          opacity: [0, 1, 1, 0],
                        }}
                        transition={{ delay: 1.45 + (i % 6) * 0.03, duration: 1.05, ease: [0.2, 0.7, 0.6, 1] }}
                      >
                        <Bullhead size={16 + (i % 3) * 4} />
                      </motion.span>
                    );
                  })}
              </div>
              <motion.div
                className={clsx('mt-2 font-display text-2xl font-extrabold tabular sm:text-3xl', spills ? 'text-bull' : s.rank === 1 ? 'text-hay' : 'text-white')}
                animate={spills ? { scale: [1, 1, 1.35, 1] } : s.rank === 1 ? { y: [0, 0, -10, 0] } : undefined}
                transition={{ duration: 0.6, delay: 1.45 }}
              >
                <AnimatedNumber value={s.score} from={0} delay={0.25 + col * 0.06} />
              </motion.div>
              <Avatar id={s.avatar} size={40} ring={s.rank === 1 ? '#f5b942' : undefined} className="mt-1" />
              <div className="mt-1 max-w-full truncate text-xs font-semibold text-mist">{s.playerId === selfId ? t('You') : s.name}</div>
              {s.rank === 1 && (
                <motion.span className="absolute -top-3 grid size-8 place-items-center rounded-full bg-hay text-ink-950 shadow-lg" initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 1.7, type: 'spring', stiffness: 500, damping: 14 }}>
                  <IconCrown size={18} strokeWidth={2.2} />
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/** Rank as a medal badge (one icon family, no emoji). */
export function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1 ? 'bg-hay text-ink-950' : rank === 2 ? 'bg-[#cfd4dc] text-ink-950' : rank === 3 ? 'bg-[#d08b4f] text-ink-950' : 'bg-white/8 text-mist';
  return (
    <span className={clsx('grid size-7 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold tabular', style)} aria-label={`#${rank}`}>
      {rank === 1 ? <IconTrophy size={15} strokeWidth={2.2} /> : rank}
    </span>
  );
}
