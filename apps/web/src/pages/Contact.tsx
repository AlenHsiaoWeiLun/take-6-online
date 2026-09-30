import { useState } from 'react';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { BRAND } from '../brand';
import { IconCheck, IconCopy } from '../art/icons';
import { api } from '../lib/api';
import { useSession } from '../state/session';
import { useT } from '../i18n';

const TOPICS = [
  { id: 'bug', label: 'Report a bug' },
  { id: 'idea', label: 'Suggest an idea' },
  { id: 'payment', label: 'Plus & payments' },
  { id: 'other', label: 'Something else' },
] as const;

export function Contact() {
  const t = useT();
  const { user } = useSession();
  const location = useLocation();
  const [topic, setTopic] = useState<(typeof TOPICS)[number]['id']>('bug');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | string>('idle');
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      await api('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ topic, name, email: email || user?.email, message, website, page: document.referrer || location.pathname }),
      });
      setState('sent');
    } catch (err) {
      setState(t((err as Error).message));
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="eyebrow">{t('Contact')}</div>
      <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{t('Say moo 👋')}</h1>
      <p className="mt-3 text-fog">{t('Found a bug, have an idea, or need help with Plus? We read every message and usually reply within two days.')}</p>

      <div className="panel mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-fog">{t('Email')}</div>
          <a href={`mailto:${BRAND.supportEmail}`} className="font-display text-lg font-bold text-white underline-offset-4 hover:underline">
            {BRAND.supportEmail}
          </a>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(BRAND.supportEmail);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard blocked */
            }
          }}
        >
          {copied ? <IconCheck size={15} /> : <IconCopy size={15} />} {copied ? t('Copied') : t('Copy')}
        </button>
      </div>

      {state === 'sent' ? (
        <div className="panel mt-6 p-8 text-center">
          <div className="text-4xl">🐮</div>
          <h2 className="mt-3 font-display text-2xl font-bold">{t('Thanks! Message received.')}</h2>
          <p className="mt-2 text-fog">{email || user?.email ? t('We’ll reply to your email.') : t('Add your email next time if you’d like a reply.')}</p>
          <button className="btn btn-ghost mt-5" onClick={() => { setMessage(''); setState('idle'); }}>{t('Send another')}</button>
        </div>
      ) : (
        <form onSubmit={submit} className="panel mt-6 space-y-4 p-5">
          <div>
            <div className="eyebrow mb-2">{t('Topic')}</div>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((tp) => (
                <button
                  type="button"
                  key={tp.id}
                  onClick={() => setTopic(tp.id)}
                  className={clsx('chip !px-3 !py-1.5 !text-sm transition', topic === tp.id && '!border-hay/50 !bg-hay/15 !text-hay')}
                  aria-pressed={topic === tp.id}
                >
                  {t(tp.label)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="eyebrow">{t('Name (optional)')}</span>
              <input className="input mt-2" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span className="eyebrow">{t('Email (for a reply)')}</span>
              <input className="input mt-2" type="email" value={email} maxLength={200} placeholder={user?.email ?? 'you@email.com'} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="eyebrow">{t('Message')}</span>
            <textarea
              className="input mt-2 min-h-36 resize-y"
              required
              minLength={5}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={topic === 'bug' ? t('What happened? Which device and browser? A room code helps too.') : ''}
            />
          </label>
          {/* Honeypot: hidden from people, irresistible to spam bots. */}
          <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true" />
          <div className="flex items-center justify-between gap-3">
            {!['idle', 'sending'].includes(state) ? <p className="text-sm text-bull">{state}</p> : <span />}
            <button className="btn btn-primary" disabled={state === 'sending'}>
              {state === 'sending' ? t('Sending…') : t('Send message')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
