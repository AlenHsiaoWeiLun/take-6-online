import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Logo } from '../art/Logo';
import { IconMusic, IconMusicOff, IconMute, IconSettings, IconSparkle, IconVolume } from '../art/icons';
import { Avatar } from './Avatar';
import { ProfileDialog } from './ProfileDialog';
import { SignInDialog } from './SignIn';
import { useSession } from '../state/session';
import { sound } from '../lib/sound';
import { useLang } from '../i18n';

export function useMuted() {
  const [muted, setMuted] = useState(sound.muted);
  useEffect(() => sound.subscribe(() => setMuted(sound.muted)), []);
  return [muted, (v: boolean) => sound.setMuted(v)] as const;
}

export function useMusic() {
  const [on, setOn] = useState(sound.music);
  useEffect(() => sound.subscribe(() => setOn(sound.music)), []);
  return [on, (v: boolean) => sound.setMusic(v)] as const;
}

export function Header({ minimal = false }: { minimal?: boolean }) {
  const { session, connected, user, authEnabled } = useSession();
  const [signInOpen, setSignInOpen] = useState(false);
  useEffect(() => {
    if (user) setSignInOpen(false);
  }, [user]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [muted, setMuted] = useMuted();
  const [music, setMusic] = useMusic();
  const { t, lang, setLang } = useLang();

  const nav = [
    { to: '/rules', label: t('How to play') },
    { to: '/leaderboard', label: t('Leaderboard') },
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
                className={({ isActive }) => clsx('whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition', isActive ? 'bg-white/8 text-white' : 'text-fog hover:text-white')}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!session.isPlus && (
            <Link to="/plus" className="hidden items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-hay hover:bg-hay/10 sm:inline-flex">
              <IconSparkle size={14} /> Plus
            </Link>
          )}
          <SettingsMenu
            lang={lang}
            onLang={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            muted={muted}
            onMute={() => setMuted(!muted)}
            music={music}
            onMusic={() => setMusic(!music)}
          />
          {authEnabled && !user && (
            <button className="btn btn-primary btn-sm" onClick={() => setSignInOpen(true)}>
              {t('Sign in')}
            </button>
          )}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 rounded-full border border-white/8 bg-white/5 py-1 pl-1 pr-3 transition hover:bg-white/10"
          >
            <span className="relative">
              <Avatar id={session.avatar} size={30} ring={session.isPlus ? '#f5b942' : undefined} />
              <span className={clsx('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-ink-950', connected ? 'bg-mint' : 'bg-fog')} />
            </span>
            <span className="max-w-[7rem] truncate text-sm font-semibold">{session.name || t('Set name')}</span>
          </button>
        </div>
      </div>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </header>
  );
}

function SettingsMenu(p: { lang: string; onLang: () => void; muted: boolean; onMute: () => void; music: boolean; onMusic: () => void }) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  const row = 'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/6';
  return (
    <div ref={ref} className="relative">
      <button className="btn btn-ghost btn-sm !px-2.5" onClick={() => setOpen((o) => !o)} aria-label={t('Settings')} aria-expanded={open}>
        <IconSettings size={17} />
      </button>
      {open && (
        <div className="panel absolute right-0 top-11 z-50 w-56 bg-ink-850 p-1.5">
          <button className={row} onClick={p.onLang}>
            <span>{t('Language')}</span>
            <span className="text-fog">{p.lang === 'zh' ? '中文 → EN' : 'EN → 中文'}</span>
          </button>
          <button className={row} onClick={p.onMute}>
            <span className="flex items-center gap-2">{p.muted ? <IconMute size={16} /> : <IconVolume size={16} />} {t('Sound effects')}</span>
            <span className={p.muted ? 'text-fog' : 'text-mint'}>{p.muted ? t('Off') : t('On')}</span>
          </button>
          <button className={row} onClick={p.onMusic}>
            <span className="flex items-center gap-2">{p.music ? <IconMusic size={16} /> : <IconMusicOff size={16} />} {t('Music')}</span>
            <span className={p.music ? 'text-mint' : 'text-fog'}>{p.music ? t('On') : t('Off')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
