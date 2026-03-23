import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store/GameContext';
import { getRelativePosition, COLORS } from '../shared/constants';
import { EmoteIcon, BullHeadIcon } from './Icons';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PlayerSeatProps {
  seatIndex: number;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({ seatIndex }) => {
  const { state, joinSeat, addBot, leaveSeat } = useGame();
  const player = state.players[seatIndex];
  const isMe = state.mySeatIndex === seatIndex;
  const isWaitingRowChoice = state.state === 'WAITING_ROW_CHOICE' && state.activePlayerIndex === seatIndex;
  const isSelecting = state.state === 'SELECTING' && !state.submittedCards[seatIndex];

  // Check if this player is currently resolving a card
  const isResolving = state.state === 'RESOLVING' && 
    state.resolvingCardIndex !== null && 
    [...state.submittedCards].filter(c => c !== null).sort((a, b) => a!.card.value - b!.card.value)[state.resolvingCardIndex]?.playerIndex === seatIndex;

  const [scorePopups, setScorePopups] = useState<{id: number, delta: number}[]>([]);

  useEffect(() => {
    if (state.lastAnimationEvent?.type === 'TAKE_ROW' && state.lastAnimationEvent.playerIndex === seatIndex) {
      const delta = state.lastAnimationEvent.scoreDelta || 0;
      if (delta > 0) {
        const id = Date.now();
        setScorePopups(prev => [...prev, { id, delta }]);
        setTimeout(() => {
          setScorePopups(prev => prev.filter(p => p.id !== id));
        }, 2000);
      }
    }
  }, [state.lastAnimationEvent, seatIndex]);

  if (!player) {
    return (
      <div className={cn(
        "bg-slate-900/40 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center gap-3 transition-all hover:border-slate-600",
        state.state === 'LOBBY' ? "p-6" : "p-3"
      )}>
        <div className={cn(
          "rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-600",
          state.state === 'LOBBY' ? "w-16 h-16" : "w-10 h-10"
        )}>
          <span className={cn("font-bold", state.state === 'LOBBY' ? "text-xl" : "text-[10px]")}>?</span>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => joinSeat(seatIndex)}
            className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            JOIN SEAT
          </button>
          <button
            onClick={() => addBot(seatIndex)}
            className="bg-slate-800/50 hover:bg-slate-800 text-slate-500 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            + ADD BOT
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "relative flex items-center gap-3 rounded-2xl border-2 transition-all duration-300",
        state.state === 'LOBBY' ? "p-6" : "p-3",
        isMe ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-slate-900/60 border-slate-800",
        isWaitingRowChoice && "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] ring-2 ring-yellow-400/20",
        isResolving && "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] ring-2 ring-red-500/30 bg-red-500/10"
      )}
    >
      <div className="relative">
        <div 
          className={cn(
            "rounded-full border-2 overflow-hidden bg-slate-800 shadow-inner transition-transform duration-300",
            state.state === 'LOBBY' ? "w-16 h-16" : "w-12 h-12",
            isResolving && "scale-110"
          )}
          style={{ borderColor: isResolving ? '#ef4444' : COLORS[seatIndex] }}
        >
          <img 
            src={player.avatar} 
            alt={player.name} 
            className={cn("w-full h-full object-cover", !player.isConnected && "grayscale opacity-50")}
            referrerPolicy="no-referrer" 
          />
        </div>
        
        {isSelecting && (
          <div className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-5 h-5 border-2 border-slate-400/30 border-t-slate-200 rounded-full"
            />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn(
          "font-black truncate leading-none mb-1 flex items-center gap-2",
          state.state === 'LOBBY' ? "text-lg" : "text-sm",
          isMe ? "text-indigo-300" : "text-slate-200",
          isResolving && "text-red-400"
        )}>
          {player.name}
          {isMe && (
            <span className={cn("bg-indigo-500 text-white px-1 rounded-sm font-bold tracking-tighter", state.state === 'LOBBY' ? "text-[10px]" : "text-[8px]")}>YOU</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded-lg border transition-colors",
            isResolving ? "bg-red-500/20 border-red-500/50" : "bg-slate-950/50 border-slate-800"
          )}>
            <BullHeadIcon className="w-2.5 h-2.5 text-red-500" />
            <span className={cn("font-black text-slate-300 font-mono", state.state === 'LOBBY' ? "text-sm" : "text-[10px]")}>{state.scores[seatIndex]}</span>
          </div>
          <span className={cn("font-bold text-slate-500 uppercase tracking-wider", state.state === 'LOBBY' ? "text-xs" : "text-[9px]")}>
            {state.handCounts[seatIndex]} Cards
          </span>
        </div>
      </div>

      {/* Floating Score Popups */}
      <AnimatePresence>
        {scorePopups.map(popup => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -40, scale: 1.2 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-0 right-4 flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full shadow-lg border border-red-400 z-50 pointer-events-none"
          >
            <span className="text-xs font-black">+{popup.delta}</span>
            <BullHeadIcon className="w-3 h-3" color="white" />
          </motion.div>
        ))}
      </AnimatePresence>

      {isMe && state.state === 'LOBBY' && (
        <button 
          onClick={leaveSeat}
          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
          title="Leave Seat"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      )}
    </motion.div>
  );
};
