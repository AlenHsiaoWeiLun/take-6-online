import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { makeCard, type PublicRoomSummary } from '@take6/shared';
import { HeroArt } from '../art/Illustrations';
import { Bullhead, IconArrowRight, IconBot, IconClose, IconGlobe } from '../art/icons';
import clsx from 'clsx';
import { AdSlot } from '../components/AdSlot';
import { GameCard } from '../components/GameCard';
import { request, useSession } from '../state/session';
import { api } from '../lib/api';
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
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-8 pt-6 md:grid-cols-[1fr_1.05fr] md:gap-10 md:pt-14">
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
            <button className="btn btn-primary btn-lg flex-col !gap-0 !py-3" disabled={!connected || !!busy} onClick={create}>
              <span className="text-lg">{busy === 'create' ? t('Dealing…') : t('Create room')}</span>
              <span className="text-xs font-medium text-white/80">{t('Get a link for friends')}</span>
            </button>
            {joining ? (
              <form
                className="flex flex-col gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.trim().length === 4) join(code.trim().toUpperCase());
                }}
              >
                <label className="sr-only" htmlFor="room-code">{t('Room code')}</label>
                <div className="flex gap-1.5">
                  <input
                    id="room-code"
                    autoFocus
                    className={clsx('input !px-2 text-center font-display text-xl font-bold uppercase tracking-[0.25em] placeholder:tracking-[0.1em]', error && '!border-bull')}
                    placeholder={t('CODE')}
                    value={code}
                    maxLength={4}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'join-error' : undefined}
                    onChange={(e) => {
                      setError(null);
                      setCode(e.target.value.replace(/[^a-z]/gi, '').toUpperCase());
                    }}
                  />
                  <button className="btn btn-ghost shrink-0 !px-3" disabled={code.length !== 4 || !connected || !!busy}>
                    {busy === 'join' ? '…' : t('Join')}
                  </button>
                </div>
              </form>
            ) : (
              <button className="btn btn-ghost btn-lg flex-col !gap-0 !py-3" disabled={!connected} onClick={() => setJoining(true)}>
                <span className="text-lg">{t('Join room')}</span>
                <span className="text-xs font-medium text-fog">{t('I have a 4-letter code')}</span>
              </button>
            )}
          </div>
          {error && (
            <p id="join-error" role="alert" className="mt-2 flex max-w-md items-center gap-1.5 rounded-lg bg-bull/12 px-3 py-2 text-sm font-semibold text-[#ff9ea1]">
              <IconClose size={14} /> {error}
            </p>
          )}
          <ol className="mt-3 flex max-w-md flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mist">
            <li className="flex items-center gap-1"><b className="grid size-4 place-items-center rounded-full bg-white/10 text-[10px]">1</b> {t('Create a room')}</li>
            <IconArrowRight size={12} className="text-fog" />
            <li className="flex items-center gap-1"><b className="grid size-4 place-items-center rounded-full bg-white/10 text-[10px]">2</b> {t('Send the link (LINE works)')}</li>
            <IconArrowRight size={12} className="text-fog" />
            <li className="flex items-center gap-1"><b className="grid size-4 place-items-center rounded-full bg-white/10 text-[10px]">3</b> {t('Everyone in → Deal')}</li>
          </ol>
          <div className="mt-4 flex max-w-md flex-wrap items-center gap-2 text-sm text-fog">
            <span>{t('Alone?')}</span>
            <button className="btn btn-ghost btn-sm" disabled={!connected || !!busy} onClick={() => quick(true)}>
              <IconBot size={15} /> {busy === 'bots' ? t('Dealing…') : t('Practise vs bots')}
              <span className="font-normal text-fog">· {t('no waiting')}</span>
            </button>
            <button className="btn btn-ghost btn-sm" disabled={!connected || !!busy} onClick={() => quick(false)}>
              <IconGlobe size={15} /> {busy === 'online' ? t('Finding…') : t('Match with strangers')}
              <span className="font-normal text-fog">· {t('starts in 20s')}</span>
            </button>
          </div>
          {!connected && <p className="mt-3 text-sm text-fog">{t('Connecting to the game server…')}</p>}
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
            <div className="flex items-center gap-1">
              {[14, 17, 22, 26, 29].map((v, i) => (
                <div key={v} style={{ transform: `rotate(${i * 4 - 8}deg) translateY(${Math.abs(i - 2) * 2}px)` }}>
                  <GameCard card={makeCard(v)} width={30} />
                </div>
              ))}
              <div className="ml-1 rounded-[6px] ring-2 ring-bull">
                <GameCard card={makeCard(31)} width={34} />
              </div>
              <span className="ml-1 flex items-center gap-0.5 font-display text-xl font-extrabold text-bull">
                +9 <Bullhead size={14} />
              </span>
            </div>
          </Step>
        </div>
        <div className="mt-6 text-center">
          <Link to="/learn" className="btn btn-ghost">{t('Try the 2-minute tutorial')} <IconArrowRight size={16} /></Link>
          <Link to="/rules" className="ml-4 text-sm font-semibold text-mist hover:text-white">{t('Read the full rules →')}</Link>
        </div>
      </section>


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
