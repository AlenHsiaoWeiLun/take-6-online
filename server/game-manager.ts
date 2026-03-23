import { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { 
  GameState, Player, GameStatus, Card, SubmittedCard, SeatIndex 
} from "../src/shared/types";
import { createDeck, shuffle, findTargetRow, calculateRowBullheads } from "../src/shared/game-logic";
import { BOT_NAMES } from "../src/shared/constants";
import { FaiAgentClient, getFaiAgentConfig } from "./fai-agent-client";

export class GameManager {
  private io: Server;
  private players: Map<string, Player> = new Map(); // socketId -> Player
  private sessionToPlayer: Map<string, Player> = new Map(); // sessionId -> Player
  private readonly agentConfig = getFaiAgentConfig();
  private readonly botAgents: Map<number, FaiAgentClient> = new Map();
  
  private status: GameStatus = {
    state: GameState.LOBBY,
    round: 0,
    rows: [],
    players: [null, null, null, null],
    scores: [0, 0, 0, 0],
    handCounts: [0, 0, 0, 0],
    submittedCards: [null, null, null, null],
    activePlayerIndex: null,
    resolvingCardIndex: null,
    winners: null,
    maxPlayers: 4
  };

  private hands: Map<number, Card[]> = new Map(); // seatIndex -> Cards
  private deck: Card[] = [];
  private historyMatrix: number[][] = [];
  private boardHistory: number[][][] = [];
  private scoreHistory: number[][] = [];

  constructor(io: Server) {
    this.io = io;
  }

  public handleConnection(socket: Socket) {
    const { sessionId, uid, displayName, photoURL } = socket.handshake.auth;
    const effectiveId = uid || sessionId || nanoid();
    let player = this.sessionToPlayer.get(effectiveId);

    if (!player) {
      player = {
        id: effectiveId,
        name: displayName || `Guest_${nanoid(4)}`,
        avatar: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${effectiveId}`,
        isBot: false,
        seatIndex: null,
        isConnected: true
      };
      this.sessionToPlayer.set(effectiveId, player);
    } else {
      player.isConnected = true;
      // Update name/avatar if they changed (e.g. user just logged in)
      if (displayName) player.name = displayName;
      if (photoURL) player.avatar = photoURL;
    }

    this.players.set(socket.id, player);
    socket.emit("session", { sessionId: effectiveId });
    this.broadcastState();

    socket.on("joinSeat", (seatIndex: number) => {
      this.joinSeat(player!, seatIndex as SeatIndex);
    });

    socket.on("leaveSeat", () => {
      this.leaveSeat(player!);
    });

    socket.on("addBot", (seatIndex: number) => {
      this.addBot(seatIndex as SeatIndex);
    });

    socket.on("setMaxPlayers", (count: number) => {
      if (this.status.state !== GameState.LOBBY) return;
      if (count < 2 || count > 10) return;
      
      this.status.maxPlayers = count;
      // Adjust arrays
      this.status.players = Array(count).fill(null).map((_, i) => this.status.players[i] || null);
      this.status.scores = Array(count).fill(0).map((_, i) => this.status.scores[i] || 0);
      this.status.handCounts = Array(count).fill(0).map((_, i) => this.status.handCounts[i] || 0);
      this.status.submittedCards = Array(count).fill(null).map((_, i) => this.status.submittedCards[i] || null);
      
      // Remove players who are now out of bounds
      this.sessionToPlayer.forEach(p => {
        if (p.seatIndex !== null && p.seatIndex >= count) {
          p.seatIndex = null;
        }
      });

      this.broadcastState();
    });

    socket.on("startGame", () => {
      this.startGame();
    });

    socket.on("selectCard", (cardValue: number) => {
      this.selectCard(player!, cardValue);
    });

    socket.on("chooseRow", (rowIndex: number) => {
      this.handleRowChoice(player!, rowIndex);
    });

    socket.on("emote", (emoteId: string) => {
      if (player!.seatIndex !== null) {
        this.io.emit("emote", { playerIndex: player!.seatIndex, emoteId });
      }
    });

    socket.on("resetGame", () => {
        if (this.status.state === GameState.GAME_END) {
            this.resetToLobby();
        }
    });

    socket.on("updateProfile", ({ name, avatar }: { name: string, avatar: string }) => {
      if (player) {
        player.name = name;
        player.avatar = avatar;
        this.broadcastState();
      }
    });
  }

  public handleDisconnect(socket: Socket) {
    const player = this.players.get(socket.id);
    if (player) {
      player.isConnected = false;
      this.players.delete(socket.id);
      
      // If in lobby, we might want to free the seat immediately
      if (this.status.state === GameState.LOBBY && player.seatIndex !== null) {
          // Keep it for a bit? Or just leave.
          // For simplicity, let's keep it for reconnect.
      }
      
      this.broadcastState();
    }
  }

  private broadcastState() {
    this.io.emit("gameState", this.status);
    
    // Send private hands to each player
    this.status.players.forEach((p, index) => {
      if (p && !p.isBot) {
        const socketId = Array.from(this.players.entries()).find(([_, player]) => player.id === p.id)?.[0];
        if (socketId) {
          this.io.to(socketId).emit("myHand", this.hands.get(index) || []);
        }
      }
    });
  }

  private joinSeat(player: Player, seatIndex: SeatIndex) {
    if (this.status.state !== GameState.LOBBY) return;
    if (this.status.players[seatIndex] !== null) return;
    
    // Remove from old seat if any
    if (player.seatIndex !== null) {
      this.status.players[player.seatIndex] = null;
    }

    player.seatIndex = seatIndex;
    this.status.players[seatIndex] = player;
    this.broadcastState();
  }

  private leaveSeat(player: Player) {
    if (this.status.state !== GameState.LOBBY) return;
    if (player.seatIndex !== null) {
      this.status.players[player.seatIndex] = null;
      player.seatIndex = null;
      this.broadcastState();
    }
  }

  private addBot(seatIndex: SeatIndex) {
    if (this.status.state !== GameState.LOBBY) return;
    if (this.status.players[seatIndex] !== null) return;

    const botId = nanoid();
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const bot: Player = {
      id: botId,
      name: botName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}`,
      isBot: true,
      seatIndex: seatIndex,
      isConnected: true
    };

    this.status.players[seatIndex] = bot;
    this.broadcastState();
  }

  private startGame() {
    if (this.status.state !== GameState.LOBBY) return;

    // Fill empty seats with bots
    for (let i = 0; i < this.status.maxPlayers; i++) {
      if (this.status.players[i] === null) {
        this.addBot(i);
      }
    }

    this.status.state = GameState.DEALING;
    this.status.round = 1;
    this.status.scores = Array(this.status.maxPlayers).fill(0);
    this.status.handCounts = Array(this.status.maxPlayers).fill(0);
    this.status.submittedCards = Array(this.status.maxPlayers).fill(null);
    this.status.activePlayerIndex = null;
    this.status.resolvingCardIndex = null;
    this.status.winners = null;
    this.historyMatrix = [];
    this.boardHistory = [];
    this.scoreHistory = [];
    
    this.deck = shuffle(createDeck());
    
    // Deal 10 cards to each
    for (let i = 0; i < this.status.maxPlayers; i++) {
      const hand = this.deck.splice(0, 10).sort((a, b) => a.value - b.value);
      this.hands.set(i, hand);
      this.status.handCounts[i] = 10;
    }

    // Initial 4 rows
    this.status.rows = [
      { cards: [this.deck.pop()!] },
      { cards: [this.deck.pop()!] },
      { cards: [this.deck.pop()!] },
      { cards: [this.deck.pop()!] }
    ];

    this.resetBotAgents();
    for (let i = 0; i < this.status.maxPlayers; i++) {
      if (this.status.players[i]?.isBot) {
        this.botAgents.set(i, new FaiAgentClient(i, this.agentConfig));
      }
    }

    this.broadcastState();
    
    setTimeout(() => {
      this.beginSelectionPhase();
    }, 2000);
  }

  private beginSelectionPhase() {
    if (this.status.state === GameState.GAME_END) return;

    this.recordBoardSnapshot();
    this.status.state = GameState.SELECTING;
    this.broadcastState();
    void this.checkBotsSelection();
  }

  private selectCard(player: Player, cardValue: number) {
    if (this.status.state !== GameState.SELECTING) return;
    if (player.seatIndex === null) return;
    
    const seatIndex = player.seatIndex;
    if (this.status.submittedCards[seatIndex]) return;

    const hand = this.hands.get(seatIndex);
    const card = hand?.find(c => c.value === cardValue);
    if (!card) return;

    this.status.submittedCards[seatIndex] = {
      playerIndex: seatIndex,
      card: card,
      isRevealed: false
    };

    this.broadcastState();

    if (this.status.submittedCards.every(c => c !== null)) {
      this.recordRoundActions();
      this.revealCards();
    }
  }

  private async checkBotsSelection() {
    if (this.status.state !== GameState.SELECTING) return;
    
    for (const [index, player] of this.status.players.entries()) {
      if (!player?.isBot || this.status.submittedCards[index]) {
        continue;
      }

      const hand = this.hands.get(index) || [];
      if (!hand.length) {
        continue;
      }

      try {
        const chosenValue = await this.getBotCardChoice(index, hand);
        this.selectCard(player, chosenValue);
      } catch (error) {
        console.error(`Bot ${index} agent failed, falling back to lowest card.`, error);
        this.selectCard(player, hand[0].value);
      }

      if (this.status.state !== GameState.SELECTING) {
        return;
      }
    }
  }

  private revealCards() {
    this.status.state = GameState.REVEALING;
    this.status.submittedCards.forEach(c => { if (c) c.isRevealed = true; });
    this.io.emit("animation", { type: 'REVEAL', timestamp: Date.now() });
    this.broadcastState();

    setTimeout(() => {
      this.startResolving();
    }, 2000);
  }

  private startResolving() {
    this.status.state = GameState.RESOLVING;
    this.status.resolvingCardIndex = 0;
    this.resolveNextCard();
  }

  private resolveNextCard() {
    const sortedSubmitted = [...this.status.submittedCards]
      .filter((c): c is SubmittedCard => c !== null)
      .sort((a, b) => a.card.value - b.card.value);

    const currentIndex = this.status.resolvingCardIndex!;
    if (currentIndex >= sortedSubmitted.length) {
      this.endRound();
      return;
    }

    const sub = sortedSubmitted[currentIndex];
    const targetRowIndex = findTargetRow(sub.card, this.status.rows);

    if (targetRowIndex === -1) {
      const player = this.status.players[sub.playerIndex];
      this.broadcastState();

      setTimeout(() => {
        if (this.status.state !== GameState.RESOLVING) return;
        if (this.status.resolvingCardIndex !== currentIndex) return;

        this.status.state = GameState.WAITING_ROW_CHOICE;
        this.status.activePlayerIndex = sub.playerIndex;
        this.broadcastState();

        if (player?.isBot) {
          const forcedRowIndex = this.findForcedRowIndex();
          setTimeout(() => {
            if (this.status.state !== GameState.WAITING_ROW_CHOICE) return;
            if (this.status.activePlayerIndex !== sub.playerIndex) return;
            this.handleRowChoice(player, forcedRowIndex);
          }, 300);
        }
      }, 900);
    } else {
      const row = this.status.rows[targetRowIndex];
      if (row.cards.length >= 5) {
        // Take row
        this.takeRow(sub.playerIndex, targetRowIndex, sub.card);
      } else {
        // Place card
        row.cards.push(sub.card);
        this.removeCardFromHand(sub.playerIndex, sub.card.value);
        this.io.emit("animation", { type: 'PLACE_CARD', playerIndex: sub.playerIndex, card: sub.card, rowIndex: targetRowIndex, timestamp: Date.now() });
        this.broadcastState();
        
        setTimeout(() => {
          this.status.resolvingCardIndex!++;
          this.resolveNextCard();
        }, 1000);
      }
    }
  }

  private handleRowChoice(player: Player, rowIndex: number) {
    if (this.status.state !== GameState.WAITING_ROW_CHOICE) return;
    if (player.seatIndex !== this.status.activePlayerIndex) return;

    const sortedSubmitted = [...this.status.submittedCards]
      .filter((c): c is SubmittedCard => c !== null)
      .sort((a, b) => a.card.value - b.card.value);
    const sub = sortedSubmitted[this.status.resolvingCardIndex!];

    this.takeRow(player.seatIndex!, rowIndex, sub.card);
  }

  private takeRow(playerIndex: number, rowIndex: number, newCard: Card) {
    const row = this.status.rows[rowIndex];
    const bullheads = calculateRowBullheads(row.cards);
    
    this.status.scores[playerIndex] += bullheads;
    row.cards = [newCard];
    this.removeCardFromHand(playerIndex, newCard.value);

    this.io.emit("animation", { 
      type: 'TAKE_ROW', 
      playerIndex, 
      rowIndex, 
      card: newCard,
      scoreDelta: bullheads,
      timestamp: Date.now() 
    });
    
    this.status.state = GameState.RESOLVING;
    this.status.activePlayerIndex = null;
    this.broadcastState();

    setTimeout(() => {
      this.status.resolvingCardIndex!++;
      this.resolveNextCard();
    }, 1500);
  }

  private removeCardFromHand(playerIndex: number, cardValue: number) {
    const hand = this.hands.get(playerIndex);
    if (hand) {
      const index = hand.findIndex(c => c.value === cardValue);
      if (index !== -1) {
        hand.splice(index, 1);
        this.status.handCounts[playerIndex] = hand.length;
      }
    }
  }

  private endRound() {
    this.scoreHistory.push([...this.status.scores]);
    this.status.submittedCards = Array(this.status.maxPlayers).fill(null);
    this.status.resolvingCardIndex = null;
    
    if (this.status.round >= 10) {
      this.endGame();
    } else {
      this.status.round++;
      this.beginSelectionPhase();
    }
  }

  private endGame() {
    this.status.state = GameState.GAME_END;
    const minScore = Math.min(...this.status.scores);
    this.status.winners = this.status.scores
      .map((s, i) => s === minScore ? i : -1)
      .filter(i => i !== -1);
    this.broadcastState();
  }

  private resetToLobby() {
      this.status.state = GameState.LOBBY;
      this.status.round = 0;
      this.status.rows = [];
      this.status.scores = Array(this.status.maxPlayers).fill(0);
      this.status.handCounts = Array(this.status.maxPlayers).fill(0);
      this.status.submittedCards = Array(this.status.maxPlayers).fill(null);
      this.status.activePlayerIndex = null;
      this.status.resolvingCardIndex = null;
      this.status.winners = null;
      this.hands.clear();
      this.historyMatrix = [];
      this.boardHistory = [];
      this.scoreHistory = [];
      this.resetBotAgents();
      this.broadcastState();
  }

  private resetBotAgents() {
    for (const agent of this.botAgents.values()) {
      agent.close();
    }
    this.botAgents.clear();
  }

  private getBotAgent(seatIndex: number) {
    let agent = this.botAgents.get(seatIndex);
    if (!agent) {
      agent = new FaiAgentClient(seatIndex, this.agentConfig);
      this.botAgents.set(seatIndex, agent);
    }
    return agent;
  }

  private async getBotCardChoice(seatIndex: number, hand: Card[]) {
    const agent = this.getBotAgent(seatIndex);
    const handValues = hand.map((card) => card.value);
    const history = this.buildFaiHistory();
    const chosenValue = await agent.chooseCard(handValues, history);

    if (!handValues.includes(chosenValue)) {
      throw new Error(`Agent returned invalid card ${chosenValue}`);
    }

    return chosenValue;
  }

  private buildFaiHistory() {
    return {
      board: this.status.rows.map((row) => row.cards.map((card) => card.value)),
      scores: [...this.status.scores],
      round: Math.max(0, this.status.round - 1),
      history_matrix: this.historyMatrix.map((round) => [...round]),
      board_history: this.boardHistory.map((board) => board.map((row) => [...row])),
      score_history: this.scoreHistory.map((scores) => [...scores])
    };
  }

  private recordBoardSnapshot() {
    this.boardHistory.push(
      this.status.rows.map((row) => row.cards.map((card) => card.value))
    );
  }

  private recordRoundActions() {
    this.historyMatrix.push(
      this.status.submittedCards.map((submittedCard) => submittedCard?.card.value || 0)
    );
  }

  private findForcedRowIndex() {
    let bestRowIndex = 0;
    let bestScore = Infinity;
    let bestLength = Infinity;

    this.status.rows.forEach((row, rowIndex) => {
      const rowScore = calculateRowBullheads(row.cards);
      if (
        rowScore < bestScore ||
        (rowScore === bestScore && row.cards.length < bestLength) ||
        (rowScore === bestScore && row.cards.length === bestLength && rowIndex < bestRowIndex)
      ) {
        bestRowIndex = rowIndex;
        bestScore = rowScore;
        bestLength = row.cards.length;
      }
    });

    return bestRowIndex;
  }
}
