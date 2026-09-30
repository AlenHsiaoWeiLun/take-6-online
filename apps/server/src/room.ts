import type { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import {
  BOT_CHARACTER_IDS,
  BOT_NAMES,
  CLASSIC_TARGET,
  HAND_SIZE,
  MAX_PLAYERS,
  MAX_ROW_LENGTH,
  MIN_PLAYERS,
  ROW_COUNT,
  createDeck,
  findTargetRow,
  rankScores,
  rowPenalty,
  shuffle,
  type Card,
  type ClientToServerEvents,
  type GameResult,
  type Phase,
  type PlayedCard,
  type RoomSettings,
  type RoomSnapshot,
  type RoomView,
  type Row,
  type ServerToClientEvents,
  type TableEvent,
} from '@take6/shared';
import type { Identity } from './auth';
import { createBotBrain, type BotBrain, type FaiHistory } from './bots';

export type IO = Server<ClientToServerEvents, ServerToClientEvents>;

const TIMING = {
  // Tuned for pace: long enough to follow every card, short enough to feel snappy.
  revealBase: 900,
  revealPerCard: 90,
  place: 560,
  take: 1250,
  danger: 650,
  handEnd: 5000,
  botMin: 350,
  botMax: 1300,
  absentAutoPlay: 4000,
  rowChoiceMax: 20_000,
  lobbyGrace: 30_000,
  emptyRoomClose: 90_000,
  publicAutoStart: 20_000,
};

export const TURN_SECONDS = [15, 30, 45, 60];

export const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 6,
  mode: 'quick',
  turnSeconds: 30,
  botLevel: 'normal',
  isPublic: false,
};

interface Seat {
  id: string;
  identity: Identity | null;
  name: string;
  avatar: string;
  cardTheme: string;
  isPlus: boolean;
  isBot: boolean;
  sockets: Set<string>;
  hand: Card[];
  selected: Card | null;
  score: number;
  handScore: number;
  rowsTaken: number;
  biggestTake: number;
  /** Left mid-game; their turns are auto-played until they rejoin. */
  left: boolean;
}

export interface GameSummary {
  code: string;
  mode: RoomSettings['mode'];
  botLevel: RoomSettings['botLevel'];
  startedAt: Date;
  hands: number;
  standings: { playerId: string; userId: string | null; name: string; isBot: boolean; score: number; rank: number }[];
}

export interface RoomHooks {
  onGameEnd: (summary: GameSummary) => void;
  onClose: (room: Room) => void;
}

const isConnected = (seat: Seat) => seat.isBot || seat.sockets.size > 0;

export class Room {
  readonly code: string;
  settings: RoomSettings;
  /** Public rooms created by matchmaking fill with bots and start on their own. */
  readonly autoStart: boolean;
  private phase: Phase = 'lobby';
  private seats: Seat[] = [];
  private spectators = new Map<string, string>(); // socketId -> identity key
  private hostId: string | null = null;
  private kicked = new Set<string>();

  private rows: Row[] = [];
  private played: PlayedCard[] = [];
  private resolvingIndex: number | null = null;
  private choosingPlayerId: string | null = null;
  private deadline: number | null = null;
  private handNumber = 0;
  private turn = 0;
  private lastEvent: TableEvent | null = null;
  private eventId = 0;
  private result: GameResult | null = null;
  private startedAt = new Date();

  /** Cards revealed this hand — bots use it to reason about the unseen pool. */
  private seen = new Set<number>();
  private history: FaiHistory = emptyHistory();
  private brain: BotBrain;

  private step = 0;
  private timers = new Set<NodeJS.Timeout>();
  private closeTimer: NodeJS.Timeout | null = null;
  private closed = false;

  constructor(
    private readonly io: IO,
    code: string,
    settings: Partial<RoomSettings>,
    private readonly hooks: RoomHooks,
    options: { autoStart?: boolean } = {},
  ) {
    this.code = code;
    this.settings = sanitizeSettings({ ...DEFAULT_SETTINGS, ...settings }, 0);
    this.autoStart = !!options.autoStart;
    this.brain = createBotBrain();
  }

  // ---------------------------------------------------------------- membership

  get isLobby() {
    return this.phase === 'lobby';
  }

  get humanCount() {
    return this.seats.filter((s) => !s.isBot && isConnected(s)).length;
  }

  get openSeats() {
    return this.settings.maxPlayers - this.seats.length;
  }

  get hostName() {
    return this.seats.find((s) => s.id === this.hostId)?.name ?? 'Host';
  }

  get playerCount() {
    return this.seats.length;
  }

  hasSocket(socketId: string) {
    return this.spectators.has(socketId) || this.seats.some((s) => s.sockets.has(socketId));
  }

  join(socketId: string, identity: Identity): { ok: true } | { ok: false; error: string } {
    if (this.closed) return { ok: false, error: 'This room has closed.' };
    if (this.kicked.has(identity.key)) return { ok: false, error: 'You were removed from this room.' };
    this.cancelClose();

    const existing = this.seats.find((s) => s.identity?.key === identity.key);
    if (existing) {
      existing.sockets.add(socketId);
      existing.left = false;
      this.applyIdentity(existing, identity);
      if (!this.hostId || !this.seatById(this.hostId)) this.hostId = existing.id;
      this.broadcast();
      return { ok: true };
    }

    if (this.phase === 'lobby' && this.seats.length < this.settings.maxPlayers) {
      const seat = this.newSeat(identity);
      seat.sockets.add(socketId);
      this.seats.push(seat);
      if (!this.hostId || !this.seatById(this.hostId)) this.hostId = seat.id;
      this.maybeScheduleAutoStart();
      if (this.autoStart && this.seats.length >= this.settings.maxPlayers) this.start();
      else this.broadcast();
      return { ok: true };
    }

    this.spectators.set(socketId, identity.key);
    this.broadcast();
    return { ok: true };
  }

  /** Socket left the room, either explicitly (`leave`) or by disconnecting. */
  detach(socketId: string, explicit: boolean) {
    if (this.spectators.delete(socketId)) {
      this.broadcast();
      this.maybeScheduleClose();
      return;
    }
    const seat = this.seats.find((s) => s.sockets.has(socketId));
    if (!seat) return;
    seat.sockets.delete(socketId);
    if (seat.sockets.size > 0) return;

    if (this.phase === 'lobby') {
      if (explicit) this.removeSeat(seat.id);
      else {
        // Give a refreshing tab a moment to come back before freeing the seat.
        const timer = setTimeout(() => {
          this.timers.delete(timer);
          if (this.phase === 'lobby' && seat.sockets.size === 0 && this.seats.includes(seat)) {
            this.removeSeat(seat.id);
            this.broadcast();
            this.maybeScheduleClose();
          }
        }, TIMING.lobbyGrace);
        this.timers.add(timer);
      }
    } else {
      if (explicit) seat.left = true;
      this.scheduleAbsentAction(seat);
    }
    this.reassignHostIfNeeded();
    this.broadcast();
    this.maybeScheduleClose();
  }

  updateIdentity(identity: Identity) {
    const seat = this.seats.find((s) => s.identity?.key === identity.key);
    if (!seat) return;
    this.applyIdentity(seat, identity);
    this.broadcast();
  }

  private applyIdentity(seat: Seat, identity: Identity) {
    seat.identity = identity;
    seat.isPlus = identity.isPlus;
    seat.cardTheme = identity.cardTheme;
    // Names and portraits only change between games so the table stays readable.
    if (this.phase === 'lobby') {
      seat.name = identity.name;
      seat.avatar = identity.avatar;
    }
  }

  private newSeat(identity: Identity | null): Seat {
    const used = new Set(this.seats.map((s) => s.name));
    const botName = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${this.seats.length + 1}`;
    const usedAvatars = new Set(this.seats.map((s) => s.avatar));
    const botAvatar =
      BOT_CHARACTER_IDS.find((a) => !usedAvatars.has(a)) ??
      BOT_CHARACTER_IDS[Math.floor(Math.random() * BOT_CHARACTER_IDS.length)];
    return {
      id: nanoid(10),
      identity,
      name: identity?.name ?? botName,
      avatar: identity?.avatar ?? botAvatar,
      cardTheme: identity?.cardTheme ?? 'classic',
      isPlus: identity?.isPlus ?? false,
      isBot: !identity,
      sockets: new Set(),
      hand: [],
      selected: null,
      score: 0,
      handScore: 0,
      rowsTaken: 0,
      biggestTake: 0,
      left: false,
    };
  }

  private removeSeat(seatId: string) {
    this.seats = this.seats.filter((s) => s.id !== seatId);
    this.reassignHostIfNeeded();
  }

  private reassignHostIfNeeded() {
    const host = this.hostId ? this.seatById(this.hostId) : undefined;
    if (host && !host.isBot && host.sockets.size > 0) return;
    const next = this.seats.find((s) => !s.isBot && s.sockets.size > 0);
    if (next) this.hostId = next.id;
    else if (!host) this.hostId = null;
  }

  private seatById(id: string) {
    return this.seats.find((s) => s.id === id);
  }

  private seatBySocket(socketId: string) {
    return this.seats.find((s) => s.sockets.has(socketId));
  }

  private isHost(socketId: string) {
    return !!this.hostId && this.seatBySocket(socketId)?.id === this.hostId;
  }

  // ---------------------------------------------------------------- host controls

  updateSettings(socketId: string, patch: Partial<RoomSettings>) {
    if (!this.isHost(socketId) || this.phase !== 'lobby') return;
    this.settings = sanitizeSettings({ ...this.settings, ...patch }, this.seats.length);
    this.broadcast();
  }

  addBot(socketId: string) {
    if (!this.isHost(socketId) || this.phase !== 'lobby') return;
    if (this.seats.length >= this.settings.maxPlayers) return;
    this.seats.push(this.newSeat(null));
    this.broadcast();
  }

  fillWithBots(total: number) {
    while (this.seats.length < Math.min(total, this.settings.maxPlayers)) this.seats.push(this.newSeat(null));
  }

  remove(socketId: string, playerId: string) {
    if (!this.isHost(socketId) || this.phase !== 'lobby') return;
    const seat = this.seatById(playerId);
    if (!seat || seat.id === this.hostId) return;
    if (seat.identity) {
      this.kicked.add(seat.identity.key);
      for (const sid of seat.sockets) {
        this.io.to(sid).emit('room:closed', { reason: 'The host removed you from the room.' });
        this.io.in(sid).socketsLeave(this.code);
      }
    }
    this.removeSeat(seat.id);
    this.broadcast();
  }

  startBy(socketId: string): string | null {
    if (!this.isHost(socketId)) return 'Only the host can start the game.';
    if (this.phase !== 'lobby') return 'The game has already started.';
    if (this.seats.length < MIN_PLAYERS) return 'Add at least one more player or bot.';
    this.start();
    return null;
  }

  /** Back to the lobby, or with `instant` straight into a fresh deal with the same table. */
  rematch(socketId: string, instant = false) {
    if (!this.isHost(socketId) || this.phase !== 'gameEnd') return;
    this.advance();
    this.seats = this.seats.filter((s) => s.isBot || (s.sockets.size > 0 && !s.left));
    for (const s of this.seats) {
      s.score = 0;
      s.handScore = 0;
      s.hand = [];
      s.selected = null;
      if (s.identity) this.applyIdentityForLobby(s);
    }
    this.phase = 'lobby';
    this.rows = [];
    this.result = null;
    this.lastEvent = null;
    this.deadline = null;
    this.handNumber = 0;
    this.turn = 0;
    this.reassignHostIfNeeded();
    if (instant && this.seats.length >= MIN_PLAYERS) return this.start();
    this.maybeScheduleAutoStart();
    this.broadcast();
  }

  private applyIdentityForLobby(seat: Seat) {
    if (!seat.identity) return;
    seat.name = seat.identity.name;
    seat.avatar = seat.identity.avatar;
  }

  emote(socketId: string, emote: string) {
    const seat = this.seatBySocket(socketId);
    if (!seat) return;
    this.io.to(this.code).emit('room:emote', { playerId: seat.id, emote });
  }

  // ---------------------------------------------------------------- game flow

  private start() {
    if (this.phase !== 'lobby' || this.seats.length < MIN_PLAYERS) return;
    this.startedAt = new Date();
    for (const s of this.seats) {
      s.score = 0;
      s.handScore = 0;
      s.rowsTaken = 0;
      s.biggestTake = 0;
    }
    this.handNumber = 0;
    this.result = null;
    this.brain.reset(this.seats.length);
    this.deal();
  }

  private deal() {
    this.advance();
    this.handNumber += 1;
    const deck = shuffle(createDeck());
    for (const s of this.seats) {
      s.hand = deck.splice(0, HAND_SIZE).sort((a, b) => a.value - b.value);
      s.handScore = 0;
      s.selected = null;
    }
    this.rows = Array.from({ length: ROW_COUNT }, () => ({ cards: [deck.pop()!] }));
    this.turn = 0;
    this.seen = new Set();
    this.history = emptyHistory();
    this.brain.reset(this.seats.length);
    this.lastEvent = { id: ++this.eventId, type: 'deal' };
    this.startSelecting();
  }

  private startSelecting() {
    this.advance();
    this.turn += 1;
    this.phase = 'selecting';
    this.played = [];
    this.resolvingIndex = null;
    this.choosingPlayerId = null;
    this.deadline = Date.now() + this.settings.turnSeconds * 1000;
    this.history.board_history.push(this.rows.map((r) => r.cards.map((c) => c.value)));
    this.broadcast();

    for (const seat of this.seats) {
      if (seat.isBot) this.scheduleBotPlay(seat);
      else if (!isConnected(seat) || seat.left) this.scheduleAbsentAction(seat);
    }
    this.later(this.settings.turnSeconds * 1000, () => {
      for (const seat of this.seats) if (!seat.selected) this.autoPlay(seat);
    });
  }

  play(socketId: string, value: number) {
    const seat = this.seatBySocket(socketId);
    if (seat) this.playFor(seat, value);
  }

  private playFor(seat: Seat, value: number) {
    if (this.phase !== 'selecting' || seat.selected) return;
    const card = seat.hand.find((c) => c.value === value);
    if (!card) return;
    seat.selected = card;
    if (this.seats.every((s) => s.selected)) this.reveal();
    else this.broadcast();
  }

  private scheduleBotPlay(seat: Seat) {
    const delay = TIMING.botMin + Math.random() * (TIMING.botMax - TIMING.botMin);
    const step = this.step;
    const seatIndex = this.seats.indexOf(seat);
    const decision = this.brain
      .chooseCard(seatIndex, {
        hand: seat.hand,
        rows: this.rows,
        opponents: this.seats.length - 1,
        seen: this.seen,
        level: this.settings.botLevel,
      }, this.faiHistory())
      .catch(() => seat.hand[0].value);
    this.later(delay, async () => {
      const value = await decision;
      if (this.step === step) this.playFor(seat, value);
    });
  }

  /** Plays on behalf of a player who ran out of time or is away. */
  private autoPlay(seat: Seat) {
    if (this.phase === 'selecting' && !seat.selected && seat.hand.length) {
      // Timeouts get a safe-ish pick rather than a random one, so AFK players don't wreck the table.
      const decision = this.brain.chooseBuiltin({
        hand: seat.hand,
        rows: this.rows,
        opponents: this.seats.length - 1,
        seen: this.seen,
        level: 'easy',
      });
      this.playFor(seat, decision);
    } else if (this.phase === 'choosingRow' && this.choosingPlayerId === seat.id) {
      this.chooseRowFor(seat, this.brain.chooseRow(this.rows));
    }
  }

  private scheduleAbsentAction(seat: Seat) {
    if (seat.isBot) return;
    this.later(TIMING.absentAutoPlay, () => {
      if (!isConnected(seat) || seat.left) this.autoPlay(seat);
    });
  }

  private reveal() {
    this.advance();
    this.phase = 'revealing';
    this.deadline = null;
    this.played = this.seats
      .map((s) => ({ playerId: s.id, card: s.selected! }))
      .sort((a, b) => a.card.value - b.card.value);
    this.history.history_matrix.push(this.seats.map((s) => s.selected!.value));
    for (const s of this.seats) {
      s.hand = s.hand.filter((c) => c.value !== s.selected!.value);
      this.seen.add(s.selected!.value);
    }
    this.lastEvent = { id: ++this.eventId, type: 'reveal' };
    this.broadcast();
    this.later(TIMING.revealBase + TIMING.revealPerCard * this.played.length, () => {
      this.resolvingIndex = 0;
      this.resolveCurrent();
    });
  }

  private resolveCurrent() {
    this.advance();
    const index = this.resolvingIndex ?? 0;
    if (index >= this.played.length) return this.endTurn();

    const { playerId, card } = this.played[index];
    const seat = this.seatById(playerId)!;
    const target = findTargetRow(card, this.rows);

    if (target === -1) {
      this.phase = 'choosingRow';
      this.choosingPlayerId = seat.id;
      const window = Math.min(this.settings.turnSeconds * 1000, TIMING.rowChoiceMax);
      this.deadline = Date.now() + window;
      this.broadcast();
      if (seat.isBot) this.later(700, () => this.chooseRowFor(seat, this.brain.chooseRow(this.rows)));
      else if (!isConnected(seat) || seat.left) this.scheduleAbsentAction(seat);
      this.later(window, () => this.autoPlay(seat));
      return;
    }

    this.phase = 'resolving';
    this.choosingPlayerId = null;
    this.deadline = null;
    if (this.rows[target].cards.length >= MAX_ROW_LENGTH) {
      this.lastEvent = { id: ++this.eventId, type: 'danger', playerId: seat.id, card, row: target };
      this.broadcast();
      this.later(TIMING.danger, () => this.takeRow(seat, target, card, false));
    } else {
      this.rows[target] = { cards: [...this.rows[target].cards, card] };
      this.lastEvent = { id: ++this.eventId, type: 'place', playerId: seat.id, card, row: target };
      this.broadcast();
      this.later(TIMING.place, () => this.next());
    }
  }

  chooseRow(socketId: string, row: number) {
    const seat = this.seatBySocket(socketId);
    if (seat) this.chooseRowFor(seat, row);
  }

  private chooseRowFor(seat: Seat, row: number) {
    if (this.phase !== 'choosingRow' || this.choosingPlayerId !== seat.id) return;
    if (!Number.isInteger(row) || row < 0 || row >= this.rows.length) return;
    const { card } = this.played[this.resolvingIndex ?? 0];
    this.advance();
    this.phase = 'resolving';
    this.choosingPlayerId = null;
    this.deadline = null;
    this.takeRow(seat, row, card, true);
  }

  private takeRow(seat: Seat, row: number, card: Card, forced: boolean) {
    const penalty = rowPenalty(this.rows[row].cards);
    seat.score += penalty;
    seat.handScore += penalty;
    seat.rowsTaken += 1;
    seat.biggestTake = Math.max(seat.biggestTake, penalty);
    this.rows[row] = { cards: [card] };
    this.lastEvent = { id: ++this.eventId, type: 'take', playerId: seat.id, card, row, penalty, forced };
    this.broadcast();
    this.later(TIMING.take, () => this.next());
  }

  private next() {
    this.resolvingIndex = (this.resolvingIndex ?? 0) + 1;
    this.resolveCurrent();
  }

  private endTurn() {
    this.history.score_history.push(this.seats.map((s) => s.score));
    for (const s of this.seats) s.selected = null;
    this.played = [];
    this.resolvingIndex = null;
    if (this.turn >= HAND_SIZE) this.endHand();
    else this.startSelecting();
  }

  private endHand() {
    this.advance();
    const reachedTarget = this.seats.some((s) => s.score >= CLASSIC_TARGET);
    if (this.settings.mode === 'quick' || reachedTarget) return this.endGame();
    this.phase = 'handEnd';
    this.deadline = Date.now() + TIMING.handEnd;
    this.broadcast();
    this.later(TIMING.handEnd, () => this.deal());
  }

  private endGame() {
    this.advance();
    this.phase = 'gameEnd';
    this.deadline = null;
    const ranks = rankScores(this.seats.map((s) => s.score));
    const standings = this.seats
      .map((s, i) => ({
        playerId: s.id,
        name: s.name,
        avatar: s.avatar,
        isBot: s.isBot,
        score: s.score,
        rank: ranks[i],
        rowsTaken: s.rowsTaken,
        biggestTake: s.biggestTake,
      }))
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
    this.result = { standings, winnerIds: standings.filter((s) => s.rank === 1).map((s) => s.playerId) };
    this.broadcast();
    this.hooks.onGameEnd({
      code: this.code,
      mode: this.settings.mode,
      botLevel: this.settings.botLevel,
      startedAt: this.startedAt,
      hands: this.handNumber,
      standings: this.seats.map((s, i) => ({
        playerId: s.id,
        userId: s.identity?.userId ?? null,
        name: s.name,
        isBot: s.isBot,
        score: s.score,
        rank: ranks[i],
      })),
    });
  }

  // ---------------------------------------------------------------- lobby automation

  private maybeScheduleAutoStart() {
    if (!this.autoStart || this.phase !== 'lobby' || this.deadline) return;
    if (!this.seats.some((s) => !s.isBot)) return;
    this.deadline = Date.now() + TIMING.publicAutoStart;
    this.later(TIMING.publicAutoStart, () => {
      if (this.phase !== 'lobby') return;
      this.deadline = null;
      if (!this.seats.some((s) => !s.isBot && s.sockets.size > 0)) return;
      this.fillWithBots(Math.max(4, this.seats.length));
      this.start();
    });
  }

  private maybeScheduleClose() {
    if (this.closeTimer || this.humanCount > 0 || this.spectators.size > 0) return;
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      if (this.humanCount === 0 && this.spectators.size === 0) this.close();
    }, this.phase === 'lobby' ? 5_000 : TIMING.emptyRoomClose);
  }

  private cancelClose() {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = null;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.advance();
    this.cancelClose();
    this.brain.close();
    this.hooks.onClose(this);
  }

  // ---------------------------------------------------------------- timers

  /** Invalidates every callback scheduled for the previous step. */
  private advance() {
    this.step += 1;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  private later(ms: number, fn: () => void | Promise<void>) {
    const step = this.step;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.step === step && !this.closed) void fn();
    }, ms);
    this.timers.add(timer);
  }

  // ---------------------------------------------------------------- views

  private faiHistory(): FaiHistory {
    return {
      board: this.rows.map((r) => r.cards.map((c) => c.value)),
      scores: this.seats.map((s) => s.score),
      round: Math.max(0, this.turn - 1),
      history_matrix: this.history.history_matrix.map((r) => [...r]),
      board_history: this.history.board_history.map((b) => b.map((r) => [...r])),
      score_history: this.history.score_history.map((r) => [...r]),
    };
  }

  private view(): RoomView {
    return {
      code: this.code,
      settings: this.settings,
      phase: this.phase,
      players: this.seats.map((s) => ({
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        cardTheme: s.cardTheme,
        isBot: s.isBot,
        isHost: s.id === this.hostId,
        isPlus: s.isPlus,
        connected: isConnected(s) && !s.left,
        score: s.score,
        handScore: s.handScore,
        handCount: s.hand.length,
        hasPlayed: !!s.selected,
      })),
      spectatorCount: this.spectators.size,
      handNumber: this.handNumber,
      turn: this.turn,
      rows: this.rows,
      played: this.phase === 'selecting' ? [] : this.played,
      resolvingIndex: this.resolvingIndex,
      choosingPlayerId: this.choosingPlayerId,
      deadline: this.deadline,
      serverNow: Date.now(),
      lastEvent: this.lastEvent,
      result: this.result,
    };
  }

  snapshotFor(socketId: string): RoomSnapshot {
    return this.snapshot(this.view(), this.seatBySocket(socketId));
  }

  private snapshot(room: RoomView, seat: Seat | undefined): RoomSnapshot {
    return {
      room,
      self: {
        playerId: seat?.id ?? null,
        hand: seat?.hand ?? [],
        selected: seat?.selected?.value ?? null,
      },
    };
  }

  broadcast() {
    if (this.closed) return;
    const room = this.view();
    for (const seat of this.seats) {
      if (!seat.sockets.size) continue;
      const snap = this.snapshot(room, seat);
      for (const sid of seat.sockets) this.io.to(sid).emit('room:state', snap);
    }
    if (this.spectators.size) {
      const snap = this.snapshot(room, undefined);
      for (const sid of this.spectators.keys()) this.io.to(sid).emit('room:state', snap);
    }
  }
}

function emptyHistory(): FaiHistory {
  return { board: [], scores: [], round: 0, history_matrix: [], board_history: [], score_history: [] };
}

export function sanitizeSettings(input: RoomSettings, seated: number): RoomSettings {
  const maxPlayers = Math.max(MIN_PLAYERS, seated, Math.min(MAX_PLAYERS, Math.round(Number(input.maxPlayers) || 6)));
  return {
    maxPlayers,
    mode: input.mode === 'classic' ? 'classic' : 'quick',
    turnSeconds: TURN_SECONDS.includes(Number(input.turnSeconds)) ? Number(input.turnSeconds) : 30,
    botLevel: (['easy', 'normal', 'hard'] as const).includes(input.botLevel) ? input.botLevel : 'normal',
    isPublic: !!input.isPublic,
  };
}
