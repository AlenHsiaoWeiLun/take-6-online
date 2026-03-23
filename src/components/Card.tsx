import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '../shared/types';
import { BullHeadIcon } from './Icons';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  card?: CardType;
  isBack?: boolean;
  isSelected?: boolean;
  isResolving?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  card, 
  isBack = false, 
  isSelected = false, 
  isResolving = false,
  onClick,
  className
}) => {
  if (isBack) {
    return (
      <motion.div
        whileHover={onClick ? { y: -10, scale: 1.05 } : {}}
        onClick={onClick}
        className={cn(
          "relative w-12 h-16 xs:w-14 xs:h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-34 rounded-lg border-2 border-indigo-400 bg-indigo-800 flex items-center justify-center cursor-pointer shadow-[4px_4px_0px_rgba(79,70,229,0.3)] min-w-0 min-h-0 overflow-hidden",
          className
        )}
      >
        <div className="absolute inset-1 border border-dashed border-indigo-300 opacity-20 rounded-md pointer-events-none z-20"></div>
        <BullHeadIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-indigo-300 opacity-80" color="currentColor" />
      </motion.div>
    );
  }

  if (!card) return null;

  const getCardStyles = (val: number) => {
    if (val === 55) return {
      bg: "bg-purple-800",
      border: "border-purple-400",
      shadow: "shadow-[4px_4px_0px_rgba(168,85,247,0.3)]",
      text: "text-purple-100",
    };
    if (val % 11 === 0) return {
      bg: "bg-rose-700",
      border: "border-rose-400",
      shadow: "shadow-[4px_4px_0px_rgba(244,63,94,0.3)]",
      text: "text-rose-100",
    };
    if (val % 10 === 0) return {
      bg: "bg-amber-600",
      border: "border-amber-300",
      shadow: "shadow-[4px_4px_0px_rgba(245,158,11,0.3)]",
      text: "text-amber-100",
    };
    if (val % 5 === 0) return {
      bg: "bg-sky-600",
      border: "border-sky-300",
      shadow: "shadow-[4px_4px_0px_rgba(14,165,233,0.3)]",
      text: "text-sky-100",
    };
    return {
      bg: "bg-slate-200",
      border: "border-slate-400",
      shadow: "shadow-[4px_4px_0px_rgba(0,0,0,0.2)]",
      text: "text-slate-800",
    };
  };

  const styles = getCardStyles(card.value);
  const isDark = card.bullheads > 1;

  return (
    <motion.div
      layoutId={`card-${card.value}`}
      whileHover={onClick ? { y: -10, scale: 1.05, zIndex: 50 } : {}}
      animate={isResolving ? { scale: 1.1, boxShadow: "0 0 25px rgba(255,255,255,0.6)" } : {}}
      onClick={onClick}
      className={cn(
        "relative w-12 h-16 xs:w-14 xs:h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 lg:w-24 lg:h-34 rounded-lg border-2 flex flex-col items-center justify-between p-1 sm:p-2 cursor-pointer transition-all min-w-0 min-h-0 overflow-hidden",
        styles.bg,
        styles.border,
        styles.shadow,
        styles.text,
        isSelected ? "ring-4 ring-yellow-400 -translate-y-4 z-40" : "",
        className
      )}
    >
      {/* Top Value and Bullheads */}
      <div className="w-full flex justify-between items-start z-10 shrink-0">
        <span className="text-[8px] xs:text-[10px] sm:text-xs font-bold font-mono opacity-90 leading-none">{card.value}</span>
        <div className="flex flex-wrap gap-0.5 justify-end max-w-[40%]">
          {Array.from({ length: card.bullheads }).map((_, i) => (
            <div key={i}>
              <BullHeadIcon className="w-1 h-1 xs:w-1.5 xs:h-1.5 sm:w-2 sm:h-2 opacity-80" color={isDark ? "white" : "#1e293b"} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Center Value */}
      <div className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-black font-mono tracking-tighter z-10 drop-shadow-md leading-none flex-1 flex items-center justify-center">
        {card.value}
      </div>

      {/* Bottom Bullheads */}
      <div className="w-full flex justify-center flex-wrap gap-0.5 sm:gap-1 z-10 shrink-0 pb-0.5 sm:pb-1">
        {Array.from({ length: card.bullheads }).map((_, i) => (
          <div key={i}>
            <BullHeadIcon className="w-1.5 h-1.5 xs:w-2 xs:h-2 sm:w-3 sm:h-3 opacity-80" color={isDark ? "white" : "#1e293b"} />
          </div>
        ))}
      </div>

      {/* Inner Border */}
      <div className="absolute inset-1 border border-dashed border-current opacity-20 rounded-md pointer-events-none z-20"></div>
    </motion.div>
  );
};
