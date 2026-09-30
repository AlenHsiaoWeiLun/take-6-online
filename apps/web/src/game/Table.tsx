import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { EMOTES, HAND_SIZE, MAX_ROW_LENGTH, rowPenalty, type Card, type PublicPlayer, type RoomSnapshot } from '@take6/shared';
import { Avatar } from '../components/Avatar';
import { CardBack, GameCard } from '../components/GameCard';
import { Bullhead, IconChat, IconCheck, IconLogOut, IconLowCard, IconMute, IconVolume } from '../art/icons';
import { useMuted } from '../components/Header';
import { useSession } from '../state/session';
import type { EmoteBubble } from '../state/room';
import { sound } from '../lib/sound';
import { useCountdown } from './useCountdown';
import { GameOver, HandSummary } from './GameOver';
import { artUrl } from '../art/Art';

const feltArt = artUrl('texture-felt');

interface Props {
  snapshot: RoomSnapshot;
  emotes: EmoteBubble[];
  clockOffset: MutableRefObject<number>;
}

export function Table({ snapshot, emotes, clockOffset }: Props) {
  const { socket, session } = useSession();
  const navigate = useNavigate();
  const { room, self } = snapshot;
  const me = room.players.find((p) => p.id === self.playerId) ?? null;
  const byId = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const secondsLeft = useCountdown(room.deadline, clockOffset);
  const theme = session.cardTheme;

  const choosing = room.phase === 'choosingRow' ? byId.get(room.choosingPlayerId ?? '') : undefined;
  const iMustChoose = !!choosing && choosing.id === self.playerId;
  const canPlay = room.phase === 'selecting' && !!me && self.selected === null;
  const current = room.resolvingIndex !== null ? room.played[room.resolvingIndex] : undefined;

  useTableSounds(snapshot, secondsLeft);

  const leave = () => {
    const live = room.phase !== 'gameEnd';
    if (live && me && !window.confirm('Leave this game? Bots will play your cards until you come back.')) return;
    navigate('/');
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* ---------------------------------------------------------- top bar */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/6 px-3 sm:px-4">
        <button className="btn btn-ghost btn-sm !px-2.5" onClick={leave} aria-label="Leave table">
          <IconLogOut size={17} className="rotate-180" />
        </button>
        <div className="leading-tight">
          <div className="font-display text-sm font-bold tracking-[0.18em]">{room.code}</div>
          <div className="text-[11px] text-fog tabular">
            Turn {Math.min(room.turn, HAND_SIZE)}/{HAND_SIZE}
            {room.settings.mode === 'classic' && ` · Hand ${room.handNumber}`}
          </div>
        </div>
        <TurnProgress turn={room.turn} />
        <div className="ml-auto flex items-center gap-2">
          {secondsLeft !== null && (room.phase === 'selecting' || room.phase === 'choosingRow') && (
            <TimerPill seconds={secondsLeft} total={room.phase === 'selecting' ? room.settings.turnSeconds : Math.min(room.settings.turnSeconds, 20)} urgent={canPlay || iMustChoose} />
          )}
          {me && <EmoteButton onEmote={(e) => socket?.emit('game:emote', e)} />}
          <MuteButton />
        </div>
      </div>

      {/* ---------------------------------------------------------- players */}
      <PlayersBar players={room.players} selfId={self.playerId} snapshot={snapshot} emotes={emotes} />

      <LayoutGroup>
        {/* ---------------------------------------------------------- tray + board */}
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center-safe gap-3 overflow-y-auto px-2 py-2 sm:px-4">
          <PlayedTray snapshot={snapshot} byId={byId} selfId={self.playerId} />

          <div className="felt relative rounded-[1.6rem] p-2.5 sm:p-4" style={feltArt ? ({ '--felt-art': `url(${feltArt})` } as CSSProperties) : undefined}>
            <div className="flex flex-col gap-[6px] sm:gap-2">
              {room.rows.map((row, r) => (
                <BoardRow
                  key={r}
                  index={r}
                  cards={row.cards}
                  theme={theme}
                  selectable={iMustChoose}
                  flash={room.lastEvent?.type === 'take' && room.lastEvent.row === r ? room.lastEvent.id : null}
                  highlight={
                    room.lastEvent?.type === 'place' && room.lastEvent.row === r && room.phase === 'resolving'
                  }
                  onChoose={() => socket?.emit('game:chooseRow', r)}
                />
              ))}
            </div>
          </div>

          <StatusLine snapshot={snapshot} byId={byId} choosing={choosing} iMustChoose={iMustChoose} current={current} />
        </div>

        {/* ---------------------------------------------------------- hand */}
        <div className="safe-bottom shrink-0 border-t border-white/6 bg-ink-950/60 px-2 pt-3 backdrop-blur">
          {me ? (
            <Hand
              hand={self.hand}
              selected={self.selected}
              canPlay={canPlay}
              theme={theme}
              onPlay={(v) => {
                sound.play('play');
                socket?.emit('game:play', v);
              }}
            />
          ) : (
            <div className="py-4 text-center text-sm text-fog">You’re watching this table. {room.spectatorCount > 1 && `${room.spectatorCount} spectators.`}</div>
          )}
        </div>
      </LayoutGroup>

      <HandSummary snapshot={snapshot} clockOffset={clockOffset} />
      <GameOver snapshot={snapshot} onLeave={() => navigate('/')} />
    </div>
  );
}

// ------------------------------------------------------------------ players

function PlayersBar({ players, selfId, snapshot, emotes }: { players: PublicPlayer[]; selfId: string | null; snapshot: RoomSnapshot; emotes: EmoteBubble[] }) {
  const { room } = snapshot;
  const resolvingId = room.resolvingIndex !== null ? room.played[room.resolvingIndex]?.playerId : null;
  const take = room.lastEvent?.type === 'take' ? room.lastEvent : null;
  const low = Math.min(...players.map((p) => p.score));

  return (
    <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-3 py-2.5 sm:justify-center sm:px-4">
      {players.map((p) => {
        const thinking = room.phase === 'selecting' && !p.hasPlayed;
        const active = p.id === resolvingId || p.id === room.choosingPlayerId;
        const bubble = emotes.find((e) => e.playerId === p.id);
        return (
          <div
            key={p.id}
            className={clsx(
              'relative flex shrink-0 items-center gap-2 rounded-2xl border py-1.5 pl-1.5 pr-3 transition-colors',
              active ? 'border-hay/60 bg-hay/10' : 'border-white/7 bg-white/[0.035]',
              p.id === selfId && !active && 'border-white/15',
            )}
          >
            <span className="relative">
              <Avatar id={p.avatar} size={34} ring={p.isPlus ? '#f5b942' : undefined} className={clsx(!p.connected && 'opacity-40 grayscale')} />
              {room.phase === 'selecting' && (
                <span
                  className={clsx(
                    'absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border-2 border-ink-950',
                    p.hasPlayed ? 'bg-mint text-ink-950' : 'bg-ink-700',
                  )}
                >
                  {p.hasPlayed ? <IconCheck size={9} strokeWidth={3.5} /> : <span className="size-1 animate-pulse rounded-full bg-fog" />}
                </span>
              )}
            </span>
            <span className="leading-tight">
              <span className={clsx('block max-w-[6.5rem] truncate text-[13px] font-semibold', thinking && 'text-mist')}>
                {p.id === selfId ? 'You' : p.name}
              </span>
              <span className={clsx('flex items-center gap-1 text-xs font-bold tabular', p.score === low && room.turn > 1 ? 'text-mint' : 'text-fog')}>
                <Bullhead size={11} className="text-bull" /> {p.score}
                {room.settings.mode === 'classic' && p.handScore > 0 && <span className="font-medium text-fog/70">(+{p.handScore})</span>}
              </span>
            </span>

            <AnimatePresence>
              {take && take.playerId === p.id && take.penalty > 0 && (
                <motion.span
                  key={take.id}
                  initial={{ opacity: 0, y: 6, scale: 0.7 }}
                  animate={{ opacity: 1, y: -14, scale: 1 }}
                  exit={{ opacity: 0, y: -26 }}
                  transition={{ duration: 0.45 }}
                  className="absolute -top-2 right-1 flex items-center gap-0.5 rounded-full bg-bull px-2 py-0.5 text-xs font-extrabold text-white shadow-lg"
                >
                  +{take.penalty} <Bullhead size={10} />
                </motion.span>
              )}
              {bubble && (
                <motion.span
                  key={bubble.key}
                  initial={{ opacity: 0, y: 8, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-xl bg-paper px-2.5 py-1 text-xs font-bold text-ink-950 shadow-xl"
                >
                  {EMOTES.find((e) => e.id === bubble.emote)?.label}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ tray

function PlayedTray({ snapshot, byId, selfId }: { snapshot: RoomSnapshot; byId: Map<string, PublicPlayer>; selfId: string | null }) {
  const { room } = snapshot;
  const onBoard = new Set(room.rows.flatMap((r) => r.cards.map((c) => c.value)));
  const w = 'calc(var(--card-w) * 0.86)';

  if (room.phase === 'selecting') {
    const played = room.players.filter((p) => p.hasPlayed);
    return (
      <div className="flex h-[calc(var(--card-w)*0.86*1.4+22px)] items-end justify-center">
        <div className="flex -space-x-[calc(var(--card-w)*0.55)]">
          <AnimatePresence>
            {played.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ y: 30, opacity: 0, rotate: 0 }}
                animate={{ y: 0, opacity: 1, rotate: (i - played.length / 2) * 4 }}
                exit={{ opacity: 0 }}
              >
                <CardBack width={w} theme={p.cardTheme} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const visible = room.played.filter((pc, i) => (room.resolvingIndex === null || i >= room.resolvingIndex) && !onBoard.has(pc.card.value));
  return (
    <div className="no-scrollbar flex h-[calc(var(--card-w)*0.86*1.4+22px)] max-w-full items-end gap-1.5 overflow-x-auto px-1 sm:gap-2">
      <AnimatePresence mode="popLayout">
        {visible.map((pc) => {
          const isCurrent = room.resolvingIndex !== null && room.played[room.resolvingIndex]?.card.value === pc.card.value;
          const owner = byId.get(pc.playerId);
          return (
            <motion.div
              key={pc.card.value}
              layoutId={`card-${pc.card.value}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1, y: isCurrent ? -6 : 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <GameCard card={pc.card} width={w} theme={owner?.cardTheme} className={clsx(isCurrent && 'ring-2 ring-hay')} />
              <span className="flex max-w-[calc(var(--card-w)*1.1)] items-center gap-1 truncate text-[10px] font-semibold text-mist">
                {owner && <Avatar id={owner.avatar} size={14} />}
                <span className="truncate">{pc.playerId === selfId ? 'You' : owner?.name}</span>
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ board

function BoardRow({
  index,
  cards,
  theme,
  selectable,
  flash,
  highlight,
  onChoose,
}: {
  index: number;
  cards: Card[];
  theme: string;
  selectable: boolean;
  flash: number | null;
  highlight: boolean;
  onChoose: () => void;
}) {
  const penalty = rowPenalty(cards);
  const full = cards.length >= MAX_ROW_LENGTH;
  return (
    <div className="relative flex items-center gap-1.5 sm:gap-2.5">
      <div
        className={clsx(
          'flex w-9 shrink-0 flex-col items-center justify-center rounded-xl py-1.5 sm:w-11',
          penalty >= 10 ? 'bg-bull/25 text-white' : 'bg-black/25 text-mist',
        )}
        title={`Row ${index + 1}: ${penalty} bullheads`}
      >
        <Bullhead size={14} className={penalty >= 10 ? 'text-bull' : 'text-fog'} />
        <span className="font-display text-sm font-bold tabular">{penalty}</span>
      </div>
      <div className="flex gap-[4px] sm:gap-1.5">
        {Array.from({ length: MAX_ROW_LENGTH + 1 }, (_, i) => {
          const card = cards[i];
          if (card)
            return (
              <motion.div key={card.value} layoutId={`card-${card.value}`} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                <GameCard card={card} theme={theme} />
              </motion.div>
            );
          return <div key={`slot-${i}`} className={clsx('slot', i === MAX_ROW_LENGTH && 'slot-danger', i === MAX_ROW_LENGTH && full && 'animate-pulse')} />;
        })}
      </div>

      <AnimatePresence>
        {flash !== null && (
          <motion.div
            key={flash}
            className="pointer-events-none absolute inset-[-4px] rounded-2xl border-2 border-bull bg-bull/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2 }}
          />
        )}
      </AnimatePresence>
      {highlight && <div className="pointer-events-none absolute inset-[-4px] rounded-2xl border border-hay/40" />}

      {selectable && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.01 }}
          onClick={onChoose}
          className="absolute inset-[-4px] z-10 flex items-center justify-end rounded-2xl border-2 border-dashed border-hay bg-hay/10 pr-3 animate-pulse-ring"
        >
          <span className="flex items-center gap-1 rounded-full bg-hay px-3 py-1 text-xs font-extrabold text-ink-950 shadow-lg sm:text-sm">
            Take · {penalty} <Bullhead size={12} />
          </span>
        </motion.button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ status

function StatusLine({
  snapshot,
  byId,
  choosing,
  iMustChoose,
  current,
}: {
  snapshot: RoomSnapshot;
  byId: Map<string, PublicPlayer>;
  choosing: PublicPlayer | undefined;
  iMustChoose: boolean;
  current: { playerId: string; card: Card } | undefined;
}) {
  const { room, self } = snapshot;
  const nameOf = (id: string) => (id === self.playerId ? 'You' : byId.get(id)?.name ?? 'Someone');
  let text: React.ReactNode = '';
  let tone: 'normal' | 'alert' | 'good' = 'normal';

  if (room.phase === 'selecting') {
    const waiting = room.players.filter((p) => !p.hasPlayed);
    if (self.playerId && self.selected === null) {
      text = 'Choose a card to play';
      tone = 'good';
    } else if (waiting.length) {
      text = `Waiting for ${waiting.length === 1 ? nameOf(waiting[0].id) : `${waiting.length} players`}…`;
    }
  } else if (room.phase === 'revealing') {
    text = 'Cards revealed — lowest goes first';
  } else if (room.phase === 'choosingRow' && choosing && current) {
    if (iMustChoose) {
      text = (
        <span className="flex items-center gap-1.5">
          <IconLowCard size={16} /> Your {current.card.value} is lower than every row — pick a row to take
        </span>
      );
      tone = 'alert';
    } else text = `${choosing.name}’s ${current.card.value} is too low — they’re picking a row to take`;
  } else if (room.phase === 'resolving' && room.lastEvent) {
    const e = room.lastEvent;
    if (e.type === 'place') text = `${nameOf(e.playerId)} ${e.playerId === self.playerId ? 'place' : 'places'} ${e.card.value} on row ${e.row + 1}`;
    if (e.type === 'take') {
      text = `${nameOf(e.playerId)} ${e.playerId === self.playerId ? 'take' : 'takes'} row ${e.row + 1} · +${e.penalty} bullheads`;
      tone = 'alert';
    }
  }

  return (
    <div className="h-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={typeof text === 'string' ? text : 'node'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={clsx(
            'rounded-full px-3.5 py-1.5 text-center text-[13px] font-semibold',
            tone === 'alert' && 'bg-bull/15 text-[#ff9ea1]',
            tone === 'good' && 'bg-hay/12 text-hay',
            tone === 'normal' && 'text-mist',
          )}
        >
          {text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ hand

function Hand({ hand, selected, canPlay, theme, onPlay }: { hand: Card[]; selected: number | null; canPlay: boolean; theme: string; onPlay: (v: number) => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    if (!canPlay) setPick(null);
  }, [canPlay]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const first = el.querySelector<HTMLElement>('[data-hand-card]');
      if (!first) return;
      const w = first.offsetWidth;
      const n = hand.length;
      const gap = 6;
      const needed = n * w + (n - 1) * gap;
      setOverlap(n > 1 && needed > el.clientWidth ? (needed - el.clientWidth) / (n - 1) + gap : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hand.length]);

  useEffect(() => {
    if (!canPlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && pick !== null) onPlay(pick);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canPlay, pick, onPlay]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex h-8 items-center justify-center">
        <AnimatePresence mode="wait">
          {canPlay && pick !== null ? (
            <motion.button
              key="play"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="btn btn-primary btn-sm !px-5"
              onClick={() => onPlay(pick)}
            >
              Play {pick}
            </motion.button>
          ) : selected !== null ? (
            <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="chip !text-mint">
              <IconCheck size={12} /> You played {selected}
            </motion.span>
          ) : canPlay ? (
            <motion.span key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-fog">
              Tap a card, then tap again to play
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <div ref={box} className="flex justify-center pb-1 pt-3" style={{ '--overlap': `${overlap}px` } as CSSProperties}>
        <AnimatePresence initial={false}>
          {hand.map((card, i) => {
            const isPick = pick === card.value;
            const isPlayed = selected === card.value;
            return (
              <motion.button
                key={card.value}
                data-hand-card
                layoutId={`card-${card.value}`}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: isPick || isPlayed ? -16 : 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                whileHover={canPlay ? { y: isPick ? -16 : -8 } : undefined}
                disabled={!canPlay}
                onClick={() => {
                  if (!canPlay) return;
                  if (isPick) onPlay(card.value);
                  else {
                    sound.play('tap');
                    setPick(card.value);
                  }
                }}
                className={clsx('relative shrink-0 rounded-[10px] focus-visible:outline-offset-4', i > 0 && 'ml-[calc(6px-var(--overlap))]')}
                style={{ zIndex: isPick ? 20 : i }}
                aria-label={`Card ${card.value}`}
              >
                <GameCard
                  card={card}
                  theme={theme}
                  width="var(--hand-w)"
                  className={clsx(
                    isPick && 'ring-[3px] ring-hay',
                    isPlayed && 'ring-[3px] ring-mint',
                    !canPlay && !isPlayed && 'brightness-[.72] saturate-[.8]',
                  )}
                />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ small bits

function TurnProgress({ turn }: { turn: number }) {
  return (
    <div className="ml-3 hidden items-center gap-1 sm:flex" aria-hidden="true">
      {Array.from({ length: HAND_SIZE }, (_, i) => (
        <span key={i} className={clsx('h-1.5 w-4 rounded-full', i < turn - 1 ? 'bg-white/40' : i === turn - 1 ? 'bg-hay' : 'bg-white/10')} />
      ))}
    </div>
  );
}

function TimerPill({ seconds, total, urgent }: { seconds: number; total: number; urgent: boolean }) {
  const pct = Math.max(0, Math.min(1, seconds / total));
  const low = seconds <= 5;
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <span className={clsx('chip !py-1 !pl-1 !pr-2.5 tabular', low && urgent && '!border-bull/50 !bg-bull/15 !text-white')}>
      <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90">
        <circle cx="11" cy="11" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2.5" />
        <circle
          cx="11"
          cy="11"
          r={r}
          fill="none"
          stroke={low ? '#e5484d' : '#f5b942'}
          strokeWidth="2.5"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .2s linear' }}
        />
      </svg>
      {Math.ceil(seconds)}s
    </span>
  );
}

function MuteButton() {
  const [muted, setMuted] = useMuted();
  return (
    <button className="btn btn-ghost btn-sm !px-2.5" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute' : 'Mute'}>
      {muted ? <IconMute size={17} /> : <IconVolume size={17} />}
    </button>
  );
}

function EmoteButton({ onEmote }: { onEmote: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="btn btn-ghost btn-sm !px-2.5" onClick={() => setOpen((o) => !o)} aria-label="Send a reaction" aria-expanded={open}>
        <IconChat size={17} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="panel absolute right-0 top-11 z-30 grid w-44 grid-cols-2 gap-1 bg-ink-850 p-1.5"
          >
            {EMOTES.map((e) => (
              <button
                key={e.id}
                className="rounded-lg px-2 py-2 text-left text-sm font-semibold hover:bg-white/8"
                onClick={() => {
                  onEmote(e.id);
                  sound.play('emote');
                  setOpen(false);
                }}
              >
                {e.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function useTableSounds(snapshot: RoomSnapshot, secondsLeft: number | null) {
  const { room, self } = snapshot;
  const lastEvent = useRef<number | null>(room.lastEvent?.id ?? null);
  const lastTurn = useRef(room.turn);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    const e = room.lastEvent;
    if (!e || e.id === lastEvent.current) return;
    lastEvent.current = e.id;
    if (e.type === 'reveal') sound.play('reveal');
    if (e.type === 'place') sound.play('place');
    if (e.type === 'take') sound.play('take');
  }, [room.lastEvent]);

  useEffect(() => {
    if (room.phase === 'selecting' && room.turn !== lastTurn.current) {
      lastTurn.current = room.turn;
      if (self.playerId) sound.play('turn');
    }
  }, [room.phase, room.turn, self.playerId]);

  useEffect(() => {
    if (secondsLeft === null || !self.playerId) return;
    const s = Math.ceil(secondsLeft);
    const mine = (room.phase === 'selecting' && self.selected === null) || (room.phase === 'choosingRow' && room.choosingPlayerId === self.playerId);
    if (mine && s <= 5 && s > 0 && s !== lastTick.current) {
      lastTick.current = s;
      sound.play('tick');
    }
  }, [secondsLeft, room.phase, self.selected, self.playerId, room.choosingPlayerId]);
}
