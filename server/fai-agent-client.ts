import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import readline from "readline";

export interface FaiAgentHistory {
  board: number[][];
  scores: number[];
  round: number;
  history_matrix: number[][];
  board_history: number[][][];
  score_history: number[][];
}

interface PendingRequest {
  resolve: (card: number) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface WorkerResponse {
  requestId?: number;
  card?: number;
  error?: string;
  traceback?: string;
}

export interface FaiAgentConfig {
  pythonBin: string;
  agentRoot: string;
  moduleName: string;
  className: string;
  argsJson: string;
  timeoutMs: number;
}

export const getFaiAgentConfig = (): FaiAgentConfig => ({
  pythonBin: process.env.FAI_PYTHON_BIN || "python3",
  agentRoot: path.resolve(process.cwd(), process.env.FAI_AGENT_ROOT || "2026-FAI-Final-Release-main"),
  moduleName: process.env.FAI_AGENT_MODULE || "src.players.TA.random_player",
  className: process.env.FAI_AGENT_CLASS || "RandomPlayer",
  argsJson: process.env.FAI_AGENT_ARGS || "{}",
  timeoutMs: Number(process.env.FAI_AGENT_TIMEOUT_MS || 1500)
});

export class FaiAgentClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<number, PendingRequest>();
  private requestId = 0;
  private stdoutReader: readline.Interface | null = null;
  private stderrBuffer = "";

  constructor(
    private readonly playerIndex: number,
    private readonly config: FaiAgentConfig
  ) {}

  async chooseCard(hand: number[], history: FaiAgentHistory): Promise<number> {
    this.ensureProcess();

    const requestId = ++this.requestId;
    const payload = JSON.stringify({
      type: "action",
      requestId,
      hand,
      history
    });

    return new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        this.restartProcess();
        reject(new Error(`FAI agent timed out after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      this.pending.set(requestId, { resolve, reject, timeout });
      this.process?.stdin.write(`${payload}\n`);
    });
  }

  close() {
    for (const [requestId, pending] of this.pending.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(`FAI agent ${this.playerIndex} closed before responding`));
      this.pending.delete(requestId);
    }

    this.stdoutReader?.close();
    this.stdoutReader = null;

    if (this.process && !this.process.killed) {
      this.process.kill();
    }
    this.process = null;
  }

  private ensureProcess() {
    if (this.process && !this.process.killed) {
      return;
    }

    const workerPath = path.resolve(process.cwd(), "server/fai_agent_worker.py");
    this.stderrBuffer = "";
    this.process = spawn(this.config.pythonBin, [workerPath], {
      cwd: this.config.agentRoot,
      env: {
        ...process.env,
        FAI_AGENT_MODULE: this.config.moduleName,
        FAI_AGENT_CLASS: this.config.className,
        FAI_AGENT_ARGS: this.config.argsJson,
        FAI_AGENT_PLAYER_IDX: String(this.playerIndex)
      },
      stdio: ["pipe", "pipe", "pipe"]
    });

    this.stdoutReader = readline.createInterface({ input: this.process.stdout });
    this.stdoutReader.on("line", (line) => this.handleStdoutLine(line));

    this.process.stderr.on("data", (chunk) => {
      this.stderrBuffer += chunk.toString();
    });

    this.process.on("error", (error) => {
      const errorMessage = this.stderrBuffer.trim() || error.message;
      for (const [requestId, pending] of this.pending.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error(errorMessage));
        this.pending.delete(requestId);
      }
      this.stdoutReader?.close();
      this.stdoutReader = null;
      this.process = null;
    });

    this.process.on("exit", () => {
      const errorMessage = this.stderrBuffer.trim() || `FAI agent ${this.playerIndex} exited unexpectedly`;
      for (const [requestId, pending] of this.pending.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error(errorMessage));
        this.pending.delete(requestId);
      }
      this.stdoutReader?.close();
      this.stdoutReader = null;
      this.process = null;
    });
  }

  private restartProcess() {
    this.close();
    this.ensureProcess();
  }

  private handleStdoutLine(line: string) {
    let parsed: WorkerResponse;

    try {
      parsed = JSON.parse(line) as WorkerResponse;
    } catch (error) {
      console.error("Invalid FAI agent response:", line, error);
      return;
    }

    if (parsed.requestId === undefined) {
      return;
    }

    const pending = this.pending.get(parsed.requestId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(parsed.requestId);

    if (parsed.error) {
      const detail = parsed.traceback ? `${parsed.error}\n${parsed.traceback}` : parsed.error;
      pending.reject(new Error(detail));
      return;
    }

    pending.resolve(Number(parsed.card));
  }
}
