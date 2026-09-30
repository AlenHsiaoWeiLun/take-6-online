import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { CARD_THEMES, CHARACTERS, makeCard } from '@take6/shared';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { GameCard } from './GameCard';
import { IconGoogle, IconLock, IconLogOut, IconSparkle } from '../art/icons';
import { useSession } from '../state/session';

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, updateProfile, user, authEnabled, signInWithGoogle, signInWithEmail, signOut } = useSession();
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState('');
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | string>('idle');

  useEffect(() => {
    if (open) setName(session.name);
  }, [open, session.name]);

  const saveName = () => {
    const clean = name.trim().slice(0, 16);
    if (clean && clean !== session.name) updateProfile({ name: clean });
  };

  return (
    <Modal open={open} onClose={() => { saveName(); onClose(); }} label="Your profile" className="max-w-lg">
      <div className="flex items-center gap-4">
        <Avatar id={session.avatar} size={64} />
        <div className="min-w-0">
          <div className="eyebrow">Your profile</div>
          <div className="truncate font-display text-2xl font-bold">{session.name || 'Guest'}</div>
          <div className="mt-1 flex gap-2">
            {session.isPlus ? <span className="chip border-hay/30 bg-hay/10 text-hay"><IconSparkle size={12} /> Plus</span> : <span className="chip">{user ? 'Signed in' : 'Guest'}</span>}
          </div>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="eyebrow">Display name</span>
        <input
          className="input mt-2"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && saveName()}
          placeholder="Pick a name"
        />
      </label>

      <div className="mt-6">
        <span className="eyebrow">Character</span>
        <div className="mt-3 grid grid-cols-5 gap-2.5">
          {CHARACTERS.map((c) => {
            const locked = !!c.plus && !session.isPlus;
            const active = session.avatar === c.id;
            return (
              <button
                key={c.id}
                title={locked ? `${c.name} — Plus exclusive` : `${c.name}: ${c.tagline}`}
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
        <span className="eyebrow">Card style</span>
        <div className="mt-3 grid grid-cols-4 gap-2.5">
          {CARD_THEMES.map((t) => {
            const locked = !!t.plus && !session.isPlus;
            const active = session.cardTheme === t.id;
            return (
              <button
                key={t.id}
                disabled={locked}
                onClick={() => updateProfile({ cardTheme: t.id })}
                title={locked ? `${t.name} — Plus exclusive` : t.description}
                className={clsx('relative flex flex-col items-center gap-1.5 rounded-2xl p-2 transition', active ? 'bg-white/12 ring-2 ring-hay' : 'hover:bg-white/6')}
              >
                <span className={clsx(locked && 'opacity-50')}>
                  <GameCard card={makeCard(55)} theme={t.id} width={46} />
                </span>
                <span className="text-[11px] font-semibold text-mist">{t.name}</span>
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
            <IconSparkle size={14} /> Unlock every character and card style with Plus
          </Link>
        )}
      </div>

      {authEnabled && (
        <div className="mt-6 border-t border-white/8 pt-5">
          <span className="eyebrow">Account</span>
          {user ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="truncate text-sm text-mist">{user.email}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
                <IconLogOut size={16} /> Sign out
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-fog">Sign in to save your stats, climb the leaderboard and keep Plus on every device.</p>
              <button className="btn btn-ghost w-full" onClick={() => signInWithGoogle()}>
                <IconGoogle /> Continue with Google
              </button>
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setEmailState('sending');
                  try {
                    await signInWithEmail(email);
                    setEmailState('sent');
                  } catch (err) {
                    setEmailState((err as Error).message);
                  }
                }}
              >
                <input className="input" type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button className="btn btn-ghost shrink-0" disabled={emailState === 'sending'}>
                  Email link
                </button>
              </form>
              {emailState === 'sent' && <p className="text-sm text-mint">Check your inbox for a sign-in link.</p>}
              {!['idle', 'sending', 'sent'].includes(emailState) && <p className="text-sm text-bull">{emailState}</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
