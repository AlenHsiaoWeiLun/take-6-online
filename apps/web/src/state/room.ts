import { useEffect, useRef, useState } from 'react';
import type { Card, PlayedCard, RoomSnapshot } from '@take6/shared';
import { useSession } from './session';

/** One line of the round log, built from the server's event stream. */
export type LogEntry =
  | { id: number; hand: number; turn: number; kind: 'reveal'; played: PlayedCard[] }
  | { id: number; hand: number; turn: number; kind: 'place'; playerId: string; card: Card; row: number }
  | { id: number; hand: number; turn: number; kind: 'take'; playerId: string; card: Card; row: number; penalty: number; forced: boolean };

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
  const [ratings, setRatings] = useState<Record<string, { rating: number; delta: number }>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const lastLogged = useRef<number | null>(null);
  const clockOffset = useRef(0);

  useEffect(() => {
    if (!socket) return;
    const onState = (snap: RoomSnapshot) => {
      if (snap.room.code !== code) return;
      clockOffset.current = snap.room.serverNow - Date.now();
      setSnapshot(snap);
      if (snap.room.phase !== 'gameEnd') setRatings((prev) => (Object.keys(prev).length ? {} : prev));
      const e = snap.room.lastEvent;
      if (e && e.id !== lastLogged.current) {
        lastLogged.current = e.id;
        const at = { id: e.id, hand: snap.room.handNumber, turn: snap.room.turn };
        if (e.type === 'deal' && snap.room.handNumber === 1) setLog([]);
        if (e.type === 'reveal') setLog((l) => [...l, { ...at, kind: 'reveal', played: snap.room.played }]);
        if (e.type === 'place') setLog((l) => [...l, { ...at, kind: 'place', playerId: e.playerId, card: e.card, row: e.row }]);
        if (e.type === 'take')
          setLog((l) => [...l, { ...at, kind: 'take', playerId: e.playerId, card: e.card, row: e.row, penalty: e.penalty, forced: e.forced }]);
      }
    };
    const onEmote = (e: { playerId: string; emote: string }) => {
      const key = Date.now() + Math.random();
      setEmotes((prev) => [...prev.filter((x) => x.playerId !== e.playerId), { key, ...e }]);
      setTimeout(() => setEmotes((prev) => prev.filter((x) => x.key !== key)), 2600);
    };
    const onClosed = ({ reason }: { reason: string }) => setClosedReason(reason);
    socket.on('room:ratings', setRatings);
    socket.on('room:state', onState);
    socket.on('room:emote', onEmote);
    socket.on('room:closed', onClosed);
    return () => {
      socket.off('room:state', onState);
      socket.off('room:emote', onEmote);
      socket.off('room:closed', onClosed);
      socket.off('room:ratings', setRatings);
    };
  }, [socket, code]);

  useEffect(() => {
    if (!socket || !connected || closedReason) return;
    socket.emit('room:join', { code }, (res) => setError(res.ok ? null : res.error));
  }, [socket, connected, code, closedReason]);

  return { snapshot, error, closedReason, emotes, clockOffset, ratings, log };
}
