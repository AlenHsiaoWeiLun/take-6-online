import { motion } from 'framer-motion';
import { makeCard } from '@take6/shared';
import { CardBack, GameCard } from './GameCard';

/**
 * Loading state that belongs to the game: three cards drop into a row one by one,
 * then a fourth, face-down card hops along above them looking for its slot.
 */
export function CardLoader({ label }: { label?: string }) {
  const cards = [22, 35, 51].map(makeCard);
  const w = 46;
  const loop = { repeat: Infinity, repeatDelay: 0.6 };
  return (
    <div className="flex flex-col items-center" role="status" aria-live="polite">
      <div className="relative" style={{ width: w * 4 + 18, height: w * 1.4 + 70 }}>
        <div className="absolute bottom-0 left-0 flex gap-1.5">
          {cards.map((c, i) => (
            <motion.div
              key={c.value}
              initial={{ y: -90, opacity: 0, rotate: -12 }}
              animate={{ y: [-90, 0, 0, 0], opacity: [0, 1, 1, 0], rotate: [-12, 0, 0, 0], scale: [1, 1, 1, 0.9] }}
              transition={{ duration: 2.6, times: [0, 0.12, 0.85, 1], delay: i * 0.18, ease: 'easeOut', ...loop }}
            >
              <GameCard card={c} width={w} />
            </motion.div>
          ))}
          <div className="slot" style={{ width: w, height: w * 1.4, borderColor: 'rgb(229 72 77 / .5)' }} />
        </div>
        <motion.div
          className="absolute left-0 top-0"
          animate={{ x: [0, w * 1.2, w * 2.3, w * 3.2, w * 3.2], y: [0, -14, 0, -14, 34], rotate: [0, 8, -6, 8, 0] }}
          transition={{ duration: 2.6, times: [0.1, 0.35, 0.55, 0.75, 0.9], ease: 'easeInOut', ...loop }}
        >
          <div className="relative">
            <CardBack width={w} />
            <span className="absolute inset-0 grid place-items-center font-display text-2xl font-extrabold text-white/90">?</span>
          </div>
        </motion.div>
      </div>
      {label && <p className="mt-5 font-display text-lg font-bold text-mist">{label}</p>}
    </div>
  );
}
