import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { User } from '@supabase/supabase-js';
import type { ClientToServerEvents, ServerToClientEvents, SessionInfo } from '@take6/shared';
import { config } from '../lib/config';
import { supabase } from '../lib/supabase';
import { guestId, storage } from '../lib/storage';
import { api, type ServerConfig } from '../lib/api';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface LocalProfile {
  name: string;
  avatar: string;
  cardTheme: string;
}

interface SessionContextValue {
  socket: GameSocket | null;
  connected: boolean;
  session: SessionInfo;
  user: User | null;
  authReady: boolean;
  authEnabled: boolean;
  serverConfig: ServerConfig | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<LocalProfile>) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const PROFILE_KEY = 'take6.profile';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const local = useRef<LocalProfile>(storage.get(PROFILE_KEY, { name: '', avatar: 'bruno', cardTheme: 'classic' }));
  const [session, setSession] = useState<SessionInfo>({
    isGuest: true,
    isPlus: false,
    name: local.current.name,
    avatar: local.current.avatar,
    cardTheme: local.current.cardTheme,
  });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    api<ServerConfig>('/api/config').then(setServerConfig).catch(() => setServerConfig(null));
  }, []);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!authReady) return;
    const s: GameSocket = io(config.serverUrl, {
      transports: ['websocket', 'polling'],
      // Evaluated on every (re)connect, so refreshed access tokens are picked up automatically.
      auth: async (cb) => {
        const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null;
        cb({ token, guestId: guestId(), ...local.current });
      },
    });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('session', (info) => {
      setSession(info);
      if (info.isGuest) {
        local.current = { name: info.name, avatar: info.avatar, cardTheme: info.cardTheme };
        storage.set(PROFILE_KEY, local.current);
      }
    });
    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.close();
      setConnected(false);
    };
  }, [authReady, userId]);

  const updateProfile = useCallback(
    (patch: Partial<LocalProfile>) => {
      local.current = { ...local.current, ...patch };
      storage.set(PROFILE_KEY, local.current);
      setSession((prev) => ({ ...prev, ...patch }));
      socket?.emit('profile:update', patch);
    },
    [socket],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      socket,
      connected,
      session,
      user,
      authReady,
      authEnabled: !!supabase,
      serverConfig,
      updateProfile,
      signInWithGoogle: async () => {
        await supabase?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
      },
      signInWithEmail: async (email: string) => {
        if (!supabase) return;
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase?.auth.signOut();
      },
    }),
    [socket, connected, session, user, authReady, serverConfig, updateProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/** Emits with an ack and resolves to the server's answer (or a timeout error). */
export function request<T>(socket: GameSocket | null, emit: (s: GameSocket, ack: (r: T) => void) => void, timeoutMs = 8000) {
  return new Promise<T>((resolve, reject) => {
    if (!socket?.connected) return reject(new Error('Not connected to the game server yet.'));
    const timer = setTimeout(() => reject(new Error('The server took too long to respond.')), timeoutMs);
    emit(socket, (r) => {
      clearTimeout(timer);
      resolve(r);
    });
  });
}
