import { useEffect, useState, type MutableRefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { MAX_PLAYERS, MIN_PLAYERS, type BotLevel, type RoomSettings, type RoomSnapshot } from '@take6/shared';
import { Avatar } from '../components/Avatar';
import { AdSlot } from '../components/AdSlot';
import { Bullhead, IconBot, IconCheck, IconClose, IconCopy, IconCrown, IconGlobe, IconLock, IconPencil, IconPlay, IconPlus, IconShare, IconTimer } from '../art/icons';
import { Modal } from '../components/Modal';
import { useSession } from '../state/session';
import { useCountdown } from './useCountdown';
import { config } from '../lib/config';
import { ProfileDialog } from '../components/ProfileDialog';
import { useT } from '../i18n';

const BOT_HINT: Record<BotLevel, string> = {
  easy: 'Plays loose, often at random',
  normal: 'Counts cards, but still slips up',
  hard: 'Simulates hundreds of outcomes every turn',
};

export function Lobby({ snapshot, clockOffset }: { snapshot: RoomSnapshot; clockOffset: MutableRefObject<number> }) {
  const { socket, session, updateProfile } = useSession();
  const navigate = useNavigate();
  const t = useT();
  const { room, self } = snapshot;
  const [name, setName] = useState(session.name);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const autoStart = useCountdown(room.deadline, clockOffset);

  useEffect(() => {
    setName(session.name);
  }, [session.name]);

  const me = room.players.find((p) => p.id === self.playerId);
  const isHost = !!me?.isHost;
  const defaultName = /^Guest [0-9A-F]{4}$/i.test(session.name);
  const missing = Math.max(0, MIN_PLAYERS - room.players.length);
  const full = room.players.length >= room.settings.maxPlayers;
  const s = room.settings;
  const humans = room.players.filter((p) => !p.isBot).length;
  const bots = room.players.length - humans;
  const hostName = room.players.find((p) => p.isHost)?.name ?? t('the host');

  const commitName = () => {
    const clean = name.trim().slice(0, 16);
    if (clean && clean !== session.name) updateProfile({ name: clean });
  };
  const link = `${config.siteUrl}/play/${room.code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  const share = () => navigator.share?.({ title: t('Join my Bullheads table'), text: t('Room code {code}', { code: room.code }), url: link }).catch(() => {});
  const set = (patch: Partial<RoomSettings>) => socket?.emit('room:settings', patch);
  const start = () => socket?.emit('game:start', (res) => setStartError(res.ok ? null : t(res.error)));
  const addBot = () => socket?.emit('room:addBot');

  const summary = [
    t('{n} seats', { n: s.maxPlayers }),
    s.mode === 'classic' ? t('Race to 66') : t('Quick game'),
    s.turnSeconds ? `${s.turnSeconds}s` : t('Untimed'),
    t('{level} bots', { level: t(s.botLevel) }),
    s.isPublic ? t('Listed') : t('Private'),
  ].join(' · ');

  // One sentence that says what the table is waiting for.
  const headline =
    autoStart !== null
      ? t('Starting in {s}s', { s: Math.ceil(autoStart) })
      : isHost
        ? missing > 0
          ? t('Invite friends, or add a bot')
          : t('Everyone here? Deal when you’re ready.')
        : t('{name} will start the game', { name: hostName });
  const subline =
    autoStart !== null
      ? t('{n} of {max} seated — empty seats fill with bots.', { n: room.players.length, max: s.maxPlayers })
      : t('Friends open the link, type a name, and they’re in.');

  return (
    <div className="mx-auto max-w-4xl px-4 pb-36 pt-6 sm:pt-10">
      {/* ------------------------------------------------ what's happening + invite */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-fog">
            {s.isPublic ? <IconGlobe size={13} /> : <IconLock size={13} />}
            {s.isPublic ? t('Public table') : t('Private table')}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl" role="status">{headline}</h1>
          <p className="mt-1 text-sm text-fog">{subline}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="mr-1 font-display text-3xl font-extrabold tracking-[0.14em]" aria-label={t('Room code {code}', { code: room.code })}>
            {room.code}
          </span>
          <button className="btn btn-outline !px-3.5 !py-2 text-sm" onClick={copy}>
            {copied ? <IconCheck size={15} /> : <IconCopy size={15} />} {copied ? t('Copied') : t('Copy link')}
          </button>
          <a
            className="btn btn-outline !px-3.5 !py-2 text-sm"
            href={`https://line.me/R/msg/text/?${encodeURIComponent(`${t('Join my Bullheads table')} ${link}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="size-2 rounded-full bg-[#06C755]" /> LINE
          </a>
          {'share' in navigator && (
            <button className="btn btn-outline !px-3 !py-2" onClick={share} aria-label={t('Share')}>
              <IconShare size={15} />
            </button>
          )}
        </div>
      </section>

      {/* ------------------------------------------------ the table: people first */}
      <section className="felt mt-6 rounded-[1.8rem] px-4 py-8 sm:px-8 sm:py-10">
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-6 sm:gap-x-6">
          {room.players.map((p) => {
            const mine = p.id === self.playerId;
            return (
              <li key={p.id} className="group relative flex w-[5.5rem] flex-col items-center text-center sm:w-24">
                <div className="relative">
                  {mine ? (
                    <button onClick={() => setProfileOpen(true)} className="block rounded-full transition hover:scale-105" aria-label={t('Choose character')}>
                      <Avatar id={p.avatar} size={64} ring="rgba(255,255,255,.35)" />
                    </button>
                  ) : (
                    <Avatar id={p.avatar} size={64} className={clsx(!p.connected && !p.isBot && 'opacity-40 grayscale')} />
                  )}
                  {p.isHost && (
                    <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-ink-950 text-white ring-1 ring-white/15" title={t('Host')}>
                      <IconCrown size={13} />
                    </span>
                  )}
                  {p.isBot && (
                    <span className="absolute -bottom-0.5 -right-1 grid size-6 place-items-center rounded-full bg-ink-950 text-mist ring-1 ring-white/15" title={t('Bot')}>
                      <IconBot size={13} />
                    </span>
                  )}
                  {isHost && !p.isHost && (
                    <div className="absolute -left-2 -top-2 flex flex-col gap-1 opacity-70 transition group-hover:opacity-100">
                      <button
                        onClick={() => socket?.emit('room:remove', p.id)}
                        className="grid size-6 place-items-center rounded-full bg-ink-950 text-fog ring-1 ring-white/15 hover:text-white"
                        aria-label={t('Remove {name}', { name: p.name })}
                      >
                        <IconClose size={12} />
                      </button>
                      {!p.isBot && p.connected && (
                        <button
                          onClick={() => socket?.emit('room:makeHost', p.id)}
                          className="grid size-6 place-items-center rounded-full bg-ink-950 text-fog ring-1 ring-white/15 hover:text-white"
                          aria-label={t('Make host')}
                          title={t('Make host')}
                        >
                          <IconCrown size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {mine && editing ? (
                  <input
                    className="input mt-2 !rounded-lg !px-2 !py-1 text-center text-sm"
                    value={name}
                    maxLength={16}
                    autoFocus
                    aria-label={t('Your name')}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => (commitName(), setEditing(false))}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  />
                ) : mine ? (
                  <button className="mt-2 flex max-w-full items-center gap-1 text-sm font-semibold hover:text-white" onClick={() => setEditing(true)}>
                    <span className="truncate">{p.name}</span> <IconPencil size={12} className="shrink-0 text-fog" />
                  </button>
                ) : (
                  <div className="mt-2 w-full truncate text-sm font-semibold">{p.name}</div>
                )}
                <div className="mt-0.5 text-[11px] text-fog">
                  {mine ? (defaultName && !editing ? t('Tap to set your name') : t('You')) : !p.isBot && !p.connected ? t('Away') : ''}
                </div>
                {p.session.games > 0 && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-fog tabular">
                    {t('{w} wins', { w: p.session.wins })} · {p.session.bullheads} <Bullhead size={10} />
                  </div>
                )}
              </li>
            );
          })}
          {Array.from({ length: s.maxPlayers - room.players.length }, (_, i) =>
            isHost ? (
              <li key={`open-${i}`} className="flex w-[5.5rem] flex-col items-center sm:w-24">
                <button
                  onClick={addBot}
                  className="grid size-16 place-items-center rounded-full border border-dashed border-white/15 text-fog transition hover:border-white/40 hover:text-white"
                  aria-label={t('Add bot')}
                >
                  <IconPlus size={18} />
                </button>
                <span className="mt-2 text-[11px] text-fog/70">{i === 0 ? t('Add bot') : t('Open seat')}</span>
              </li>
            ) : (
              <li key={`open-${i}`} className="flex w-[5.5rem] flex-col items-center sm:w-24">
                <span className="size-16 rounded-full border border-dashed border-white/10" />
                <span className="mt-2 text-[11px] text-fog/50">{t('Open seat')}</span>
              </li>
            ),
          )}
        </ul>
        {room.spectatorCount > 0 && <p className="mt-6 text-center text-xs text-fog">{t('{n} watching', { n: room.spectatorCount })}</p>}
        {!self.playerId && <p className="mt-6 text-center text-sm text-fog">{t('This table is full — you’re watching as a spectator.')}</p>}
      </section>

      {/* ------------------------------------------------ rules: one line */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
        <span className="text-fog">{summary}</span>
        <button className="font-semibold text-mist underline-offset-4 hover:text-white hover:underline" onClick={() => setRulesOpen(true)}>
          {isHost ? t('Change rules') : t('View rules')}
        </button>
      </div>

      <AdSlot slot="banner" className="mt-8" />

      {/* ------------------------------------------------ start: one button, always on screen */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-ink-950 via-ink-950/85 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12">
        <div className="pointer-events-auto mx-auto flex max-w-md flex-col items-center gap-2">
          {autoStart !== null ? (
            <div className="flex gap-2">
              {isHost && (
                <button className="btn btn-cta" onClick={start} disabled={room.players.length < MIN_PLAYERS}>
                  {t('Start now')}
                </button>
              )}
              <button className="btn btn-outline" onClick={() => navigate('/')}>
                {t('Leave queue')}
              </button>
            </div>
          ) : isHost ? (
            <>
              <button className="btn btn-cta w-full max-w-xs !py-3.5 !text-lg" disabled={missing > 0} onClick={start}>
                <IconPlay size={16} /> {t('Deal the cards')}
              </button>
              {missing > 0 && <span className="text-xs text-fog">{t('Needs at least {n} players', { n: MIN_PLAYERS })}</span>}
            </>
          ) : (
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/90 px-4 py-2 text-sm font-semibold text-mist">
              <IconCheck size={15} className="text-mint" /> {t('You’re in. Waiting for {name}.', { name: hostName })}
            </span>
          )}
          {startError && <p className="text-center text-sm text-bull">{startError}</p>}
        </div>
      </div>

      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} label={t('Table rules')}>
        <h2 className="font-display text-2xl font-bold">{t('Table rules')}</h2>
        {!isHost && <p className="mt-1 text-sm text-fog">{t('Only the host can change these.')}</p>}
        <div className="mt-5 grid gap-5">
          <Setting label={t('Seats')}>
            <Seg>
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
                <button key={n} aria-pressed={s.maxPlayers === n} disabled={!isHost || n < room.players.length} onClick={() => set({ maxPlayers: n })}>
                  {n}
                </button>
              ))}
            </Seg>
          </Setting>
          <Setting label={t('Game length')}>
            <Seg>
              <button aria-pressed={s.mode === 'quick'} disabled={!isHost} onClick={() => set({ mode: 'quick' })}>{t('Quick · 10 turns')}</button>
              <button aria-pressed={s.mode === 'classic'} disabled={!isHost} onClick={() => set({ mode: 'classic' })}>{t('Race to 66')}</button>
            </Seg>
          </Setting>
          <Setting label={t('Turn timer')} hint={s.turnSeconds ? t('When time runs out a safe card is played for you; a row choice picks the cheapest row. If you leave, a bot plays until you’re back.') : t('Untimed: take as long as you like (private tables only).')}>
            <Seg>
              {(s.isPublic ? [15, 30, 45, 60] : [0, 15, 30, 45, 60]).map((sec) => (
                <button key={sec} aria-pressed={s.turnSeconds === sec} disabled={!isHost} onClick={() => set({ turnSeconds: sec })}>
                  {sec ? `${sec}s` : <IconTimer size={14} aria-label={t('Untimed')} className="inline" />}
                  {!sec && <span className="ml-1">{t('Off')}</span>}
                </button>
              ))}
            </Seg>
          </Setting>
          <Setting label={t('Bot skill')} hint={t(BOT_HINT[s.botLevel])}>
            <Seg>
              {(['easy', 'normal', 'hard'] as const).map((l) => (
                <button key={l} aria-pressed={s.botLevel === l} disabled={!isHost} onClick={() => set({ botLevel: l })}>
                  {t(l)}
                </button>
              ))}
            </Seg>
          </Setting>
          <Setting label={t('Visibility')} hint={s.isPublic ? t('Listed on the home page for strangers to join.') : t('Only people with the code or link can join.')}>
            <Seg>
              <button aria-pressed={!s.isPublic} disabled={!isHost} onClick={() => set({ isPublic: false })}>{t('Private')}</button>
              <button aria-pressed={s.isPublic} disabled={!isHost} onClick={() => set({ isPublic: true })}>{t('Listed')}</button>
            </Seg>
          </Setting>
        </div>
        <button className="btn btn-cta mt-6 w-full" onClick={() => setRulesOpen(false)}>
          {t('Done')}
        </button>
      </Modal>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function Setting({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-fog">{hint}</p>}
    </div>
  );
}

function Seg({ children }: { children: React.ReactNode }) {
  return <div className="seg flex-wrap">{children}</div>;
}
