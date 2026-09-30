import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { PublicPlayer } from '@take6/shared';
import { Avatar } from '../components/Avatar';
import { GameCard } from '../components/GameCard';
import { Bullhead, IconClose } from '../art/icons';
import type { LogEntry } from '../state/room';
import { useT } from '../i18n';

/** Side drawer: who played what, where it went, and why someone took a row. */
export function RoundLog({
  open,
  onClose,
  log,
  players,
  selfId,
}: {
  open: boolean;
  onClose: () => void;
  log: LogEntry[];
  players: PublicPlayer[];
  selfId: string | null;
}) {
  const t = useT();
  const byId = new Map(players.map((p) => [p.id, p]));
  const name = (id: string) => (id === selfId ? t('You') : byId.get(id)?.name ?? '?');
  const turns = [...new Set(log.map((e) => `${e.hand}:${e.turn}`))].reverse();

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex justify-end bg-ink-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.aside
            className="flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-ink-900"
            initial={{ x: 60 }}
            animate={{ x: 0 }}
            exit={{ x: 60 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            aria-label={t('Round log')}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <h2 className="font-display text-lg font-bold">{t('Round log')}</h2>
              <button onClick={onClose} className="rounded-lg p-2 text-fog hover:bg-white/5 hover:text-white" aria-label={t('Close')}>
                <IconClose size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
              {turns.length === 0 && <p className="text-sm text-fog">{t('Nothing yet — the log fills in as cards are played.')}</p>}
              {turns.map((key) => {
                const entries = log.filter((e) => `${e.hand}:${e.turn}` === key);
                const [hand, turn] = key.split(':');
                return (
                  <section key={key}>
                    <h3 className="eyebrow">
                      {hand !== '1' && `${t('Hand {n}', { n: hand })} · `}
                      {t('Turn {n}/{total}', { n: turn, total: 10 })}
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {entries.map((e) => (
                        <Fragment key={e.id}>
                          {e.kind === 'reveal' && (
                            <li className="flex flex-wrap items-center gap-1.5 text-mist">
                              {e.played.map((p) => (
                                <span key={p.card.value} className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] py-0.5 pl-0.5 pr-1.5 text-xs">
                                  <GameCard card={p.card} width={20} /> {name(p.playerId)}
                                </span>
                              ))}
                            </li>
                          )}
                          {e.kind === 'place' && (
                            <li className="flex items-center gap-2 text-mist">
                              <Avatar id={byId.get(e.playerId)?.avatar ?? 'bruno'} size={18} />
                              {t('{name} · {v} → row {r}', { name: name(e.playerId), v: e.card.value, r: e.row + 1 })}
                            </li>
                          )}
                          {e.kind === 'take' && (
                            <li className="flex items-start gap-2 rounded-lg bg-bull/10 px-2 py-1.5 text-white">
                              <Avatar id={byId.get(e.playerId)?.avatar ?? 'bruno'} size={18} />
                              <span className="min-w-0 flex-1">
                                {t('{name} took row {r}', { name: name(e.playerId), r: e.row + 1 })}{' '}
                                <b className="inline-flex items-center gap-0.5 text-[#ff9ea1]">
                                  +{e.penalty} <Bullhead size={11} />
                                </b>
                                <span className="block text-xs text-mist">
                                  {e.forced
                                    ? t('{v} was lower than every row, so they chose a row to take.', { v: e.card.value })
                                    : t('{v} was the sixth card on that row.', { v: e.card.value })}
                                </span>
                              </span>
                            </li>
                          )}
                        </Fragment>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
