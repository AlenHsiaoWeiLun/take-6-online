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

/** Choreography of a take: the sixth card slams in, then the old row is swept to the taker. */
const SLAM_MS = 380;
const SWEEP_MS = 420;
/** When the swept penalty lands on the taker's score. */
const SCORE_LANDS_S = (SLAM_MS + 150 + 800) / 1000;

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
  const wide = useIsWide();

  const choosing = room.phase === 'choosingRow' ? byId.get(room.choosingPlayerId ?? '') : undefined;
  const iMustChoose = !!choosing && choosing.id === self.playerId;
  const canPlay = room.phase === 'selecting' && !!me && self.selected === null;
  const current = room.resolvingIndex !== null ? room.played[room.resolvingIndex] : undefined;
  const danger = room.lastEvent?.type === 'danger' && room.phase === 'resolving' ? room.lastEvent : null;
  const landed = room.lastEvent?.type === 'place' ? room.lastEvent : null;
  const take = room.lastEvent?.type === 'take' ? room.lastEvent : null;
  // My card leaves the hand the moment I play it and waits face-up in the staging lane.
  const myPending = room.phase === 'selecting' && self.selected !== null ? self.hand.find((c) => c.value === self.selected) ?? null : null;
  const dealing = room.lastEvent?.type === 'deal' && room.turn === 1 && self.hand.length === HAND_SIZE;

  useTableFeedback(snapshot, secondsLeft, emotes);

  const leave = () => {
    const live = room.phase !== 'gameEnd';
    if (live && me && !window.confirm(t('Leave this game? Bots will play your cards until you come back.'))) return;
    navigate('/');
  };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      {/* In a game the table is the star: the backdrop stays quiet and only flares when a row gets swallowed. */}
      <div className="blobs blobs-calm" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <AnimatePresence>
        {take && take.penalty > 0 && (
          <motion.div
            key={take.id}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 bg-bull"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, take.penalty >= 7 ? 0.22 : 0.12, 0] }}
            transition={{ duration: 0.8, delay: 0.38, times: [0, 0.2, 1] }}
          />
        )}
      </AnimatePresence>

      <div id="shake-root" className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* ---------------------------------------------------------- top bar */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/6 bg-ink-950/40 px-3 backdrop-blur sm:px-4 lg:h-16">
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
          {wide ? (
            <div className="min-w-0 flex-1">
              <PlayersBar snapshot={snapshot} emotes={emotes} colorOf={colorOf} />
            </div>
          ) : (
            <TurnProgress turn={room.turn} />
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
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

        {!wide && <PlayersBar snapshot={snapshot} emotes={emotes} colorOf={colorOf} />}

        <LayoutGroup>
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center-safe gap-2 overflow-y-auto px-2 py-1.5 sm:px-4">
            <div
              className="felt relative rounded-[1.8rem] px-2.5 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-3"
              style={feltArt ? ({ '--felt-art': `url(${feltArt})` } as CSSProperties) : undefined}
            >
              <PlayedTray snapshot={snapshot} byId={byId} colorOf={colorOf} myPending={myPending} hidden={danger ? danger.card.value : null} />
              <div className="flex flex-col gap-[calc(var(--card-w)*0.09)]">
                {room.rows.map((row, r) => (
                  <BoardRow
                    key={r}
                    index={r}
                    cards={row.cards}
                    theme={theme}
                    selectable={iMustChoose}
                    danger={danger?.row === r ? danger.card : null}
                    dim={!!danger && danger.row !== r}
                    landedValue={landed?.row === r ? landed.card.value : null}
                    take={take?.row === r ? take : null}
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

/** Only one PlayersBar may exist at a time: its chips are the anchors effects fly to. */
function useIsWide() {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

// ------------------------------------------------------------------ feedback (sound, haptics, fx)

function useTableFeedback(snapshot: RoomSnapshot, secondsLeft: number | null, emotes: EmoteBubble[]) {
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
      setTimeout(() => sound.play('place', slot), 240);
    }
    if (e.type === 'danger') {
      sound.play('danger');
      if (mine) haptic([15, 40, 15]);
    }
    if (e.type === 'take') {
      const big = e.penalty >= 7;
      setTimeout(() => {
        sound.play('take', e.penalty);
        if (big) sound.play('moo', e.penalty >= 12 ? 0.8 : 1);
        if (mine) haptic(big ? [60, 40, 90] : 45);
      }, SLAM_MS);
    }
  }, [room.lastEvent, room.played, room.rows, self.playerId]);

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
  const takerId = room.lastEvent?.type === 'take' ? room.lastEvent.playerId : null;

  return (
    <div className="no-scrollbar relative flex shrink-0 gap-2 overflow-x-auto px-3 py-2 sm:justify-center sm:px-4">
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
                <Bullhead size={11} className="text-bull" /> <AnimatedNumber value={p.score} delay={p.id === takerId ? SCORE_LANDS_S : 0} />
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

function PlayedTray({
  snapshot,
  byId,
  colorOf,
  myPending,
  hidden,
}: {
  snapshot: RoomSnapshot;
  byId: Map<string, PublicPlayer>;
  colorOf: Map<string, string>;
  myPending: Card | null;
  /** A card currently hovering over its row (sixth-card suspense) is drawn there, not here. */
  hidden: number | null;
}) {
  const { room, self } = snapshot;
  const t = useT();
  const onBoard = new Set(room.rows.flatMap((r) => r.cards.map((c) => c.value)));
  const w = 'calc(var(--card-w) * 0.9)';
  const lane = 'relative mb-[calc(var(--card-w)*0.18)] flex h-[calc(var(--card-w)*0.9*1.4+20px)] items-end justify-center gap-[calc(var(--card-w)*0.1)]';

  if (room.phase === 'selecting') {
    const played = room.players.filter((p) => p.hasPlayed);
    return (
      <div className={lane}>
        {played.length === 0 && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs font-semibold text-white/25">{t('Cards land here')}</span>}
        <AnimatePresence>
          {played.map((p, i) => {
            const mine = p.id === self.playerId && myPending;
            return mine ? (
              <motion.div
                key={`card-${myPending.value}`}
                layoutId={`card-${myPending.value}`}
                animate={{ y: [0, -4, 0] }}
                transition={{ layout: { type: 'spring', stiffness: 420, damping: 30 }, y: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } }}
                className="relative z-10"
              >
                <GameCard card={myPending} width={w} theme={p.cardTheme} style={{ boxShadow: `0 0 0 2px ${colorOf.get(p.id)}, 0 14px 22px -10px rgb(0 0 0 / .7)` }} />
              </motion.div>
            ) : (
              <motion.div
                key={p.id}
                initial={{ y: -70, opacity: 0, rotate: -18, scale: 0.7 }}
                animate={{ y: 0, opacity: 1, rotate: ((i % 3) - 1) * 3, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 24 }}
              >
                <CardBack width={w} theme={p.cardTheme} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  }

  const revealing = room.phase === 'revealing';
  const visible = room.played.filter(
    (pc, i) => (room.resolvingIndex === null || i >= room.resolvingIndex) && !onBoard.has(pc.card.value) && pc.card.value !== hidden,
  );
  return (
    <div className={clsx(lane, 'no-scrollbar overflow-x-auto')} style={{ perspective: 900 }}>
      <AnimatePresence mode="popLayout">
        {visible.map((pc) => {
          const order = room.played.findIndex((x) => x.card.value === pc.card.value);
          const isCurrent = room.resolvingIndex !== null && room.played[room.resolvingIndex]?.card.value === pc.card.value;
          const owner = byId.get(pc.playerId);
          const color = colorOf.get(pc.playerId) ?? '#fff';
          const mine = pc.playerId === self.playerId;
          return (
            <motion.div
              key={`card-${pc.card.value}`}
              layoutId={`card-${pc.card.value}`}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              animate={{ y: isCurrent ? -10 : 0, scale: isCurrent ? 1.08 : 1 }}
              transition={{ layout: { type: 'spring', stiffness: 380, damping: 30 }, default: { type: 'spring', stiffness: 420, damping: 22 } }}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <motion.div
                className="flip"
                initial={revealing && !mine ? { rotateY: 180 } : false}
                animate={{ rotateY: 0 }}
                transition={{ delay: revealing ? 0.15 + order * 0.11 : 0, duration: 0.42, ease: [0.3, 1.35, 0.5, 1] }}
              >
                <div className="face">
                  <GameCard
                    card={pc.card}
                    width={w}
                    theme={owner?.cardTheme}
                    style={isCurrent ? { boxShadow: `0 0 0 3px ${color}, 0 16px 26px -10px rgb(0 0 0 / .7)` } : undefined}
                  />
                </div>
                <div className="back">
                  <CardBack width={w} theme={owner?.cardTheme} />
                </div>
              </motion.div>
              <span className="flex max-w-[calc(var(--card-w)*1.1)] items-center gap-1 truncate text-[10px] font-bold" style={{ color }}>
                {owner && <Avatar id={owner.avatar} size={14} />}
                <span className="truncate">{mine ? t('You') : owner?.name}</span>
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ board

type TakeEvent = Extract<NonNullable<RoomSnapshot['room']['lastEvent']>, { type: 'take' }>;

function BoardRow({
  index,
  cards,
  theme,
  selectable,
  danger,
  dim,
  target,
  landedValue,
  take,
  onChoose,
}: {
  index: number;
  cards: Card[];
  theme: string;
  selectable: boolean;
  /** Sixth card hovering over this row before it slams in. */
  danger: Card | null;
  dim: boolean;
  target: boolean;
  landedValue: number | null;
  take: TakeEvent | null;
  onChoose: () => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const seenTake = useRef<number | null>(take?.id ?? null);
  const [sweep, setSweep] = useState<{ id: number; old: Card[]; incoming: Card; stage: 'slam' | 'swept' } | null>(null);

  // Record card positions every frame so a take can sweep the old cards from where they were.
  useLayoutEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>('[data-card]') ?? [];
    const shown = [...(sweep?.stage === 'slam' ? [...sweep.old, sweep.incoming] : cards), ...(danger ? [danger] : [])];
    anchors.rows.prev.set(index, anchors.rows.cur.get(index) ?? []);
    anchors.rows.cur.set(
      index,
      [...els].map((el) => ({ card: shown.find((c) => c.value === Number(el.dataset.card))!, rect: el.getBoundingClientRect() })).filter((x) => x.card),
    );
  });

  // The take: the incoming card slams into the next slot, the row jolts, then the old cards are swept
  // into the taker's chip and the penalty rides along to their score.
  useLayoutEffect(() => {
    if (!take || take.id === seenTake.current) return;
    seenTake.current = take.id;
    const old = (anchors.rows.prev.get(index) ?? []).map((x) => x.card).filter((c) => c.value !== take.card.value);
    if (!old.length) return;
    setSweep({ id: take.id, old, incoming: take.card, stage: 'slam' });
    const slam = window.setTimeout(() => {
      const chip = anchors.players.get(take.playerId)?.getBoundingClientRect();
      const oldEls = [...(ref.current?.querySelectorAll<HTMLElement>('[data-old-card]') ?? [])];
      const rects = oldEls.map((el) => ({ card: old.find((c) => c.value === Number(el.dataset.card))!, rect: el.getBoundingClientRect() })).filter((x) => x.card);
      if (chip) {
        fx.flyCards(rects, chip, theme);
        const badge = badgeRef.current?.getBoundingClientRect();
        if (badge && take.penalty > 0) fx.token(badge, chip, `+${take.penalty}`, take.penalty >= 7, 150);
      }
      if (take.penalty >= 7) fx.shake(take.penalty >= 12 ? 'hard' : 'soft');
      setSweep((s) => (s && s.id === take.id ? { ...s, stage: 'swept' } : s));
    }, SLAM_MS);
    const done = window.setTimeout(() => setSweep((s) => (s?.id === take.id ? null : s)), SLAM_MS + SWEEP_MS);
    return () => {
      window.clearTimeout(slam);
      window.clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take?.id]);

  const slamming = sweep?.stage === 'slam';
  const display: { card: Card; old?: boolean; hover?: boolean; slam?: boolean }[] = slamming
    ? [...sweep.old.map((card) => ({ card, old: true })), { card: sweep.incoming, slam: true }]
    : [...cards.map((card) => ({ card })), ...(danger ? [{ card: danger, hover: true }] : [])];
  const penalty = rowPenalty(slamming ? sweep.old : cards);
  const hot = !!danger || slamming;
  const full = cards.length >= MAX_ROW_LENGTH;

  return (
    <motion.div
      className="relative flex items-center gap-[calc(var(--card-w)*0.09)]"
      animate={{
        opacity: dim ? 0.38 : 1,
        filter: dim ? 'saturate(.4)' : 'saturate(1)',
        x: slamming ? [0, -7, 6, -4, 2, 0] : 0,
      }}
      transition={{ opacity: { duration: 0.2 }, filter: { duration: 0.2 }, x: { duration: 0.34, delay: 0.12 } }}
    >
      <motion.div
        ref={badgeRef}
        key={penalty}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 14 }}
        className={clsx(
          'flex w-[calc(var(--card-w)*0.62)] shrink-0 flex-col items-center justify-center rounded-xl py-1.5 transition-colors',
          hot ? 'bg-bull text-white' : penalty >= 10 ? 'bg-bull/25 text-white' : 'bg-black/25 text-mist',
        )}
        title={t('Row {n}: {p} bullheads', { n: index + 1, p: penalty })}
      >
        <Bullhead size={14} className={hot ? 'text-white' : penalty >= 10 ? 'text-bull' : 'text-fog'} />
        <span className="font-display text-sm font-bold tabular sm:text-base">{penalty}</span>
      </motion.div>

      <div ref={ref} className="flex gap-[calc(var(--card-w)*0.07)]">
        {Array.from({ length: MAX_ROW_LENGTH + 1 }, (_, i) => {
          const slot = display[i];
          if (slot) {
            const justLanded = slot.card.value === landedValue;
            return (
              <motion.div
                key={slot.card.value}
                data-card={slot.card.value}
                {...(slot.old ? { 'data-old-card': slot.card.value } : {})}
                layoutId={`card-${slot.card.value}`}
                animate={
                  slot.hover
                    ? { y: -30, rotate: [-4, 4, -4], scale: 1.08 }
                    : slot.slam
                      ? { y: 0, rotate: 0, scale: [1.18, 0.93, 1] }
                      : justLanded
                        ? { y: 0, rotate: 0, scale: [1.1, 0.95, 1] }
                        : { y: 0, rotate: 0, scale: 1 }
                }
                transition={{
                  layout: { type: 'spring', stiffness: slot.slam ? 900 : 460, damping: slot.slam ? 32 : 30 },
                  rotate: slot.hover ? { repeat: Infinity, duration: 0.5, ease: 'easeInOut' } : { duration: 0.2 },
                  default: { duration: slot.slam ? 0.3 : 0.28, delay: justLanded ? 0.2 : slot.slam ? 0.06 : 0 },
                }}
                style={{ zIndex: slot.hover || slot.slam ? 5 : undefined }}
              >
                <GameCard
                  card={slot.card}
                  theme={theme}
                  style={slot.hover ? { boxShadow: '0 0 0 3px #e5484d, 0 22px 30px -10px rgb(0 0 0 / .75)' } : undefined}
                />
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
                isSixth && full && !danger && 'animate-pulse',
                target && i === cards.length && '!border-hay !border-solid bg-hay/10',
              )}
            />
          );
        })}
      </div>

      {danger && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: -6 }}
          transition={{ type: 'spring', stiffness: 700, damping: 14 }}
          className="pointer-events-none absolute -top-3 right-[calc(var(--card-w)*1.3)] z-20 rounded-lg bg-bull px-2 py-0.5 font-display text-xs font-extrabold text-white shadow-[0_3px_0_#8e1f27] sm:text-sm"
        >
          {t('Wait. This one’s the sixth.')}
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
    </motion.div>
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
  const inHand = hand.filter((c) => c.value !== selected);
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
      const n = inHand.length;
      const gap = 6;
      const needed = n * w + (n - 1) * gap;
      setOverlap(n > 1 && needed > el.clientWidth ? (needed - el.clientWidth) / (n - 1) + gap : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [inHand.length]);

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

  const mid = (inHand.length - 1) / 2;
  const spread = Math.min(3.2, 26 / Math.max(1, inHand.length));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex h-7 items-center justify-center">
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
      <div ref={box} className="flex justify-center pb-5 pt-2" style={{ '--overlap': `${overlap}px` } as CSSProperties}>
        <AnimatePresence initial={false}>
          {inHand.map((card, i) => {
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
                layout
                exit={{ opacity: 0, transition: { duration: 0 } }}
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
