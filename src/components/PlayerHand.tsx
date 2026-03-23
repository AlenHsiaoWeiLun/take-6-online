import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store/GameContext';
import { Card } from './Card';

export const PlayerHand: React.FC = () => {
  const { state, selectCard } = useGame();
  
  if (state.mySeatIndex === null || state.state === 'LOBBY') return null;

  const isMyTurn = state.state === 'SELECTING' && !state.submittedCards[state.mySeatIndex];
  const mySubmittedCard = state.submittedCards[state.mySeatIndex];

  return (
    <div className="w-full h-full flex flex-col items-center justify-end px-2 sm:px-8 pb-1 sm:pb-2 overflow-hidden">
      <div className="relative flex flex-col items-center w-full max-w-5xl h-full min-h-0">
        {isMyTurn && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-indigo-300 text-[7px] sm:text-[9px] font-black tracking-[0.2em] uppercase bg-indigo-500/20 px-3 py-0.5 rounded-full border border-indigo-500/30 backdrop-blur-xl shadow-2xl mb-1 shrink-0 z-50"
          >
            Your Turn: Select a card
          </motion.div>
        )}

        <div className="flex -space-x-3 xs:-space-x-4 sm:-space-x-5 md:-space-x-6 lg:-space-x-8 hover:space-x-1 sm:hover:space-x-2 transition-all duration-500 flex-1 min-h-[60px] xs:min-h-[80px] sm:min-h-[100px] md:min-h-[120px] items-end pb-2 w-full px-4 overflow-x-auto custom-scrollbar justify-start sm:justify-center">
          {state.myHand.map((card, index) => {
            const isSubmitted = mySubmittedCard?.card.value === card.value;
            const isOnTable = state.rows.some(row => row.cards.some(c => c.value === card.value));
            
            // Hide the card in hand if it has been submitted or is already on the table
            if (isSubmitted || isOnTable) {
              return null;
            }
            
            return (
              <motion.div
                key={card.value}
                initial={{ y: 30, opacity: 0 }}
                animate={{ 
                  y: 0, 
                  opacity: 1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative h-[65%] xs:h-[75%] sm:h-[85%] md:h-[95%] aspect-[5/7] shrink-0"
              >
                <Card 
                  card={card} 
                  onClick={isMyTurn ? () => selectCard(card.value) : undefined}
                  className={cn(
                    "w-full h-full min-w-0 min-h-0 hover:z-50 shadow-2xl",
                    !isMyTurn && "brightness-75 saturate-[0.8]"
                  )}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
