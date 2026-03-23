export enum GameState {
  LOBBY = 'LOBBY',
  READY = 'READY',
  DEALING = 'DEALING',
  SELECTING = 'SELECTING',
  REVEALING = 'REVEALING',
  RESOLVING = 'RESOLVING',
  WAITING_ROW_CHOICE = 'WAITING_ROW_CHOICE',
  ROUND_END = 'ROUND_END',
  GAME_END = 'GAME_END'
}

export type SeatIndex = number;

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  seatIndex: SeatIndex | null;
  isConnected: boolean;
}

export interface Card {
  value: number;
  bullheads: number;
}

export interface SubmittedCard {
  playerIndex: number;
  card: Card;
  isRevealed: boolean;
}

export interface Row {
  cards: Card[];
}

export interface GameStatus {
  state: GameState;
  round: number;
  rows: Row[];
  players: (Player | null)[];
  scores: number[];
  handCounts: number[];
  submittedCards: (SubmittedCard | null)[];
  activePlayerIndex: number | null; // For row choice
  resolvingCardIndex: number | null; // Which card in the sorted submitted cards is being resolved
  winners: number[] | null;
  maxPlayers: number;
}

export interface AnimationEvent {
  type: 'REVEAL' | 'PLACE_CARD' | 'TAKE_ROW' | 'SCORE_CHANGE' | 'EMOTE';
  playerIndex?: number;
  card?: Card;
  rowIndex?: number;
  targetRowIndex?: number;
  scoreDelta?: number;
  emoteId?: string;
  timestamp: number;
}

export interface ClientState extends GameStatus {
  mySeatIndex: SeatIndex | null;
  myHand: Card[];
  lastAnimationEvent: AnimationEvent | null;
}

export type Position = 'bottom' | 'left' | 'top' | 'right';
