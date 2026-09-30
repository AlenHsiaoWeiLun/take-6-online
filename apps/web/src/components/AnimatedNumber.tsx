import { useEffect, useRef } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

/** Counts smoothly to a new value and gives a little bump when it goes up. */
export function AnimatedNumber({ value, className, delay = 0, from }: { value: number; className?: string; delay?: number; from?: number }) {
  const mv = useMotionValue(from ?? value);
  const text = useTransform(mv, (v) => Math.round(v).toString());
  const prev = useRef(value);
  const up = value > prev.current;

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.7, ease: 'easeOut', delay });
    prev.current = value;
    return () => controls.stop();
  }, [value, mv, delay]);

  return (
    <motion.span
      key={up ? value : 'still'}
      className={className}
      initial={up ? { scale: 1.6, color: '#ff6b6b' } : false}
      animate={{ scale: 1, color: 'currentColor' }}
      transition={{ type: 'spring', stiffness: 500, damping: 14, delay }}
      style={{ display: 'inline-block' }}
    >
      <motion.span>{text}</motion.span>
    </motion.span>
  );
}
