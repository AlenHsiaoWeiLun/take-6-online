import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { CARD_THEMES, CHARACTERS, makeCard } from '@take6/shared';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { GameCard } from './GameCard';
import { IconLock, IconLogOut, IconSparkle, IconTrophy } from '../art/icons';
import { useSession } from '../state/session';
import { useT } from '../i18n';
import { SignInPanel } from './SignIn';
import { api } from '../lib/api';

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, updateProfile, user, authEnabled, signOut } = useSession();
  const [name, setName] = useState(session.name);
  const [me, setMe] = useState<{ rating: number; rank: number | null; ratedGames: number; peakRating: number } | null>(null);
  const t = useT();

  useEffect(() => {
    if (!open || !user) return setMe(null);
    api<{ profile: typeof me }>('/api/me').then((r) => setMe(r.profile)).catch(() => setMe(null));
  }, [open, user]);

  useEffect(() => {
    if (open) setName(session.name);
  }, [open, session.name]);

  const saveName = () => {
    const clean = name.trim().slice(0, 16);
    if (clean && clean !== session.name) updateProfile({ name: clean });
  };

  return (
    <Modal open={open} onClose={() => { saveName(); onClose(); }} label={t('Your profile')} className="max-w-lg">
      <div className="flex items-center gap-4">
        <Avatar id={session.avatar} size={64} />
        <div className="min-w-0">
          <div className="eyebrow">{t('Your profile')}</div>
          <div className="truncate font-display text-2xl font-bold">{session.name || t('Guest')}</div>
          <div className="mt-1 flex gap-2">
            {session.isPlus ? <span className="chip border-hay/30 bg-hay/10 text-hay"><IconSparkle size={12} /> Plus</span> : <span className="chip">{user ? t('Signed in') : t('Guest')}</span>}
          </div>
        </div>
        {me && (
          <div className="ml-auto text-right">
            <div className="flex items-center justify-end gap-1 font-display text-2xl font-extrabold tabular text-hay">
              <IconTrophy size={18} /> {me.rating}
            </div>
            <div className="text-xs text-fog">
              {me.rank ? t('Rank #{n}', { n: me.rank }) : t('{n} more games to get ranked', { n: Math.max(0, 5 - me.ratedGames) })}
            </div>
          </div>
        )}
      </div>

      <label className="mt-6 block">
        <span className="eyebrow">{t('Display name')}</span>
        <input
          className="input mt-2"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && saveName()}
          placeholder={t('Pick a name')}
        />
      </label>

      <div className="mt-6">
        <span className="eyebrow">{t('Character')}</span>
        <div className="mt-3 grid grid-cols-5 gap-2.5">
          {CHARACTERS.map((c) => {
            const locked = !!c.plus && !session.isPlus;
            const active = session.avatar === c.id;
            return (
              <button
                key={c.id}
                title={locked ? `${c.name} — ${t('Plus exclusive')}` : `${c.name}: ${t(c.tagline)}`}
                disabled={locked}
                onClick={() => updateProfile({ avatar: c.id })}
                className={clsx(
                  'group relative grid place-items-center rounded-2xl p-1.5 transition',
                  active ? 'bg-white/12 ring-2 ring-hay' : 'hover:bg-white/6',
                )}
              >
                <span className={clsx(locked && 'opacity-40 grayscale')}>
                  <Avatar id={c.id} size={52} />
                </span>
                <span className="mt-1 text-[11px] font-semibold text-mist">{c.name}</span>
                {locked && (
                  <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-hay text-ink-950">
                    <IconLock size={11} strokeWidth={2.4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <span className="eyebrow">{t('Card style')}</span>
        <div className="mt-3 grid grid-cols-4 gap-2.5">
          {CARD_THEMES.map((th) => {
            const locked = !!th.plus && !session.isPlus;
            const active = session.cardTheme === th.id;
            return (
              <button
                key={th.id}
                disabled={locked}
                onClick={() => updateProfile({ cardTheme: th.id })}
                title={locked ? `${t(th.name)} — ${t('Plus exclusive')}` : t(th.description)}
                className={clsx('relative flex flex-col items-center gap-1.5 rounded-2xl p-2 transition', active ? 'bg-white/12 ring-2 ring-hay' : 'hover:bg-white/6')}
              >
                <span className={clsx(locked && 'opacity-50')}>
                  <GameCard card={makeCard(55)} theme={th.id} width={46} />
                </span>
                <span className="text-[11px] font-semibold text-mist">{t(th.name)}</span>
                {locked && (
                  <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-hay text-ink-950">
                    <IconLock size={11} strokeWidth={2.4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!session.isPlus && (
          <Link to="/plus" onClick={onClose} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-hay hover:underline">
            <IconSparkle size={14} /> {t('Unlock every character and card style with Plus')}
          </Link>
        )}
      </div>

      {authEnabled && (
        <div className="mt-6 border-t border-white/8 pt-5">
          <span className="eyebrow">{t('Account')}</span>
          {user ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="truncate text-sm text-mist">{user.email}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
                <IconLogOut size={16} /> {t('Sign out')}
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <SignInPanel />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
