import { chooseBotCard, chooseBotRow, type BotContext, type Row } from '@take6/shared';
import { env } from './env';
import { FaiAgentClient, getFaiAgentConfig, type FaiAgentHistory } from './fai-agent-client';

export type FaiHistory = FaiAgentHistory;

export interface BotBrain {
  chooseCard(seatIndex: number, ctx: BotContext, history: FaiHistory): Promise<number>;
  chooseBuiltin(ctx: BotContext): number;
  chooseRow(rows: Row[]): number;
  reset(players: number): void;
  close(): void;
}

class BuiltinBrain implements BotBrain {
  async chooseCard(_seat: number, ctx: BotContext, _history?: FaiHistory) {
    return chooseBotCard(ctx);
  }
  chooseBuiltin(ctx: BotContext) {
    return chooseBotCard(ctx);
  }
  chooseRow(rows: Row[]) {
    return chooseBotRow(rows);
  }
  reset() {}
  close() {}
}

/** Delegates card choice to a Python agent from the FAI project; falls back to the built-in bot on any error. */
class FaiBrain extends BuiltinBrain {
  private readonly config = getFaiAgentConfig();
  private clients = new Map<number, FaiAgentClient>();

  async chooseCard(seat: number, ctx: BotContext, history: FaiHistory) {
    const hand = ctx.hand.map((c) => c.value);
    try {
      let client = this.clients.get(seat);
      if (!client) {
        client = new FaiAgentClient(seat, this.config);
        this.clients.set(seat, client);
      }
      const value = await client.chooseCard(hand, history);
      if (hand.includes(value)) return value;
      throw new Error(`agent returned ${value}, not in hand`);
    } catch (error) {
      console.warn(`[bots] FAI agent failed for seat ${seat}, using builtin bot:`, (error as Error).message);
      return chooseBotCard(ctx);
    }
  }
  reset() {
    this.close();
  }
  close() {
    for (const c of this.clients.values()) c.close();
    this.clients.clear();
  }
}

export const createBotBrain = (): BotBrain => (env.botEngine === 'fai' ? new FaiBrain() : new BuiltinBrain());
