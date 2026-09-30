import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Logo } from '../art/Logo';
import { IconMute, IconSparkle, IconVolume } from '../art/icons';
import { Avatar } from './Avatar';
import { ProfileDialog } from './ProfileDialog';
import { useSession } from '../state/session';
import { sound } from '../lib/sound';

export function useMuted() {
  const [muted, setMuted] = useState(sound.muted);
  useEffect(() => {
    const off = sound.subscribe(setMuted);
    return () => void off();
  }, []);
  return [muted, (v: boolean) => sound.setMuted(v)] as const;
}

export function Header({ minimal = false }: { minimal?: boolean }) {
  const { session, connected } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [muted, setMuted] = useMuted();

  const nav = [
    { to: '/rules', label: 'How to play' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-ink-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="shrink-0" aria-label="Home">
          <Logo />
        </Link>
        {!minimal && (
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => clsx('rounded-lg px-3 py-2 text-sm font-semibold transition', isActive ? 'bg-white/8 text-white' : 'text-fog hover:text-white')}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!session.isPlus && (
            <Link to="/plus" className="btn btn-gold btn-sm hidden xs:inline-flex">
              <IconSparkle size={15} /> Plus
            </Link>
          )}
          <button className="btn btn-ghost btn-sm !px-2.5" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <IconMute size={17} /> : <IconVolume size={17} />}
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 rounded-full border border-white/8 bg-white/5 py-1 pl-1 pr-3 transition hover:bg-white/10"
          >
            <span className="relative">
              <Avatar id={session.avatar} size={30} ring={session.isPlus ? '#f5b942' : undefined} />
              <span className={clsx('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-ink-950', connected ? 'bg-mint' : 'bg-fog')} />
            </span>
            <span className="max-w-[7rem] truncate text-sm font-semibold">{session.name || 'Set name'}</span>
          </button>
        </div>
      </div>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}
