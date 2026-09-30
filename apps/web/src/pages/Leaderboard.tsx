import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { DEFAULT_RATING, LEADERBOARD_MIN_GAMES } from '@take6/shared';
import { Avatar } from '../components/Avatar';
import { AdSlot } from '../components/AdSlot';
import { SignInDialog } from '../components/SignIn';
import { IconSparkle, IconTrophy } from '../art/icons';
import { Art } from '../art/Art';
import { api } from '../lib/api';
import { useSession } from '../state/session';
import { useT } from '../i18n';
import { RankBadge } from '../game/GameOver';

interface Row {
  rank: number;
  displayName: string;
  avatar: string;
  isPlus: boolean;
  rating: number;
  peakRating: number;
  games: number;
  winRate: number;
}

interface Me {
  displayName: string;
  avatar: string;
  rating: number;
  peakRating: number;
  ratedGames: number;
  rank: number | null;
}

export function Leaderboard() {
  const t = useT();
  const { user, authEnabled } = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [signIn, setSignIn] = useState(false);

  useEffect(() => {
    api<{ players: Row[] }>('/api/leaderboard').then((r) => setRows(r.players)).catch(() => setRows([]));
  }, []);
  useEffect(() => {
    if (!user) {
      setMe(null);
      return;
    }
    api<{ profile: Me | null }>('/api/me').then((r) => setMe(r.profile)).catch(() => setMe(null));
  }, [user]);


  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-4">
        <Art
          id="render-trophy"
          alt=""
          className="size-20 object-contain"
          fallback={<span className="grid size-14 place-items-center rounded-2xl bg-hay/12 text-hay"><IconTrophy size={28} /></span>}
        />
        <div>
          <div className="eyebrow">{t('Elo rating')}</div>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{t('Leaderboard')}</h1>
        </div>
      </div>
      <p className="mt-3 text-fog">
        {t('Everyone starts at {r}. Finishing above an opponent wins you points, below loses them — beating stronger players is worth more. Bots count as fixed-strength opponents. {n} games to get ranked.', {
          r: DEFAULT_RATING,
          n: LEADERBOARD_MIN_GAMES,
        })}
      </p>

      {me ? (
        <div className="panel mt-6 flex items-center gap-4 p-4">
          <Avatar id={me.avatar} size={48} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{me.displayName}</div>
            <div className="text-sm text-fog">
              {me.rank
                ? t('Rank #{n} · peak {p}', { n: me.rank, p: me.peakRating })
                : t('{n} more games to get ranked', { n: Math.max(0, LEADERBOARD_MIN_GAMES - me.ratedGames) })}
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold tabular text-hay">{me.rating}</div>
        </div>
      ) : (
        authEnabled && (
          <div className="panel mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="text-sm text-mist">{t('Sign in to get a rating and appear on the leaderboard.')}</span>
            <button className="btn btn-primary btn-sm" onClick={() => setSignIn(true)}>{t('Sign in')}</button>
          </div>
        )
      )}

      <div className="panel mt-6 overflow-hidden">
        <div className="grid grid-cols-[2.75rem_1fr_4.5rem_4rem_4rem] gap-2 border-b border-white/6 px-4 py-3 text-xs font-bold uppercase tracking-wider text-fog">
          <span>#</span>
          <span>{t('Player')}</span>
          <span className="text-right">Elo</span>
          <span className="text-right">{t('Games')}</span>
          <span className="text-right">{t('Win %')}</span>
        </div>
        {rows === null && <div className="p-8 text-center text-fog">{t('Loading…')}</div>}
        {rows?.length === 0 && (
          <div className="flex flex-col items-center p-8 text-center text-fog">
            <Art id="illustration-empty" alt="" className="mb-3 w-48" fallback={null} />
            {t('No ranked players yet. Be the first!')}
          </div>
        )}
        {rows?.map((r) => (
          <div
            key={r.rank}
            className={clsx(
              'grid grid-cols-[2.75rem_1fr_4.5rem_4rem_4rem] items-center gap-2 border-b border-white/4 px-4 py-2.5 last:border-0',
              r.rank <= 3 && 'bg-hay/[0.04]',
            )}
          >
            <RankBadge rank={r.rank} />
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar id={r.avatar} size={32} ring={r.isPlus ? '#f5b942' : undefined} />
              <span className="truncate font-semibold">{r.displayName}</span>
              {r.isPlus && <IconSparkle size={13} className="shrink-0 text-hay" />}
            </span>
            <span className="text-right font-display text-lg font-bold tabular" title={t('Peak {p}', { p: r.peakRating })}>
              {r.rating}
            </span>
            <span className="text-right text-fog tabular">{r.games}</span>
            <span className="text-right text-fog tabular">{r.winRate}%</span>
          </div>
        ))}
      </div>
      <AdSlot slot="banner" className="mt-8" />
      <SignInDialog open={signIn} onClose={() => setSignIn(false)} />
    </div>
  );
}
