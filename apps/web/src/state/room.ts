import { useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '@take6/shared';
import { useSession } from './session';

export interface EmoteBubble {
  key: number;
  playerId: string;
  emote: string;
}

/** Joins `code` (and re-joins after reconnects) and exposes the live snapshot. */
export function useRoom(code: string) {
  const { socket, connected } = useSession();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [emotes, setEmotes] = useState<EmoteBubble[]>([]);
  const clockOffset = useRef(0);

  useEffect(() => {
    if (!socket) return;
    const onState = (snap: RoomSnapshot) => {
      if (snap.room.code !== code) return;
      clockOffset.current = snap.room.serverNow - Date.now();
      setSnapshot(snap);
    };
    const onEmote = (e: { playerId: string; emote: string }) => {
      const key = Date.now() + Math.random();
      setEmotes((prev) => [...prev.filter((x) => x.playerId !== e.playerId), { key, ...e }]);
      setTimeout(() => setEmotes((prev) => prev.filter((x) => x.key !== key)), 2600);
    };
    const onClosed = ({ reason }: { reason: string }) => setClosedReason(reason);
    socket.on('room:state', onState);
    socket.on('room:emote', onEmote);
    socket.on('room:closed', onClosed);
    return () => {
      socket.off('room:state', onState);
      socket.off('room:emote', onEmote);
      socket.off('room:closed', onClosed);
    };
  }, [socket, code]);

  useEffect(() => {
    if (!socket || !connected || closedReason) return;
    socket.emit('room:join', { code }, (res) => setError(res.ok ? null : res.error));
  }, [socket, connected, code, closedReason]);

  return { snapshot, error, closedReason, emotes, clockOffset };
}
