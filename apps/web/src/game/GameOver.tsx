import { useEffect, useRef, type MutableRefObject } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import clsx from 'clsx';
import { CLASSIC_TARGET, type RoomSnapshot } from '@take6/shared';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { AdSlot } from '../components/AdSlot';
import { WinnerArt } from '../art/Illustrations';
import { Bullhead, IconBot, IconSparkle } from '../art/icons';
import { useSession } from '../state/session';
import { sound } from '../lib/sound';
import { useCountdown } from './useCountdown';
import { BRAND } from '../brand';
import { useT } from '../i18n';

export function GameOver({ snapshot, onLeave }: { snapshot: RoomSnapshot; onLeave: () => void }) {
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
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.35 }, colors: ['#e5484d', '#f5b942', '#fff7ea', '#5ac8fa'] });
    } else if (self.playerId) sound.play('lose');
  }, [result, iWon, self.playerId]);

  if (!result) return null;
  const winner = result.standings[0];
  const winners = result.standings.filter((s) => s.rank === 1);
  const headline = iWon
    ? winners.length > 1 ? t('Shared victory!') : t('You win!')
    : winners.length > 1 ? t('{names} tie', { names: winners.map((w) => w.name).join(' & ') }) : t('{name} wins', { name: winner.name });

  return (
    <Modal open label={t('Game over')} className="max-w-lg">
      <div className="text-center">
        <WinnerArt avatar={winner.avatar} />
        <div className="eyebrow mt-4">{t('Game over')}</div>
        <h2 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{headline}</h2>
        <p className="mt-1 text-sm text-fog">{t('Fewest bullheads wins.')}</p>
      </div>

      <ol className="mt-6 space-y-2">
        {result.standings.map((s) => (
          <li
            key={s.playerId}
            className={clsx(
              'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
              s.rank === 1 ? 'border-hay/40 bg-hay/10' : 'border-white/7 bg-white/[0.03]',
              s.playerId === self.playerId && s.rank !== 1 && 'border-white/20',
            )}
          >
            <span className={clsx('w-6 text-center font-display text-lg font-extrabold tabular', s.rank === 1 ? 'text-hay' : 'text-fog')}>{s.rank}</span>
            <Avatar id={s.avatar} size={36} />
            <span className="min-w-0 flex-1 truncate font-semibold">
              {s.playerId === self.playerId ? t('You') : s.name}
              {s.isBot && <IconBot size={13} className="ml-1.5 inline text-fog" />}
            </span>
            <span className="flex items-center gap-1 font-display text-lg font-bold tabular">
              {s.score} <Bullhead size={14} className="text-bull" />
            </span>
          </li>
        ))}
      </ol>

      {self.playerId && !user && (
        <p className="mt-4 text-center text-xs text-fog">{t('Sign in from your profile to save wins and climb the leaderboard.')}</p>
      )}

      <AdSlot slot="results" className="mt-5" />

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {me?.isHost ? (
          <button className="btn btn-primary" onClick={() => socket?.emit('game:rematch')}>{t('Play again')}</button>
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
