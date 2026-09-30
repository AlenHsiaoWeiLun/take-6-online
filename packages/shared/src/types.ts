export interface Card {
  value: number;
  bullheads: number;
}

export interface Row {
  cards: Card[];
}

export type Phase =
  | 'lobby'
  | 'selecting'
  | 'revealing'
  | 'resolving'
  | 'choosingRow'
  | 'handEnd'
  | 'gameEnd';

/** quick = one hand of 10 turns; classic = keep dealing hands until someone reaches 66. */
export type GameMode = 'quick' | 'classic';
export type BotLevel = 'easy' | 'normal' | 'hard';

export interface RoomSettings {
  maxPlayers: number;
  mode: GameMode;
  turnSeconds: number;
  botLevel: BotLevel;
  isPublic: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  cardTheme: string;
  isBot: boolean;
  isHost: boolean;
  isPlus: boolean;
  connected: boolean;
  /** Bullheads across all hands. */
  score: number;
  /** Bullheads collected in the current hand. */
  handScore: number;
  handCount: number;
  hasPlayed: boolean;
}

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export type TableEvent =
  | { id: number; type: 'deal' }
  | { id: number; type: 'reveal' }
  | { id: number; type: 'place'; playerId: string; card: Card; row: number }
  | { id: number; type: 'take'; playerId: string; card: Card; row: number; penalty: number; forced: boolean };

export interface Standing {
  playerId: string;
  name: string;
  avatar: string;
  isBot: boolean;
  score: number;
  rank: number;
}

export interface GameResult {
  standings: Standing[];
  winnerIds: string[];
}

export interface RoomView {
  code: string;
  settings: RoomSettings;
  phase: Phase;
  players: PublicPlayer[];
  spectatorCount: number;
  handNumber: number;
  turn: number;
  rows: Row[];
  /** Face-up cards for the current turn, ascending. Empty while players are still choosing. */
  played: PlayedCard[];
  resolvingIndex: number | null;
  choosingPlayerId: string | null;
  deadline: number | null;
  serverNow: number;
  lastEvent: TableEvent | null;
  result: GameResult | null;
}

export interface SelfView {
  playerId: string | null;
  hand: Card[];
  selected: number | null;
}

export interface RoomSnapshot {
  room: RoomView;
  self: SelfView;
}

export interface PublicRoomSummary {
  code: string;
  hostName: string;
  players: number;
  maxPlayers: number;
  mode: GameMode;
}

export interface SessionInfo {
  isGuest: boolean;
  isPlus: boolean;
  name: string;
  avatar: string;
  cardTheme: string;
}

export type Ack<T = {}> = (response: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ClientToServerEvents {
  'room:create': (settings: Partial<RoomSettings>, ack: Ack<{ code: string }>) => void;
  'room:join': (payload: { code: string }, ack: Ack<{ code: string }>) => void;
  'room:quickplay': (payload: { vsBots: boolean }, ack: Ack<{ code: string }>) => void;
  'room:leave': () => void;
  'room:settings': (settings: Partial<RoomSettings>) => void;
  'room:addBot': () => void;
  'room:remove': (playerId: string) => void;
  'game:start': (ack?: Ack) => void;
  'game:play': (value: number) => void;
  'game:chooseRow': (row: number) => void;
  'game:emote': (emote: string) => void;
  'game:rematch': () => void;
  'profile:update': (profile: { name?: string; avatar?: string; cardTheme?: string }) => void;
}

export interface ServerToClientEvents {
  session: (info: SessionInfo) => void;
  'room:state': (snapshot: RoomSnapshot) => void;
  'room:emote': (payload: { playerId: string; emote: string }) => void;
  'room:closed': (payload: { reason: string }) => void;
}
