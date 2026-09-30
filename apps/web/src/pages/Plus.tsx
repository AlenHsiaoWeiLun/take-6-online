import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CARD_THEMES, CHARACTERS, makeCard } from '@take6/shared';
import { PlusProductArt } from '../art/Illustrations';
import { Art } from '../art/Art';
import { IconCheck, IconGoogle, IconSparkle } from '../art/icons';
import { GameCard } from '../components/GameCard';
import { Avatar } from '../components/Avatar';
import { useSession } from '../state/session';
import { api, formatPrice } from '../lib/api';
import { BRAND } from '../brand';

const PERKS = [
  'No ads — anywhere, ever',
  'Three collector card styles: Midnight, Gilded and Meadow',
  'Two exclusive characters: Aurum and Nebula',
  'Gold ring on your portrait at every table',
  'Your card style shows when your cards are revealed to the table',
  'Supports ongoing development and servers',
];

export function Plus() {
  const { session, user, authEnabled, serverConfig, signInWithGoogle } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = formatPrice(serverConfig?.plusPrice) ?? '$4.99';
  const paymentsOn = !!serverConfig?.features.payments;

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>('/api/billing/checkout', { method: 'POST' });
      window.location.assign(url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <span className="chip border-hay/30 bg-hay/10 text-hay"><IconSparkle size={12} /> {BRAND.plus}</span>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
            Play <span className="text-hay">beautifully.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-fog">One payment. No subscription. Ad-free forever, with the prettiest decks on the table.</p>

          <ul className="mt-6 space-y-2.5">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-hay/15 text-hay"><IconCheck size={12} strokeWidth={3} /></span>
                <span className="text-mist">{p}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {session.isPlus ? (
              <span className="chip !px-4 !py-2 !text-sm !text-hay"><IconCheck size={14} /> You have Plus — thank you!</span>
            ) : !paymentsOn ? (
              <span className="text-sm text-fog">Plus is coming soon.</span>
            ) : user ? (
              <button className="btn btn-gold btn-lg" onClick={buy} disabled={busy}>
                {busy ? 'Opening checkout…' : `Get Plus · ${price}`}
              </button>
            ) : authEnabled ? (
              <button className="btn btn-gold btn-lg" onClick={() => signInWithGoogle()}>
                <IconGoogle /> Sign in to get Plus
              </button>
            ) : null}
            {!session.isPlus && paymentsOn && <span className="text-sm text-fog">Secure checkout by Stripe</span>}
          </div>
          {error && <p className="mt-3 text-sm text-bull">{error}</p>}
        </div>
        <PlusProductArt />
      </div>

      <section className="mt-20">
        <h2 className="font-display text-2xl font-bold">Collector card styles</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {CARD_THEMES.map((t) => (
            <div key={t.id} className="panel flex flex-col items-center p-5 text-center">
              <Art
                id={`product-theme-${t.id}`}
                alt={`${t.name} card style`}
                className="h-28 w-auto object-contain"
                fallback={
                  <div className="flex -space-x-6">
                    {[11, 55, 30].map((v, i) => (
                      <div key={v} style={{ transform: `rotate(${(i - 1) * 9}deg) translateY(${i === 1 ? -6 : 0}px)` }}>
                        <GameCard card={makeCard(v)} theme={t.id} width={64} />
                      </div>
                    ))}
                  </div>
                }
              />
              <div className="mt-4 font-semibold">{t.name}</div>
              <div className="mt-1 text-xs text-fog">{t.plus ? 'Plus' : 'Free'} · {t.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold">Exclusive characters</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {CHARACTERS.filter((c) => c.plus).map((c) => (
            <div key={c.id} className="panel flex items-center gap-4 p-5">
              <Avatar id={c.id} size={80} ring="#f5b942" />
              <div>
                <div className="font-display text-xl font-bold">{c.name}</div>
                <div className="text-sm text-fog">{c.tagline}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-12 text-center text-xs text-fog">
        Plus is a one-time purchase tied to your account. See our <Link to="/terms" className="underline">terms</Link> for refunds.
      </p>
    </div>
  );
}

export function PlusSuccess() {
  const [params] = useSearchParams();
  const { session, user } = useSession();
  const [state, setState] = useState<'checking' | 'done' | 'pending'>('checking');

  useEffect(() => {
    if (session.isPlus) return setState('done');
    const id = params.get('session_id');
    if (!id || !user) return setState('pending');
    api<{ isPlus: boolean }>(`/api/billing/verify?session_id=${encodeURIComponent(id)}`)
      .then((r) => setState(r.isPlus ? 'done' : 'pending'))
      .catch(() => setState('pending'));
  }, [params, user, session.isPlus]);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="mx-auto size-24"><Avatar id="aurum" size={96} ring="#f5b942" /></div>
      <h1 className="mt-6 font-display text-4xl font-extrabold">{state === 'checking' ? 'Confirming…' : 'Welcome to Plus!'}</h1>
      <p className="mt-3 text-fog">
        {state === 'pending'
          ? 'Your payment went through. Plus will appear on your account within a minute — refresh if it doesn’t.'
          : 'Ads are gone and every card style and character is unlocked. Pick your look from your profile.'}
      </p>
      <Link to="/" className="btn btn-gold btn-lg mt-8">Back to the table</Link>
    </div>
  );
}
