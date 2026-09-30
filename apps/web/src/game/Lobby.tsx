import { useEffect, useState, type MutableRefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { MAX_PLAYERS, MIN_PLAYERS, type BotLevel, type RoomSettings, type RoomSnapshot } from '@take6/shared';
import { Avatar } from '../components/Avatar';
import { AdSlot } from '../components/AdSlot';
import { Bullhead, IconBot, IconCheck, IconClose, IconCopy, IconCrown, IconGlobe, IconLock, IconPlay, IconPlus, IconShare, IconSparkle, IconTimer } from '../art/icons';
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

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 sm:pt-6">
      <StepGuide
        steps={
          autoStart !== null
            ? [
                { label: t('Matched with strangers'), done: true },
                { label: t('{n} of {max} seated', { n: room.players.length, max: s.maxPlayers }), done: false },
                { label: t('Starts automatically in {s}s', { s: Math.ceil(autoStart) }), done: false },
              ]
            : [
                { label: t('Invite friends with the link'), done: humans > 1 || copied },
                { label: t('{h} people, {b} bots seated', { h: humans, b: bots }), done: room.players.length >= MIN_PLAYERS },
                { label: isHost ? t('You press “Deal the cards”') : t('{name} starts the game', { name: hostName }), done: false },
              ]
        }
      />
      {/* ------------------------------------------------ invite + your seat */}
      <section className="panel grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div>
          <div className="eyebrow flex items-center gap-2">
            {s.isPublic ? <IconGlobe size={13} /> : <IconLock size={13} />}
            {s.isPublic ? t('Public table') : t('Invite friends')}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <span className="font-display text-5xl font-extrabold tracking-[0.12em]" aria-label={t('Room code {code}', { code: room.code })}>
              {room.code}
            </span>
            <button className="btn btn-primary btn-sm" onClick={copy}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />} {copied ? t('Copied') : t('Copy invite link')}
            </button>
            <a
              className="btn btn-sm !bg-[#06C755] !text-white"
              href={`https://line.me/R/msg/text/?${encodeURIComponent(`${t('Join my Bullheads table')} ${link}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              LINE
            </a>
            {'share' in navigator && (
              <button className="btn btn-ghost btn-sm" onClick={share}>
                <IconShare size={16} /> {t('Share')}
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-mist">{t('Friends open the link, type a name, and they’re in.')}</p>
        </div>
        {self.playerId && (
          <div className="sm:w-64">
            <label className={clsx('eyebrow', defaultName && '!text-hay')} htmlFor="my-name">
              {defaultName ? t('Pick a name so friends know it’s you') : t('Your name')}
            </label>
            <div className="mt-2 flex items-center gap-2.5">
              <button onClick={() => setProfileOpen(true)} className="shrink-0 rounded-full transition hover:scale-105" aria-label={t('Choose character')}>
                <Avatar id={session.avatar} size={42} ring="rgba(255,255,255,.18)" />
              </button>
              <input
                id="my-name"
                className={clsx('input !py-2', defaultName && '!border-hay/60')}
                value={name}
                maxLength={16}
                autoFocus={defaultName}
                placeholder={t('Your name')}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), commitName())}
              />
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------ matchmaking status */}
      {autoStart !== null && (
        <section className="panel mt-4 flex flex-wrap items-center gap-3 border-hay/30 p-4" role="status">
          <span className="font-display text-3xl font-extrabold tabular text-hay">{Math.ceil(autoStart)}s</span>
          <span className="min-w-0 flex-1 text-sm text-mist">
            {t('{n} of {max} seats taken. When the timer ends, empty seats fill with bots and the deal starts.', { n: room.players.length, max: s.maxPlayers })}
          </span>
          {isHost && (
            <button className="btn btn-ghost btn-sm" onClick={start} disabled={room.players.length < MIN_PLAYERS}>
              {t('Start now')}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            {t('Leave queue')}
          </button>
        </section>
      )}

      {/* ------------------------------------------------ players */}
      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">
            {t('Players')} <span className="text-base font-semibold text-fog tabular">{room.players.length}/{s.maxPlayers}</span>
            {room.spectatorCount > 0 && <span className="ml-2 text-sm font-medium text-fog">{t('{n} watching', { n: room.spectatorCount })}</span>}
          </h2>
          {isHost && !full && (
            <button className="btn btn-ghost btn-sm" onClick={addBot}>
              <IconPlus size={15} /> {t('Add bot')}
            </button>
          )}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {room.players.map((p) => (
            <li key={p.id} className={clsx('panel relative flex items-center gap-2.5 p-2.5 sm:p-3', p.id === self.playerId && 'ring-1 ring-hay/50')}>
              <Avatar id={p.avatar} size={36} ring={p.isPlus ? '#f5b942' : undefined} className={clsx('shrink-0', !p.connected && !p.isBot && 'opacity-40')} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold sm:text-base">{p.id === self.playerId ? `${p.name} (${t('You')})` : p.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] font-semibold text-mist">
                  {p.isHost && (
                    <span className="inline-flex items-center gap-0.5 text-hay">
                      <IconCrown size={11} /> {t('Host')}
                    </span>
                  )}
                  {p.isBot && (
                    <span className="inline-flex items-center gap-0.5">
                      <IconBot size={11} /> {t('Bot')}
                    </span>
                  )}
                  {!p.isBot && (p.connected ? <span className="text-mint">● {t('Here')}</span> : <span className="text-fog">○ {t('Away')}</span>)}
                  {p.isPlus && <IconSparkle size={11} className="text-hay" />}
                </div>
                {p.session.games > 0 && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-fog tabular">
                    {t('Tonight: {w} wins', { w: p.session.wins })} · {p.session.bullheads} <Bullhead size={10} />
                  </div>
                )}
              </div>
              {isHost && !p.isHost && (
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => socket?.emit('room:remove', p.id)}
                    className="rounded-md p-1 text-fog/70 hover:bg-white/8 hover:text-white"
                    aria-label={t('Remove {name}', { name: p.name })}
                  >
                    <IconClose size={14} />
                  </button>
                  {!p.isBot && p.connected && (
                    <button onClick={() => socket?.emit('room:makeHost', p.id)} className="text-[10px] font-semibold text-fog hover:text-hay" title={t('Make host')}>
                      <IconCrown size={13} />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
          {Array.from({ length: s.maxPlayers - room.players.length }, (_, i) => (
            <li key={`open-${i}`} className="grid min-h-[70px] place-items-center rounded-[1.25rem] border border-dashed border-white/[0.07] text-xs text-fog/50">
              {t('Open seat')}
            </li>
          ))}
        </ul>
        {!self.playerId && <p className="mt-3 text-sm text-fog">{t('This table is full — you’re watching as a spectator.')}</p>}
      </section>

      {/* ------------------------------------------------ settings (secondary) */}
      <details className="panel group mt-6 p-4 sm:p-5" open={false}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span>
            <span className="font-display text-lg font-bold">{t('Table rules')}</span>
            <span className="mt-0.5 block text-xs text-fog">{summary}</span>
          </span>
          <span className="text-sm font-semibold text-hay group-open:hidden">{isHost ? t('Change') : t('View')}</span>
        </summary>
        {!isHost && <p className="mt-3 text-sm text-fog">{t('Only the host can change these.')}</p>}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
      </details>

      <AdSlot slot="banner" className="mt-6" />
      {/* ------------------------------------------------ start: pinned so it's always on screen */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-white/8 bg-ink-950/92 px-4 py-3 backdrop-blur safe-bottom">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-1.5 sm:flex-row sm:justify-between">
          <p className="order-2 text-center text-sm text-mist sm:order-1 sm:text-left">
            {isHost ? (
              missing > 0 ? (
                <>
                  {t('Need {n} more player to start.', { n: missing })}{' '}
                  <button className="font-semibold text-hay underline underline-offset-4" onClick={addBot}>
                    {t('Add a bot')}
                  </button>{' '}
                  {t('or share the link above.')}
                </>
              ) : (
                t('Everyone’s in? Deal whenever you’re ready.')
              )
            ) : (
              t('You’re seated. {name} will start the game.', { name: hostName })
            )}
          </p>
          {isHost ? (
            <button className="btn btn-primary order-1 w-full !py-3.5 !text-lg sm:order-2 sm:w-auto sm:!px-8" disabled={missing > 0} onClick={start}>
              <IconPlay size={16} /> {t('Deal the cards')}
            </button>
          ) : (
            <span className="order-1 flex items-center gap-2 font-semibold text-mint sm:order-2">
              <IconCheck size={16} /> {t('Ready')}
            </span>
          )}
        </div>
        {startError && <p className="mt-1 text-center text-sm text-bull">{startError}</p>}
      </div>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function StepGuide({ steps }: { steps: { label: string; done: boolean }[] }) {
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol className="mb-3 grid grid-cols-3 gap-1.5 sm:gap-2" aria-label="steps">
      {steps.map((st, i) => (
        <li
          key={i}
          className={clsx(
            'flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] font-semibold leading-tight sm:gap-2 sm:px-3 sm:py-2 sm:text-sm',
            st.done ? 'border-mint/30 bg-mint/10 text-mint' : i === current ? 'border-hay/50 bg-hay/10 text-hay' : 'border-white/8 text-fog',
          )}
          aria-current={i === current ? 'step' : undefined}
        >
          <span className={clsx('grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-extrabold', st.done ? 'bg-mint text-ink-950' : i === current ? 'bg-hay text-ink-950' : 'bg-white/10')}>
            {st.done ? <IconCheck size={11} strokeWidth={3} /> : i + 1}
          </span>
          <span className="min-w-0">{st.label}</span>
        </li>
      ))}
    </ol>
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
