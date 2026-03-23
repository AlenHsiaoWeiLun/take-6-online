import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientState, GameStatus, Card, AnimationEvent } from '../shared/types';
import { auth, onAuthStateChanged, User, signInWithGoogle, logout, db } from '../firebase';
import { updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

const serverUrl = import.meta.env.VITE_SERVER_URL || undefined;

interface GameContextType {
  state: ClientState;
  socket: Socket | null;
  user: User | null;
  isAuthReady: boolean;
  joinSeat: (index: number) => void;
  leaveSeat: () => void;
  addBot: (index: number) => void;
  startGame: () => void;
  selectCard: (value: number) => void;
  chooseRow: (index: number) => void;
  sendEmote: (id: string) => void;
  resetGame: () => void;
  setMaxPlayers: (count: number) => void;
  login: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string, avatar: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [state, setState] = useState<ClientState>({
    state: 'LOBBY' as any,
    round: 0,
    rows: [],
    players: [null, null, null, null],
    scores: [0, 0, 0, 0],
    handCounts: [0, 0, 0, 0],
    submittedCards: [null, null, null, null],
    activePlayerIndex: null,
    resolvingCardIndex: null,
    winners: null,
    maxPlayers: 4,
    mySeatIndex: null,
    myHand: [],
    lastAnimationEvent: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    const sessionId = localStorage.getItem('take6_session_id');
    const newSocket = io(serverUrl, {
      auth: { 
        sessionId,
        uid: user?.uid,
        displayName: user?.displayName,
        photoURL: user?.photoURL
      }
    });

    newSocket.on('session', ({ sessionId }) => {
      localStorage.setItem('take6_session_id', sessionId);
    });

    newSocket.on('gameState', (status: GameStatus) => {
      setState(prev => {
        const myId = user?.uid || localStorage.getItem('take6_session_id');
        const mySeat = status.players.findIndex(p => p?.id === myId);
        return {
          ...prev,
          ...status,
          mySeatIndex: mySeat === -1 ? null : mySeat as any
        };
      });
    });

    newSocket.on('myHand', (hand: Card[]) => {
      setState(prev => ({ ...prev, myHand: hand }));
    });

    newSocket.on('animation', (event: AnimationEvent) => {
      setState(prev => ({ ...prev, lastAnimationEvent: event }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [isAuthReady, user]);

  const joinSeat = (index: number) => socket?.emit('joinSeat', index);
  const leaveSeat = () => socket?.emit('leaveSeat');
  const addBot = (index: number) => socket?.emit('addBot', index);
  const startGame = () => socket?.emit('startGame');
  const selectCard = (value: number) => socket?.emit('selectCard', value);
  const chooseRow = (index: number) => socket?.emit('chooseRow', index);
  const sendEmote = (id: string) => socket?.emit('emote', id);
  const resetGame = () => socket?.emit('resetGame');
  const setMaxPlayers = (count: number) => socket?.emit('setMaxPlayers', count);
  const login = async () => { await signInWithGoogle(); };
  const signOut = async () => { await logout(); };

  const updateProfile = async (name: string, avatar: string) => {
    if (!user) return;
    
    // Update Firebase Auth
    await firebaseUpdateProfile(user, {
      displayName: name,
      photoURL: avatar
    });

    // Update Firestore
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      displayName: name,
      photoURL: avatar
    });

    // Update Socket
    socket?.emit('updateProfile', { name, avatar });
    
    // Force local state update for user
    setUser({ ...user, displayName: name, photoURL: avatar } as User);
  };

  return (
    <GameContext.Provider value={{ 
      state, socket, user, isAuthReady, joinSeat, leaveSeat, addBot, startGame, selectCard, chooseRow, sendEmote, resetGame, setMaxPlayers, login, signOut, updateProfile
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
