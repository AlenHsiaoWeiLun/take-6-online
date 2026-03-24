import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store/GameContext';
import { Card } from './Card';
import { calculateRowBullheads } from '../shared/game-logic';
import { BullHeadIcon } from './Icons';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GameTable: React.FC = () => {
  const { state, chooseRow } = useGame();
  const isChoosing = state.state === 'WAITING_ROW_CHOICE' && state.mySeatIndex === state.activePlayerIndex;

  return (
    <div className="table-surface relative w-full h-full max-w-6xl max-h-full rounded-[2rem] border border-white/8 p-2 sm:p-4 flex flex-col justify-center gap-1 sm:gap-2 backdrop-blur-sm overflow-hidden">
      {state.rows.map((row, rowIndex) => {
        const isJustTaken = state.lastAnimationEvent?.type === 'TAKE_ROW' && 
                            state.lastAnimationEvent.rowIndex === rowIndex && 
                            Date.now() - state.lastAnimationEvent.timestamp < 2000;

        return (
        <div key={rowIndex} className="relative flex items-center gap-1 sm:gap-2 md:gap-4 group flex-1 min-h-[50px] xs:min-h-[60px] sm:min-h-[80px] md:min-h-[100px] lg:min-h-[120px] max-h-[140px] py-1">
          {/* Row Indicator */}
          <div className={cn(
            "w-6 h-8 xs:w-7 h-10 sm:w-10 sm:h-14 md:w-12 md:h-18 lg:w-14 lg:h-20 rounded-lg border flex flex-col items-center justify-center gap-0.5 shadow-xl shrink-0 relative overflow-hidden transition-colors duration-500",
            isJustTaken ? "bg-red-500/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-slate-950 border-slate-800"
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <BullHeadIcon className={cn("w-1.5 h-1.5 xs:w-2 xs:h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 transition-colors duration-500", isJustTaken ? "text-red-400" : "text-slate-600")} />
            <span className={cn("text-[5px] xs:text-[6px] sm:text-[8px] md:text-[10px] font-black font-mono tracking-tighter transition-colors duration-500", isJustTaken ? "text-red-400" : "text-slate-500")}>{calculateRowBullheads(row.cards)}</span>
          </div>

          <div className={cn(
            "flex-1 flex items-center gap-0.5 xs:gap-1 sm:gap-2 h-full rounded-xl p-1 sm:p-2 border shadow-inner transition-colors duration-500",
            isJustTaken ? "bg-red-500/10 border-red-500/30" : "bg-slate-950/10 border-slate-800/20"
          )}>
            <AnimatePresence mode="popLayout">
              {row.cards.map((card, cardIndex) => {
                const isBeingPlaced = state.state === 'RESOLVING' && 
                                      state.lastAnimationEvent?.type === 'PLACE_CARD' && 
                                      state.lastAnimationEvent.rowIndex === rowIndex && 
                                      state.lastAnimationEvent.card?.value === card.value;

                if (isBeingPlaced) return null;

                return (
                  <motion.div
                    key={`${rowIndex}-${card.value}`}
                    initial={{ x: -20, opacity: 0, scale: 0.8 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="h-full aspect-[5/7] max-w-[35px] xs:max-w-[45px] sm:max-w-[65px] md:max-w-[85px] lg:max-w-[100px] shrink-0"
                  >
                    <Card card={card} className="w-full h-full min-w-0 min-h-0" />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Row Selection Overlay */}
          {isChoosing && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.02, backgroundColor: "rgba(250,204,21,0.1)" }}
              onClick={() => chooseRow(rowIndex)}
              className="absolute inset-0 z-30 sketch-border border-4 border-dashed border-yellow-400 bg-yellow-400/10 flex items-center justify-center cursor-pointer"
            >
              <span className="bg-yellow-400 text-slate-900 px-6 py-2 sketch-border border-2 border-slate-900 text-sm font-black shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
                CHOOSE THIS ROW
              </span>
            </motion.button>
          )}

          {/* Row Highlight for Resolving */}
          {state.state === 'RESOLVING' && state.resolvingCardIndex !== null && (
            // Logic to highlight target row would go here
            null
          )}
        </div>
        );
      })}

      {/* Stage for Revealed/Resolving Cards */}
      <AnimatePresence>
        {(state.state === 'REVEALING' || state.state === 'RESOLVING') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-wrap justify-center gap-6 max-w-4xl">
              {(() => {
                const sortedCards = [...state.submittedCards]
                  .filter(c => c !== null)
                  .sort((a, b) => a!.card.value - b!.card.value);
                  
                return sortedCards.map((sub, sortedIndex) => {
                  if (!sub) return null;
                  
                  const i = sub.playerIndex;
                  const isResolving = state.state === 'RESOLVING' && sortedIndex === state.resolvingCardIndex;
                  const isRevealing = state.state === 'REVEALING';
                  
                  // In RESOLVING state, only show the currently active card
                  if (state.state === 'RESOLVING' && !isResolving) return null;

                  return (
                    <motion.div
                      layout
                      key={`revealed-${i}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: isResolving ? 1.45 : 1.05, 
                        opacity: 1,
                        zIndex: isResolving ? 100 : 10,
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 25,
                        delay: isRevealing ? sortedIndex * 0.2 : 0
                      }}
                      className="relative flex flex-col items-center"
                    >
                      <AnimatePresence>
                        {isResolving && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute -top-24 flex flex-col items-center gap-1 bg-slate-900/95 px-5 py-2.5 rounded-2xl border-2 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.4)] z-[110] whitespace-nowrap"
                          >
                            <div className="flex items-center gap-3">
                              <img src={state.players[i]?.avatar} className="w-8 h-8 rounded-full border-2 border-indigo-400" alt="" />
                              <span className="text-sm font-black text-white tracking-tight">{state.players[i]?.name}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <Card card={sub.card} isResolving={isResolving} className="w-14 h-20 xs:w-18 xs:h-26 sm:w-24 sm:h-34 md:w-30 md:h-44 lg:w-36 lg:h-52 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
                      
                      {isRevealing && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-black text-white bg-slate-900/80 px-3 py-1 rounded-full whitespace-nowrap backdrop-blur-sm border border-white/10">
                          {state.players[i]?.name}
                        </div>
                      )}
                    </motion.div>
                  );
                });
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
