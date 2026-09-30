import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { makeCard, type PublicRoomSummary } from '@take6/shared';
import { HeroArt } from '../art/Illustrations';
import { IconArrowRight, IconSparkle, IconTakeRow } from '../art/icons';
import { AdSlot } from '../components/AdSlot';
import { GameCard } from '../components/GameCard';
import { request, useSession } from '../state/session';
import { api } from '../lib/api';
import { BRAND } from '../brand';
import { useLang } from '../i18n';

export function Home() {
  const { socket, connected, session } = useSession();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openRooms, setOpenRooms] = useState<PublicRoomSummary[]>([]);
  const { t, lang } = useLang();

  useEffect(() => {
    let alive = true;
    const load = () => api<{ rooms: PublicRoomSummary[] }>('/api/rooms').then((r) => alive && setOpenRooms(r.rooms)).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const go = async (kind: string, run: () => Promise<{ ok: true; code: string } | { ok: false; error: string }>) => {
    setBusy(kind);
    setError(null);
    try {
      const res = await run();
      if (res.ok) navigate(`/play/${res.code}`);
      else setError(t(res.error));
    } catch (e) {
      setError(t((e as Error).message));
    } finally {
      setBusy(null);
    }
  };

  const quick = (vsBots: boolean) =>
    go(vsBots ? 'bots' : 'online', () => request(socket, (s, ack) => s.emit('room:quickplay', { vsBots }, ack)));
  const create = () => go('create', () => request(socket, (s, ack) => s.emit('room:create', { isPublic: false }, ack)));
  const join = (c: string) => go('join', () => request(socket, (s, ack) => s.emit('room:join', { code: c }, ack)));

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-10 md:grid-cols-[1.05fr_1fr] md:pt-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {lang === 'zh' ? (
              <>別拿到<br /><span className="text-bull">第六張</span>牌。</>
            ) : (
              <>Don’t take the <span className="text-bull">sixth</span> card.</>
            )}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-mist">{t('2–10 players. Learn it in 5 minutes. Then start ruining your friends.')}</p>

          {/* Friends are the front door: create or join, nothing else competing for attention. */}
          <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
            <button className="btn btn-primary btn-lg !py-4 !text-lg" disabled={!connected || !!busy} onClick={create}>
              {busy === 'create' ? t('Dealing…') : t('Create room')}
            </button>
            {joining ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.trim().length === 4) join(code.trim().toUpperCase());
                }}
              >
                <input
                  autoFocus
                  className="input !px-2 text-center font-display text-xl font-bold uppercase tracking-[0.25em] placeholder:tracking-[0.12em]"
                  placeholder={t('CODE')}
                  value={code}
                  maxLength={4}
                  onChange={(e) => setCode(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())}
                  aria-label={t('Room code')}
                />
                <button className="btn btn-ghost !px-3" disabled={code.length !== 4 || !connected || !!busy} aria-label={t('Join room')}>
                  <IconArrowRight size={18} />
                </button>
              </form>
            ) : (
              <button className="btn btn-ghost btn-lg !py-4 !text-lg" disabled={!connected} onClick={() => setJoining(true)}>
                {t('Join room')}
              </button>
            )}
          </div>
          <p className="mt-4 text-sm text-fog">
            {t('Alone?')}{' '}
            <button className="font-semibold text-mist underline decoration-white/20 underline-offset-4 hover:text-white" disabled={!connected || !!busy} onClick={() => quick(true)}>
              {busy === 'bots' ? t('Dealing…') : t('Practise vs bots')}
            </button>{' '}
            ·{' '}
            <button className="font-semibold text-mist underline decoration-white/20 underline-offset-4 hover:text-white" disabled={!connected || !!busy} onClick={() => quick(false)}>
              {busy === 'online' ? t('Finding…') : t('Match with strangers')}
            </button>
          </p>
          {!connected && <p className="mt-3 text-sm text-fog">{t('Connecting to the game server…')}</p>}
          {error && <p className="mt-3 text-sm text-bull">{error}</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <HeroArt />
        </motion.div>
      </section>

      {openRooms.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold">{t('Open tables')}</h2>
            <span className="text-sm text-fog">{t('{n} waiting for players', { n: openRooms.length })}</span>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {openRooms.map((r) => (
              <button key={r.code} onClick={() => join(r.code)} className="panel flex items-center justify-between p-4 text-left transition hover:bg-white/6">
                <div>
                  <div className="font-semibold">{t('{name}’s table', { name: r.hostName })}</div>
                  <div className="text-sm text-fog">{r.mode === 'classic' ? t('Race to 66') : t('Quick game')} · {t('{n}/{max} players', { n: r.players, max: r.maxPlayers })}</div>
                </div>
                <span className="chip">{t('Join')} <IconArrowRight size={12} /></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4">
        <AdSlot slot="banner" className="my-6" />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-6">
        <div className="eyebrow">{t('How it works')}</div>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t('Easy to learn. Painful to lose.')}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Step n={1} title={t('Everyone picks a card')} body={t('All players choose a card from their hand at the same time. No turns, no waiting.')}>
            <div className="flex -space-x-5">
              {[23, 67, 8].map((v, i) => (
                <div key={v} style={{ transform: `rotate(${(i - 1) * 8}deg)` }}>
                  <GameCard card={makeCard(v)} width={58} />
                </div>
              ))}
            </div>
          </Step>
          <Step n={2} title={t('Lowest card goes first')} body={t('Cards are placed in order onto the row whose last card is closest below them.')}>
            <div className="flex items-center gap-1.5">
              <GameCard card={makeCard(19)} width={46} />
              <GameCard card={makeCard(21)} width={46} />
              <IconArrowRight size={16} className="text-fog" />
              <GameCard card={makeCard(23)} width={46} className="ring-2 ring-hay" />
            </div>
          </Step>
          <Step n={3} title={t('Sixth card takes the row')} body={t('Play the sixth card on a row and you swallow all five cards — and their bullheads. Fewest bullheads wins.')}>
            <div className="flex items-center gap-2 text-bull">
              <IconTakeRow size={40} />
              <span className="font-display text-3xl font-extrabold">+11</span>
            </div>
          </Step>
        </div>
        <div className="mt-6 text-center">
          <Link to="/rules" className="text-sm font-semibold text-hay hover:underline">{t('Read the full rules →')}</Link>
        </div>
      </section>

      {!session.isPlus && (
        <section className="mx-auto mt-10 max-w-6xl px-4">
          <Link
            to="/plus"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-hay/20 bg-hay/[0.06] px-4 py-3 text-sm transition hover:bg-hay/10"
          >
            <span className="flex items-center gap-2 text-mist">
              <IconSparkle size={15} className="text-hay" />
              <span>
                <b className="text-hay">{BRAND.plus}</b> · {t('No ads. Gorgeous decks. Two exclusive bulls.')}
              </span>
            </span>
            <IconArrowRight size={16} className="shrink-0 text-hay transition group-hover:translate-x-0.5" />
          </Link>
        </section>
      )}

    </div>
  );
}

function Step({ n, title, body, children }: { n: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="panel flex flex-col p-6">
      <div className="grid h-28 place-items-center rounded-2xl bg-black/20">{children}</div>
      <div className="mt-5 flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-bull text-xs font-bold">{n}</span>
        <h3 className="font-display text-lg font-bold">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fog">{body}</p>
    </div>
  );
}
