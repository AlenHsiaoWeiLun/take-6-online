import { useEffect, useRef, type MutableRefObject } from 'react';
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
import { Bullhead, IconBot, IconSparkle } from '../art/icons';
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

  useEffect(() => {
    if (!result) {
      celebrated.current = false;
      return;
    }
    if (celebrated.current) return;
    celebrated.current = true;
    if (iWon) {
      sound.play('win');
      const colors = ['#ff6b6b', '#fcc419', '#51cf66', '#4dabf7', '#b197fc', '#fff7ea'];
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.35 }, colors });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors }), 250);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors }), 400);
    } else if (self.playerId) sound.play('lose');
  }, [result, iWon, self.playerId]);

  if (!result) return null;
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
            <span className={clsx('w-6 text-center font-display text-lg font-extrabold tabular', s.rank === 1 ? 'text-hay' : 'text-fog')}>
              {s.rank === 1 ? '🏆' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : s.rank}
            </span>
            <Avatar id={s.avatar} size={36} />
            <span className="min-w-0 flex-1 truncate font-semibold">
              {s.playerId === self.playerId ? t('You') : s.name}
              {s.isBot && <IconBot size={13} className="ml-1.5 inline text-fog" />}
            </span>
            <span className="flex items-center gap-1 font-display text-lg font-bold tabular">
              <AnimatedNumber value={s.score} /> <Bullhead size={14} className="text-bull" />
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

      {self.playerId && !user && (
        <p className="mt-4 text-center text-xs text-fog">{t('Sign in from your profile to save wins and climb the leaderboard.')}</p>
      )}

      <AdSlot slot="results" className="mt-5" />

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {me?.isHost ? (
          <div className="flex flex-col gap-1.5">
            <button className="btn btn-primary" onClick={() => socket?.emit('game:rematch', { instant: true })}>{t('Play again')}</button>
            <button className="text-xs font-semibold text-fog hover:text-white" onClick={() => socket?.emit('game:rematch')}>{t('Change settings')}</button>
          </div>
        ) : (
          <div className="grid place-items-center rounded-xl bg-black/20 px-3 text-center text-xs text-fog">{t('Waiting for the host…')}</div>
        )}
        <button className="btn btn-ghost" onClick={onLeave}>{t('Leave table')}</button>
      </div>

      {!session.isPlus && (
        <Link to="/plus" className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-hay hover:underline">
          <IconSparkle size={14} /> {t('Go ad-free with {plus}', { plus: BRAND.plus })}
        </Link>
      )}
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
    gulp && gulp.biggestTake > 0 && { emoji: '🐮', label: t('Biggest gulp'), value: t('{name} · {n} in one row', { name: name(gulp), n: gulp.biggestTake }) },
    rows && rows.rowsTaken > 1 && { emoji: '🧺', label: t('Row collector'), value: t('{name} · {n} rows', { name: name(rows), n: rows.rowsTaken }) },
    clean.length > 0 && { emoji: '✨', label: t('Spotless'), value: clean.map(name).join(', ') },
  ].filter(Boolean) as { emoji: string; label: string; value: string }[];
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
            {st.emoji} {st.label}
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold">{st.value}</div>
        </motion.div>
      ))}
    </div>
  );
}
