import type { Socket } from 'socket.io';
import {
  EMOTES,
  isCharacterAllowed,
  isThemeAllowed,
  type ClientToServerEvents,
  type PublicRoomSummary,
  type ServerToClientEvents,
} from '@take6/shared';
import { cleanName, resolveIdentity, type Identity } from './auth';
import { prisma } from './db';
import { Room, type GameSummary, type IO } from './room';
import { recordGame } from './stats';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, { identity: Identity; roomCode?: string }>;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const EMOTE_IDS = new Set<string>(EMOTES.map((e) => e.id));

export class RoomManager {
  private rooms = new Map<string, Room>();
  private sockets = new Map<string, GameSocket>();

  constructor(private readonly io: IO) {
    io.use(async (socket, next) => {
      try {
        (socket as GameSocket).data.identity = await resolveIdentity(socket.handshake.auth ?? {});
        next();
      } catch (error) {
        next(error as Error);
      }
    });
    io.on('connection', (socket) => this.onConnection(socket as GameSocket));
  }

  get stats() {
    return { rooms: this.rooms.size, sockets: this.sockets.size };
  }

  publicRooms(): PublicRoomSummary[] {
    return [...this.rooms.values()]
      .filter((r) => r.settings.isPublic && r.isLobby && r.openSeats > 0 && r.humanCount > 0)
      .map((r) => ({ code: r.code, hostName: r.hostName, players: r.playerCount, maxPlayers: r.settings.maxPlayers, mode: r.settings.mode }))
      .slice(0, 30);
  }

  /** Pushes a changed identity (e.g. Plus granted by webhook) to every live socket of that user. */
  refreshUser(userId: string, patch: Partial<Identity>) {
    for (const socket of this.sockets.values()) {
      const identity = socket.data.identity;
      if (identity.userId !== userId) continue;
      Object.assign(identity, patch);
      socket.emit('session', sessionInfo(identity));
      if (socket.data.roomCode) this.rooms.get(socket.data.roomCode)?.updateIdentity(identity);
    }
  }

  private onConnection(socket: GameSocket) {
    this.sockets.set(socket.id, socket);
    socket.emit('session', sessionInfo(socket.data.identity));

    const limiter = rateLimiter(25, 1000);
    socket.use((_packet, next) => (limiter() ? next() : next(new Error('rate limited'))));
    socket.on('error', () => {});

    const room = () => (socket.data.roomCode ? this.rooms.get(socket.data.roomCode) : undefined);

    socket.on('room:create', (settings, ack) => {
      if (typeof ack !== 'function') return;
      const created = this.createRoom(settings ?? {});
      ack(this.enter(socket, created));
    });

    socket.on('room:join', (payload, ack) => {
      if (typeof ack !== 'function') return;
      const code = String(payload?.code ?? '').toUpperCase().trim();
      const target = this.rooms.get(code);
      if (!target) return ack({ ok: false, error: 'That room doesn’t exist or has closed.' });
      ack(this.enter(socket, target));
    });

    socket.on('room:quickplay', (payload, ack) => {
      if (typeof ack !== 'function') return;
      if (payload?.vsBots) {
        const solo = this.createRoom({ maxPlayers: 4, botLevel: 'normal', isPublic: false });
        const res = this.enter(socket, solo);
        if (res.ok) {
          solo.fillWithBots(4);
          solo.startBy(socket.id);
        }
        return ack(res);
      }
      const open = [...this.rooms.values()]
        .filter((r) => r.autoStart && r.isLobby && r.openSeats > 0 && r.humanCount > 0)
        .sort((a, b) => b.playerCount - a.playerCount)[0];
      ack(this.enter(socket, open ?? this.createRoom({ isPublic: true, maxPlayers: 6 }, true)));
    });

    socket.on('room:leave', () => this.leaveCurrent(socket, true));
    socket.on('room:settings', (patch) => room()?.updateSettings(socket.id, patch ?? {}));
    socket.on('room:addBot', () => room()?.addBot(socket.id));
    socket.on('room:remove', (playerId) => room()?.remove(socket.id, String(playerId)));
    socket.on('game:start', (ack) => {
      const current = room();
      const error = current ? current.startBy(socket.id) : 'You are not in a room.';
      if (typeof ack === 'function') ack(error ? { ok: false, error } : { ok: true });
    });
    socket.on('game:play', (value) => room()?.play(socket.id, Number(value)));
    socket.on('game:chooseRow', (row) => room()?.chooseRow(socket.id, Number(row)));
    socket.on('game:rematch', () => room()?.rematch(socket.id));

    let lastEmote = 0;
    socket.on('game:emote', (emote) => {
      if (!EMOTE_IDS.has(emote) || Date.now() - lastEmote < 1500) return;
      lastEmote = Date.now();
      room()?.emote(socket.id, emote);
    });

    socket.on('profile:update', async (profile) => {
      const identity = socket.data.identity;
      if (profile?.name !== undefined) identity.name = cleanName(profile.name, identity.name);
      if (profile?.avatar && isCharacterAllowed(profile.avatar, identity.isPlus)) identity.avatar = profile.avatar;
      if (profile?.cardTheme && isThemeAllowed(profile.cardTheme, identity.isPlus)) identity.cardTheme = profile.cardTheme;
      if (identity.userId && prisma) {
        await prisma.profile
          .update({
            where: { id: identity.userId },
            data: { displayName: identity.name, avatar: identity.avatar, cardTheme: identity.cardTheme },
          })
          .catch((e) => console.error('[profile] update failed', e));
      }
      socket.emit('session', sessionInfo(identity));
      room()?.updateIdentity(identity);
    });

    socket.on('disconnect', () => {
      this.leaveCurrent(socket, false);
      this.sockets.delete(socket.id);
    });
  }

  private enter(socket: GameSocket, room: Room): { ok: true; code: string } | { ok: false; error: string } {
    if (socket.data.roomCode === room.code && room.hasSocket(socket.id)) return { ok: true, code: room.code };
    this.leaveCurrent(socket, true);
    const result = room.join(socket.id, socket.data.identity);
    if (!result.ok) return result;
    socket.data.roomCode = room.code;
    void socket.join(room.code);
    return { ok: true, code: room.code };
  }

  private leaveCurrent(socket: GameSocket, explicit: boolean) {
    const code = socket.data.roomCode;
    if (!code) return;
    socket.data.roomCode = undefined;
    void socket.leave(code);
    this.rooms.get(code)?.detach(socket.id, explicit);
  }

  private createRoom(settings: Parameters<typeof Room.prototype.updateSettings>[1], autoStart = false) {
    let code = '';
    do {
      code = Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
    } while (this.rooms.has(code));
    const room = new Room(
      this.io,
      code,
      settings,
      {
        onGameEnd: (summary: GameSummary) => void recordGame(summary),
        onClose: (closed) => this.rooms.delete(closed.code),
      },
      { autoStart },
    );
    this.rooms.set(code, room);
    return room;
  }
}

const sessionInfo = (identity: Identity) => ({
  isGuest: identity.isGuest,
  isPlus: identity.isPlus,
  name: identity.name,
  avatar: identity.avatar,
  cardTheme: identity.cardTheme,
});

function rateLimiter(max: number, windowMs: number) {
  let count = 0;
  let windowStart = Date.now();
  return () => {
    const now = Date.now();
    if (now - windowStart > windowMs) {
      windowStart = now;
      count = 0;
    }
    return ++count <= max;
  };
}
