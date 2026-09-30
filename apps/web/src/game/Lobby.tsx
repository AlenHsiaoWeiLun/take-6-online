import { useState, type MutableRefObject } from 'react';
import clsx from 'clsx';
import { MAX_PLAYERS, MIN_PLAYERS, type RoomSettings, type RoomSnapshot } from '@take6/shared';
import { Avatar } from '../components/Avatar';
import { AdSlot } from '../components/AdSlot';
import { IconBot, IconCheck, IconClose, IconCopy, IconCrown, IconGlobe, IconLock, IconPlay, IconPlus, IconShare, IconSparkle } from '../art/icons';
import { useSession } from '../state/session';
import { useCountdown } from './useCountdown';
import { config } from '../lib/config';

export function Lobby({ snapshot, clockOffset }: { snapshot: RoomSnapshot; clockOffset: MutableRefObject<number> }) {
  const { socket } = useSession();
  const { room, self } = snapshot;
  const me = room.players.find((p) => p.id === self.playerId);
  const isHost = !!me?.isHost;
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const autoStart = useCountdown(room.deadline, clockOffset);

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
  const share = () => navigator.share?.({ title: 'Join my Take 6 table', text: `Room code ${room.code}`, url: link }).catch(() => {});
  const set = (patch: Partial<RoomSettings>) => socket?.emit('room:settings', patch);
  const start = () =>
    socket?.emit('game:start', (res) => setStartError(res.ok ? null : res.error));

  const seats = Array.from({ length: room.settings.maxPlayers }, (_, i) => room.players[i] ?? null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow flex items-center gap-2">
            {room.settings.isPublic ? <IconGlobe size={13} /> : <IconLock size={13} />}
            {room.settings.isPublic ? 'Public table' : 'Private table'}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-display text-5xl font-extrabold tracking-[0.12em]">{room.code}</h1>
            <button className="btn btn-ghost btn-sm" onClick={copy}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />} {copied ? 'Copied' : 'Copy link'}
            </button>
            {'share' in navigator && (
              <button className="btn btn-ghost btn-sm !px-2.5" onClick={share} aria-label="Share">
                <IconShare size={16} />
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-fog">Share the code or link — friends can join from any device.</p>
        </div>
        {autoStart !== null && (
          <div className="panel flex items-center gap-3 px-4 py-3">
            <span className="font-display text-2xl font-bold tabular text-hay">{Math.ceil(autoStart)}s</span>
            <span className="text-sm text-fog">until the deal — empty seats fill with bots</span>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold">Players</h2>
            <span className="text-sm text-fog tabular">
              {room.players.length}/{room.settings.maxPlayers}
              {room.spectatorCount > 0 && ` · ${room.spectatorCount} watching`}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {seats.map((p, i) =>
              p ? (
                <div key={p.id} className={clsx('panel relative flex flex-col items-center p-4 text-center', p.id === self.playerId && 'ring-1 ring-hay/50')}>
                  {isHost && !p.isHost && (
                    <button
                      onClick={() => socket?.emit('room:remove', p.id)}
                      className="absolute right-2 top-2 rounded-md p-1 text-fog/70 hover:bg-white/8 hover:text-white"
                      aria-label={`Remove ${p.name}`}
                    >
                      <IconClose size={14} />
                    </button>
                  )}
                  <Avatar id={p.avatar} size={64} ring={p.isPlus ? '#f5b942' : undefined} className={clsx(!p.connected && 'opacity-40')} />
                  <div className="mt-2 w-full truncate font-semibold">{p.name}</div>
                  <div className="mt-1 flex flex-wrap justify-center gap-1">
                    {p.isHost && <span className="chip !text-hay"><IconCrown size={11} /> Host</span>}
                    {p.isBot && <span className="chip"><IconBot size={11} /> Bot</span>}
                    {p.isPlus && <span className="chip !text-hay"><IconSparkle size={11} /> Plus</span>}
                    {p.id === self.playerId && <span className="chip">You</span>}
                    {!p.connected && !p.isBot && <span className="chip">Away</span>}
                  </div>
                </div>
              ) : (
                <div key={`empty-${i}`} className="grid min-h-[152px] place-items-center rounded-[1.25rem] border border-dashed border-white/10 p-4">
                  {isHost ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => socket?.emit('room:addBot')}>
                      <IconPlus size={15} /> Add bot
                    </button>
                  ) : (
                    <span className="text-sm text-fog/70">Open seat</span>
                  )}
                </div>
              ),
            )}
          </div>
          {!self.playerId && <p className="mt-4 text-sm text-fog">This table is full — you’re watching as a spectator.</p>}
        </section>

        <aside className="panel h-fit p-5">
          <h2 className="font-display text-xl font-bold">Table rules</h2>
          {!isHost && <p className="mt-1 text-sm text-fog">Only the host can change these.</p>}
          <div className="mt-5 space-y-5">
            <Setting label="Seats">
              <div className="seg flex-wrap">
                {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
                  <button key={n} aria-pressed={room.settings.maxPlayers === n} disabled={!isHost || n < room.players.length} onClick={() => set({ maxPlayers: n })}>
                    {n}
                  </button>
                ))}
              </div>
            </Setting>
            <Setting label="Game length">
              <div className="seg">
                <button aria-pressed={room.settings.mode === 'quick'} disabled={!isHost} onClick={() => set({ mode: 'quick' })}>Quick · 10 turns</button>
                <button aria-pressed={room.settings.mode === 'classic'} disabled={!isHost} onClick={() => set({ mode: 'classic' })}>Race to 66</button>
              </div>
            </Setting>
            <Setting label="Turn timer">
              <div className="seg">
                {[15, 30, 45, 60].map((s) => (
                  <button key={s} aria-pressed={room.settings.turnSeconds === s} disabled={!isHost} onClick={() => set({ turnSeconds: s })}>{s}s</button>
                ))}
              </div>
            </Setting>
            <Setting label="Bot skill">
              <div className="seg">
                {(['easy', 'normal', 'hard'] as const).map((l) => (
                  <button key={l} aria-pressed={room.settings.botLevel === l} disabled={!isHost} onClick={() => set({ botLevel: l })} className="capitalize">{l}</button>
                ))}
              </div>
            </Setting>
            <Setting label="Visibility">
              <div className="seg">
                <button aria-pressed={!room.settings.isPublic} disabled={!isHost} onClick={() => set({ isPublic: false })}>Private</button>
                <button aria-pressed={room.settings.isPublic} disabled={!isHost} onClick={() => set({ isPublic: true })}>Listed</button>
              </div>
            </Setting>
          </div>

          <div className="mt-6">
            {isHost ? (
              <button className="btn btn-primary btn-lg w-full" disabled={room.players.length < MIN_PLAYERS} onClick={start}>
                <IconPlay size={16} /> Deal the cards
              </button>
            ) : (
              <div className="rounded-xl bg-black/20 p-3 text-center text-sm text-fog">Waiting for the host to deal…</div>
            )}
            {isHost && room.players.length < MIN_PLAYERS && <p className="mt-2 text-center text-xs text-fog">Add a bot or invite a friend to start.</p>}
            {startError && <p className="mt-2 text-center text-sm text-bull">{startError}</p>}
          </div>
        </aside>
      </div>

      <AdSlot slot="banner" className="mt-8" />
    </div>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      {children}
    </div>
  );
}
