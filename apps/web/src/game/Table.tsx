import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import {
  EMOTES,
  HAND_SIZE,
  MAX_ROW_LENGTH,
  findTargetRow,
  rowPenalty,
  type Card,
  type PublicPlayer,
  type RoomSnapshot,
} from '@take6/shared';
import { Avatar } from '../components/Avatar';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CardBack, GameCard } from '../components/GameCard';
import { Bullhead, IconCheck, IconLogOut, IconLowCard, IconMusic, IconMusicOff, IconMute, IconSmile, IconVolume } from '../art/icons';
import { useMusic, useMuted } from '../components/Header';
import { useSession } from '../state/session';
import type { EmoteBubble } from '../state/room';
import { haptic, sound } from '../lib/sound';
import { useCountdown } from './useCountdown';
import { GameOver, HandSummary } from './GameOver';
import { artUrl } from '../art/Art';
import { useT } from '../i18n';
import { anchors, fx } from '../fx/fx';
import { colorFor } from './colors';

const feltArt = artUrl('texture-felt');

interface Props {
  snapshot: RoomSnapshot;
  emotes: EmoteBubble[];
  clockOffset: MutableRefObject<number>;
  ratings: Record<string, { rating: number; delta: number }>;
}

export function Table({ snapshot, emotes, clockOffset, ratings }: Props) {
  const { socket, session } = useSession();
  const navigate = useNavigate();
  const t = useT();
  const { room, self } = snapshot;
  const me = room.players.find((p) => p.id === self.playerId) ?? null;
  const byId = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const colorOf = useMemo(() => new Map(room.players.map((p, i) => [p.id, colorFor(i)])), [room.players]);
  const secondsLeft = useCountdown(room.deadline, clockOffset);
  const theme = session.cardTheme;

  const choosing = room.phase === 'choosingRow' ? byId.get(room.choosingPlayerId ?? '') : undefined;
  const iMustChoose = !!choosing && choosing.id === self.playerId;
  const canPlay = room.phase === 'selecting' && !!me && self.selected === null;
  const current = room.resolvingIndex !== null ? room.played[room.resolvingIndex] : undefined;
  const danger = room.lastEvent?.type === 'danger' && room.phase === 'resolving' ? room.lastEvent : null;
  const landed = room.lastEvent?.type === 'place' ? room.lastEvent : null;
  const dealing = room.lastEvent?.type === 'deal' && room.turn === 1 && self.hand.length === HAND_SIZE;

  useTableFeedback(snapshot, secondsLeft, theme, colorOf, emotes);

  const leave = () => {
    const live = room.phase !== 'gameEnd';
    if (live && me && !window.confirm(t('Leave this game? Bots will play your cards until you come back.'))) return;
    navigate('/');
  };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <div className="blobs" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div id="shake-root" className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* ---------------------------------------------------------- top bar */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/6 bg-ink-950/40 px-3 backdrop-blur sm:px-4">
          <button className="btn btn-ghost btn-sm !px-2.5" onClick={leave} aria-label={t('Leave table')}>
            <IconLogOut size={17} className="rotate-180" />
          </button>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold tracking-[0.18em]">{room.code}</div>
            <div className="text-[11px] text-fog tabular">
              {t('Turn {n}/{total}', { n: Math.min(room.turn, HAND_SIZE), total: HAND_SIZE })}
              {room.settings.mode === 'classic' && ` · ${t('Hand {n}', { n: room.handNumber })}`}
            </div>
          </div>
          <TurnProgress turn={room.turn} />
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {secondsLeft !== null && (room.phase === 'selecting' || room.phase === 'choosingRow') && (
              <TimerPill
                seconds={secondsLeft}
                total={room.phase === 'selecting' ? room.settings.turnSeconds : Math.min(room.settings.turnSeconds, 20)}
                urgent={canPlay || iMustChoose}
              />
            )}
            {me && <ReactionButton onReact={(e) => socket?.emit('game:emote', e)} />}
            <MusicButton />
            <MuteButton />
          </div>
        </div>

        <PlayersBar snapshot={snapshot} emotes={emotes} colorOf={colorOf} />

        <LayoutGroup>
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center-safe gap-3 overflow-y-auto px-2 py-2 sm:px-4">
            <PlayedTray snapshot={snapshot} byId={byId} colorOf={colorOf} />

            <div
              className="felt relative rounded-[1.6rem] p-2.5 sm:p-4"
              style={feltArt ? ({ '--felt-art': `url(${feltArt})` } as CSSProperties) : undefined}
            >
              <div className="flex flex-col gap-[6px] sm:gap-2">
                {room.rows.map((row, r) => (
                  <BoardRow
                    key={r}
                    index={r}
                    cards={row.cards}
                    theme={theme}
                    selectable={iMustChoose}
                    danger={danger?.row === r}
                    landedValue={landed?.row === r ? landed.card.value : null}
                    flash={room.lastEvent?.type === 'take' && room.lastEvent.row === r ? room.lastEvent.id : null}
                    target={
                      room.phase === 'resolving' && !!current && !danger && findTargetRow(current.card, room.rows) === r && landed?.card.value !== current.card.value
                    }
                    onChoose={() => {
                      haptic(20);
                      socket?.emit('game:chooseRow', r);
                    }}
                  />
                ))}
              </div>
            </div>

            <StatusLine snapshot={snapshot} byId={byId} choosing={choosing} iMustChoose={iMustChoose} current={current} />
          </div>

          <div className="safe-bottom relative shrink-0 border-t border-white/6 bg-ink-950/55 px-2 pt-2 backdrop-blur">
            {me ? (
              <Hand
                hand={self.hand}
                selected={self.selected}
                canPlay={canPlay}
                theme={theme}
                dealing={dealing}
                onPlay={(v) => {
                  sound.play('play');
                  haptic(30);
                  socket?.emit('game:play', v);
                }}
              />
            ) : (
              <div className="py-4 text-center text-sm text-fog">
                {t('You’re watching this table.')} {room.spectatorCount > 1 && t('{n} spectators.', { n: room.spectatorCount })}
              </div>
            )}
          </div>
        </LayoutGroup>
      </div>

      <HandSummary snapshot={snapshot} clockOffset={clockOffset} />
      <GameOver snapshot={snapshot} ratings={ratings} onLeave={() => navigate('/')} />
    </div>
  );
}

// ------------------------------------------------------------------ feedback (sound, haptics, fx)

function useTableFeedback(
  snapshot: RoomSnapshot,
  secondsLeft: number | null,
  theme: string,
  colorOf: Map<string, string>,
  emotes: EmoteBubble[],
) {
  const { room, self } = snapshot;
  const lastEvent = useRef<number | null>(room.lastEvent?.id ?? null);
  const lastTurn = useRef(room.turn);
  const lastTick = useRef<number | null>(null);
  const seenEmotes = useRef(new Set<number>());

  // Layout effect: row rects from the previous frame are still valid here.
  useLayoutEffect(() => {
    const e = room.lastEvent;
    if (!e || e.id === lastEvent.current) return;
    lastEvent.current = e.id;
    const mine = 'playerId' in e && e.playerId === self.playerId;

    if (e.type === 'deal') {
      for (let i = 0; i < HAND_SIZE; i++) setTimeout(() => sound.play('deal', i), i * 45);
    }
    if (e.type === 'reveal') {
      room.played.forEach((_, i) => setTimeout(() => sound.play('flip', i), 120 + i * 90));
    }
    if (e.type === 'place') {
      const slot = room.rows[e.row]?.cards.length ?? 1;
      setTimeout(() => {
        sound.play('place', slot);
        const landedRect = anchors.rows.cur.get(e.row)?.at(-1)?.rect;
        if (landedRect) fx.particles(landedRect, { colors: ['#fff7ea', colorOf.get(e.playerId) ?? '#f5b942'], count: 8, spread: 36 });
      }, 260);
    }
    if (e.type === 'danger') {
      sound.play('danger');
      if (mine) haptic([15, 40, 15]);
    }
    if (e.type === 'take') {
      const chip = anchors.players.get(e.playerId)?.getBoundingClientRect();
      const taken = (anchors.rows.prev.get(e.row) ?? []).filter((c) => c.card.value !== e.card.value);
      if (chip && taken.length) fx.flyCards(taken, chip, theme, colorOf.get(e.playerId) ?? '#e5484d');
      const big = e.penalty >= 7;
      setTimeout(() => {
        sound.play('take', e.penalty);
        if (big) sound.play('moo', e.penalty >= 12 ? 0.8 : 1);
        if (chip && e.penalty > 0) {
          fx.burst(chip, `+${e.penalty}`, '#e5484d', big);
          fx.particles(chip, { colors: ['#e5484d', '#ff8a8a', '#fff7ea'], count: big ? 14 : 8, spread: big ? 110 : 70, shape: 'bull' });
        }
        if (big) fx.shake(e.penalty >= 12 ? 'hard' : 'soft');
        if (mine) haptic(big ? [60, 40, 90] : 45);
      }, 480);
    }
  }, [room.lastEvent, room.played, room.rows, self.playerId, theme, colorOf]);

  useEffect(() => {
    if (room.phase === 'selecting' && room.turn !== lastTurn.current) {
      lastTurn.current = room.turn;
      if (self.playerId && room.turn > 1) sound.play('turn');
    }
  }, [room.phase, room.turn, self.playerId]);

  useEffect(() => {
    if (secondsLeft === null || !self.playerId) return;
    const s = Math.ceil(secondsLeft);
    const waitingOnMe =
      (room.phase === 'selecting' && self.selected === null) || (room.phase === 'choosingRow' && room.choosingPlayerId === self.playerId);
    if (waitingOnMe && s <= 5 && s > 0 && s !== lastTick.current) {
      lastTick.current = s;
      sound.play('tick', s);
      if (s <= 3) haptic(10);
    }
  }, [secondsLeft, room.phase, self.selected, self.playerId, room.choosingPlayerId]);

  // Emoji reactions float up from the sender's chip; phrases show as speech bubbles.
  useEffect(() => {
    for (const bubble of emotes) {
      if (seenEmotes.current.has(bubble.key)) continue;
      seenEmotes.current.add(bubble.key);
      const def = EMOTES.find((x) => x.id === bubble.emote);
      const chip = anchors.players.get(bubble.playerId)?.getBoundingClientRect();
      if (def?.emoji && chip) fx.emoji(chip, def.emoji, artUrl(`sticker-${def.id}`));
      sound.play('pop');
    }
  }, [emotes]);
}

// ------------------------------------------------------------------ players

function PlayersBar({ snapshot, emotes, colorOf }: { snapshot: RoomSnapshot; emotes: EmoteBubble[]; colorOf: Map<string, string> }) {
  const { room, self } = snapshot;
  const t = useT();
  const resolvingId = room.resolvingIndex !== null ? room.played[room.resolvingIndex]?.playerId : null;
  const low = Math.min(...room.players.map((p) => p.score));

  return (
    <div className="no-scrollbar relative flex shrink-0 gap-2 overflow-x-auto px-3 py-2.5 sm:justify-center sm:px-4">
      {room.players.map((p) => {
        const color = colorOf.get(p.id)!;
        const thinking = room.phase === 'selecting' && !p.hasPlayed;
        const active = p.id === resolvingId || p.id === room.choosingPlayerId;
        const bubble = emotes.find((e) => e.playerId === p.id);
        const phrase = bubble && !EMOTES.find((e) => e.id === bubble.emote)?.emoji ? EMOTES.find((e) => e.id === bubble.emote) : null;
        const leading = p.score === low && room.turn > 1;
        return (
          <motion.div
            key={p.id}
            ref={(el) => {
              if (el) anchors.players.set(p.id, el);
              else anchors.players.delete(p.id);
            }}
            layout
            animate={active ? { y: -3, scale: 1.04 } : { y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            className={clsx(
              'relative flex shrink-0 items-center gap-2 rounded-2xl border py-1.5 pl-1.5 pr-3',
              active ? 'bg-white/10' : 'bg-white/[0.04]',
            )}
            style={{
              borderColor: active ? color : 'rgb(255 255 255 / .08)',
              boxShadow: active ? `0 0 0 1px ${color}, 0 8px 24px -8px ${color}` : undefined,
            }}
          >
            <span className="relative">
              <span className="block rounded-full p-[2px]" style={{ background: color }}>
                <Avatar id={p.avatar} size={32} className={clsx(!p.connected && 'opacity-40 grayscale')} />
              </span>
              {room.phase === 'selecting' && (
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={p.hasPlayed ? 'done' : 'wait'}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 700, damping: 18 }}
                    className={clsx(
                      'absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border-2 border-ink-950',
                      p.hasPlayed ? 'bg-mint text-ink-950' : 'bg-ink-700',
                    )}
                  >
                    {p.hasPlayed ? <IconCheck size={9} strokeWidth={3.5} /> : <span className="size-1 animate-pulse rounded-full bg-fog" />}
                  </motion.span>
                </AnimatePresence>
              )}
              {leading && <span className="absolute -left-1.5 -top-2 text-sm" title={t('Leader')}>👑</span>}
            </span>
            <span className="leading-tight">
              <span className={clsx('block max-w-[6.5rem] truncate text-[13px] font-semibold', thinking && 'text-mist')}>
                {p.id === self.playerId ? t('You') : p.name}
              </span>
              <span className={clsx('flex items-center gap-1 text-xs font-bold tabular', leading ? 'text-mint' : 'text-fog')}>
                <Bullhead size={11} className="text-bull" /> <AnimatedNumber value={p.score} />
                {room.settings.mode === 'classic' && p.handScore > 0 && <span className="font-medium text-fog/70">(+{p.handScore})</span>}
              </span>
            </span>

            <AnimatePresence>
              {phrase && bubble && (
                <motion.span
                  key={bubble.key}
                  initial={{ opacity: 0, y: 8, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                  className="absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-extrabold text-ink-950 shadow-xl"
                  style={{ background: color }}
                >
                  {t(phrase.label)}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ tray

function PlayedTray({ snapshot, byId, colorOf }: { snapshot: RoomSnapshot; byId: Map<string, PublicPlayer>; colorOf: Map<string, string> }) {
  const { room, self } = snapshot;
  const t = useT();
  const onBoard = new Set(room.rows.flatMap((r) => r.cards.map((c) => c.value)));
  const w = 'calc(var(--card-w) * 0.86)';
  const height = 'h-[calc(var(--card-w)*0.86*1.4+24px)]';

  if (room.phase === 'selecting') {
    const played = room.players.filter((p) => p.hasPlayed);
    return (
      <div className={clsx('flex items-end justify-center', height)}>
        <div className="flex -space-x-[calc(var(--card-w)*0.55)]">
          <AnimatePresence>
            {played.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ y: 60, opacity: 0, rotate: -20, scale: 0.6 }}
                animate={{ y: 0, opacity: 1, rotate: (i - played.length / 2) * 5, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 520, damping: 22 }}
              >
                <CardBack width={w} theme={p.cardTheme} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const revealing = room.phase === 'revealing';
  const visible = room.played.filter((pc, i) => (room.resolvingIndex === null || i >= room.resolvingIndex) && !onBoard.has(pc.card.value));
  return (
    <div className={clsx('no-scrollbar flex max-w-full items-end gap-1.5 overflow-x-auto px-1 sm:gap-2', height)} style={{ perspective: 800 }}>
      <AnimatePresence mode="popLayout">
        {visible.map((pc) => {
          const order = room.played.findIndex((x) => x.card.value === pc.card.value);
          const isCurrent = room.resolvingIndex !== null && room.played[room.resolvingIndex]?.card.value === pc.card.value;
          const owner = byId.get(pc.playerId);
          const color = colorOf.get(pc.playerId) ?? '#fff';
          return (
            <motion.div
              key={pc.card.value}
              layoutId={`card-${pc.card.value}`}
              exit={{ opacity: 0, scale: 0.8 }}
              animate={{ y: isCurrent ? -8 : 0, scale: isCurrent ? 1.08 : 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <motion.div
                className="flip"
                initial={revealing ? { rotateY: 180 } : false}
                animate={{ rotateY: 0 }}
                transition={{ delay: revealing ? 0.1 + order * 0.09 : 0, duration: 0.45, ease: [0.3, 1.4, 0.5, 1] }}
              >
                <div className="face">
                  <GameCard
                    card={pc.card}
                    width={w}
                    theme={owner?.cardTheme}
                    style={isCurrent ? { boxShadow: `0 0 0 3px ${color}, 0 10px 24px -6px ${color}` } : undefined}
                  />
                </div>
                <div className="back">
                  <CardBack width={w} theme={owner?.cardTheme} />
                </div>
              </motion.div>
              <span className="flex max-w-[calc(var(--card-w)*1.1)] items-center gap-1 truncate text-[10px] font-bold" style={{ color }}>
                {owner && <Avatar id={owner.avatar} size={14} />}
                <span className="truncate">{pc.playerId === self.playerId ? t('You') : owner?.name}</span>
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
  danger,
  target,
  landedValue,
  flash,
  onChoose,
}: {
  index: number;
  cards: Card[];
  theme: string;
  selectable: boolean;
  danger: boolean;
  target: boolean;
  landedValue: number | null;
  flash: number | null;
  onChoose: () => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const penalty = rowPenalty(cards);
  const full = cards.length >= MAX_ROW_LENGTH;

  // Record card positions every frame so a take can fly the old cards from where they were.
  useLayoutEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>('[data-card]') ?? [];
    anchors.rows.prev.set(index, anchors.rows.cur.get(index) ?? []);
    anchors.rows.cur.set(
      index,
      [...els].map((el) => ({ card: cards.find((c) => c.value === Number(el.dataset.card))!, rect: el.getBoundingClientRect() })).filter((x) => x.card),
    );
  });

  return (
    <div className={clsx('relative flex items-center gap-1.5 sm:gap-2.5', danger && 'row-danger')}>
      <motion.div
        key={penalty}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        className={clsx(
          'flex w-9 shrink-0 flex-col items-center justify-center rounded-xl py-1.5 sm:w-11',
          danger ? 'bg-bull text-white' : penalty >= 10 ? 'bg-bull/25 text-white' : 'bg-black/25 text-mist',
        )}
        title={t('Row {n}: {p} bullheads', { n: index + 1, p: penalty })}
      >
        <Bullhead size={14} className={danger ? 'text-white' : penalty >= 10 ? 'text-bull' : 'text-fog'} />
        <span className="font-display text-sm font-bold tabular">{penalty}</span>
      </motion.div>
      <div ref={ref} className="flex gap-[4px] sm:gap-1.5">
        {Array.from({ length: MAX_ROW_LENGTH + 1 }, (_, i) => {
          const card = cards[i];
          if (card) {
            const justLanded = card.value === landedValue;
            return (
              <motion.div
                key={card.value}
                data-card={card.value}
                layoutId={`card-${card.value}`}
                animate={justLanded ? { scale: [1, 1.14, 0.94, 1], rotate: [0, -3, 2, 0] } : { scale: 1, rotate: 0 }}
                transition={{
                  layout: { type: 'spring', stiffness: 420, damping: 30 },
                  default: { duration: 0.45, delay: justLanded ? 0.22 : 0 },
                }}
              >
                <GameCard card={card} theme={theme} />
              </motion.div>
            );
          }
          const isSixth = i === MAX_ROW_LENGTH;
          return (
            <div
              key={`slot-${i}`}
              className={clsx(
                'slot transition-colors',
                isSixth && 'slot-danger',
                isSixth && full && 'animate-pulse',
                isSixth && danger && '!border-bull !bg-bull/30',
                target && i === cards.length && '!border-hay !border-solid bg-hay/10',
              )}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {flash !== null && (
          <motion.div
            key={flash}
            className="pointer-events-none absolute inset-[-4px] rounded-2xl border-2 border-bull bg-bull/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.1 }}
          />
        )}
      </AnimatePresence>
      {danger && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 700, damping: 14 }}
          className="pointer-events-none absolute -right-2 -top-3 z-10 rounded-full bg-bull px-2 py-0.5 font-display text-xs font-extrabold text-white shadow-lg"
        >
          {t('6th card!')}
        </motion.span>
      )}

      {selectable && (
        <motion.button
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.97 }}
          onClick={onChoose}
          className="absolute inset-[-4px] z-10 flex items-center justify-end rounded-2xl border-2 border-dashed border-hay bg-hay/10 pr-3 animate-pulse-ring"
        >
          <span className="flex items-center gap-1 rounded-full bg-hay px-3 py-1 text-xs font-extrabold text-ink-950 shadow-lg sm:text-sm">
            {t('Take')} · {penalty} <Bullhead size={12} />
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
  const t = useT();
  const mine = (id: string) => id === self.playerId;
  const nameOf = (id: string) => byId.get(id)?.name ?? t('Someone');
  let text: React.ReactNode = '';
  let tone: 'normal' | 'alert' | 'good' = 'normal';

  if (room.phase === 'selecting') {
    const waiting = room.players.filter((p) => !p.hasPlayed);
    if (self.playerId && self.selected === null) {
      text = t('Choose a card to play');
      tone = 'good';
    } else if (waiting.length) {
      text = waiting.length === 1 ? t('Waiting for {name}…', { name: nameOf(waiting[0].id) }) : t('Waiting for {n} players…', { n: waiting.length });
    }
  } else if (room.phase === 'revealing') {
    text = t('Cards revealed — lowest goes first');
  } else if (room.phase === 'choosingRow' && choosing && current) {
    if (iMustChoose) {
      text = (
        <span className="flex items-center gap-1.5">
          <IconLowCard size={16} /> {t('Your {v} is lower than every row — pick a row to take', { v: current.card.value })}
        </span>
      );
      tone = 'alert';
    } else text = t('{name}’s {v} is too low — they’re picking a row to take', { name: choosing.name, v: current.card.value });
  } else if (room.phase === 'resolving' && room.lastEvent) {
    const e = room.lastEvent;
    if (e.type === 'place')
      text = mine(e.playerId)
        ? t('You place {v} on row {r}', { v: e.card.value, r: e.row + 1 })
        : t('{name} places {v} on row {r}', { name: nameOf(e.playerId), v: e.card.value, r: e.row + 1 });
    if (e.type === 'danger') {
      text = mine(e.playerId) ? t('Wait. Your {v} is the sixth card.', { v: e.card.value }) : t('Wait. {name}’s {v} is the sixth card.', { name: nameOf(e.playerId), v: e.card.value });
      tone = 'alert';
    }
    if (e.type === 'take') {
      text = mine(e.playerId)
        ? t('You swallow row {r} · +{p} bullheads', { r: e.row + 1, p: e.penalty })
        : t('{name} swallows row {r} · +{p} bullheads', { name: nameOf(e.playerId), r: e.row + 1, p: e.penalty });
      tone = 'alert';
    }
  }

  return (
    <div className="h-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={typeof text === 'string' ? text : 'node'}
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
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

function Hand({
  hand,
  selected,
  canPlay,
  theme,
  dealing,
  onPlay,
}: {
  hand: Card[];
  selected: number | null;
  canPlay: boolean;
  theme: string;
  dealing: boolean;
  onPlay: (v: number) => void;
}) {
  const t = useT();
  const [pick, setPick] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
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
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const i = pick === null ? -1 : hand.findIndex((c) => c.value === pick);
        const next = hand[Math.max(0, Math.min(hand.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))];
        if (next) {
          setPick(next.value);
          sound.play('select', next.value / 10);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canPlay, pick, onPlay, hand]);

  const mid = (hand.length - 1) / 2;
  const spread = Math.min(3.2, 26 / Math.max(1, hand.length));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex h-8 items-center justify-center">
        <AnimatePresence mode="wait">
          {canPlay && pick !== null ? (
            <motion.button
              key="play"
              initial={{ opacity: 0, y: 8, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 600, damping: 22 }}
              className="btn btn-primary btn-sm !px-5"
              onClick={() => onPlay(pick)}
            >
              {t('Play {v}', { v: pick })}
            </motion.button>
          ) : selected !== null ? (
            <motion.span key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="chip !text-mint">
              <IconCheck size={12} /> {t('You played {v}', { v: selected })}
            </motion.span>
          ) : canPlay ? (
            <motion.span key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-fog">
              {t('Tap a card, then tap again — or flick it up')}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <div ref={box} className="flex justify-center pb-6 pt-3" style={{ '--overlap': `${overlap}px` } as CSSProperties}>
        <AnimatePresence initial={false}>
          {hand.map((card, i) => {
            const isPick = pick === card.value;
            const isPlayed = selected === card.value;
            const lift = isPick || isPlayed ? -22 : 0;
            const arc = Math.min(18, (i - mid) ** 2 * 0.8);
            return (
              <motion.button
                key={card.value}
                data-hand-card
                layoutId={`card-${card.value}`}
                initial={dealing ? { y: -320, x: (mid - i) * 30, rotate: (mid - i) * 12, opacity: 0, scale: 0.5 } : { y: 40, opacity: 0 }}
                animate={{ y: arc + lift, x: 0, rotate: isPick || isPlayed ? 0 : (i - mid) * spread, opacity: 1, scale: isPick ? 1.06 : 1 }}
                exit={{ y: -40, opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: dealing ? i * 0.045 : 0 }}
                whileHover={canPlay && !isPick ? { y: arc - 10, rotate: 0 } : undefined}
                drag={canPlay ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.7, bottom: 0.1 }}
                dragSnapToOrigin
                onDragStart={() => {
                  dragged.current = true;
                }}
                onDragEnd={(_, info) => {
                  if (canPlay && (info.offset.y < -70 || info.velocity.y < -600)) onPlay(card.value);
                  setTimeout(() => (dragged.current = false), 0);
                }}
                disabled={!canPlay}
                onClick={() => {
                  if (!canPlay || dragged.current) return;
                  if (isPick) onPlay(card.value);
                  else {
                    sound.play('select', card.value / 10);
                    haptic(8);
                    setPick(card.value);
                  }
                }}
                className={clsx('relative shrink-0 touch-none rounded-[10px] focus-visible:outline-offset-4', i > 0 && 'ml-[calc(6px-var(--overlap))]')}
                style={{ zIndex: isPick ? 20 : i, transformOrigin: '50% 120%' }}
                aria-label={t('Card {v}', { v: card.value })}
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
                  style={isPick ? { boxShadow: '0 0 0 3px #f5b942, 0 14px 30px -6px rgb(245 185 66 / .7)' } : undefined}
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
        <motion.span
          key={i}
          animate={{ width: i === turn - 1 ? 22 : 14 }}
          className={clsx('h-1.5 rounded-full', i < turn - 1 ? 'bg-white/40' : i === turn - 1 ? 'bg-hay' : 'bg-white/10')}
        />
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
    <motion.span
      animate={low && urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={low && urgent ? { repeat: Infinity, duration: 0.5 } : undefined}
      className={clsx('chip !py-1 !pl-1 !pr-2.5 tabular', low && urgent && '!border-bull/50 !bg-bull/20 !text-white')}
    >
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
    </motion.span>
  );
}

function MuteButton() {
  const [muted, setMuted] = useMuted();
  const t = useT();
  return (
    <button className="btn btn-ghost btn-sm !px-2.5" onClick={() => setMuted(!muted)} aria-label={muted ? t('Unmute') : t('Mute')}>
      {muted ? <IconMute size={17} /> : <IconVolume size={17} />}
    </button>
  );
}

function MusicButton() {
  const [music, setMusic] = useMusic();
  const t = useT();
  return (
    <button className="btn btn-ghost btn-sm !px-2.5" onClick={() => setMusic(!music)} aria-label={music ? t('Music off') : t('Music on')}>
      {music ? <IconMusic size={17} /> : <IconMusicOff size={17} />}
    </button>
  );
}

function ReactionButton({ onReact }: { onReact: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button className="btn btn-ghost btn-sm !px-2.5" onClick={() => setOpen((o) => !o)} aria-label={t('Send a reaction')} aria-expanded={open}>
        <IconSmile size={17} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            className="panel absolute right-0 top-11 z-30 w-60 origin-top-right bg-ink-850 p-2"
          >
            <div className="grid grid-cols-4 gap-1">
              {EMOTES.filter((e) => e.emoji).map((e) => (
                <motion.button
                  key={e.id}
                  whileHover={{ scale: 1.2, rotate: -6 }}
                  whileTap={{ scale: 0.85 }}
                  className="grid h-12 place-items-center rounded-xl text-2xl hover:bg-white/8"
                  onClick={() => onReact(e.id)}
                  aria-label={t(e.label)}
                >
                  {artUrl(`sticker-${e.id}`) ? <img src={artUrl(`sticker-${e.id}`)!} alt="" className="size-10 object-contain" draggable={false} /> : e.emoji}
                </motion.button>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1 border-t border-white/6 pt-1.5">
              {EMOTES.filter((e) => !e.emoji).map((e) => (
                <button
                  key={e.id}
                  className="rounded-lg px-2 py-2 text-left text-sm font-semibold hover:bg-white/8"
                  onClick={() => {
                    onReact(e.id);
                    setOpen(false);
                  }}
                >
                  {t(e.label)}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
