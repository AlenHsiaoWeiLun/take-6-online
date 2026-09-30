import { useEffect, useState, type MutableRefObject } from 'react';

/** Seconds remaining until a server deadline, corrected for clock skew. */
export function useCountdown(deadline: number | null, offset: MutableRefObject<number>) {
  const compute = () => (deadline ? Math.max(0, (deadline - (Date.now() + offset.current)) / 1000) : null);
  const [left, setLeft] = useState(compute);
  useEffect(() => {
    setLeft(compute());
    if (!deadline) return;
    const t = setInterval(() => setLeft(compute()), 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);
  return left;
}
