import { useState } from 'react';
import { Modal } from './Modal';
import { IconGoogle } from '../art/icons';
import { useSession } from '../state/session';
import { useT } from '../i18n';

/** Google + email magic-link sign-in, used by the header dialog and the profile dialog. */
export function SignInPanel({ reason }: { reason?: string }) {
  const { signInWithGoogle, signInWithEmail } = useSession();
  const t = useT();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | string>('idle');

  return (
    <div className="space-y-3">
      <p className="text-sm text-fog">{reason ?? t('Sign in to save your stats, climb the leaderboard and keep Plus on every device.')}</p>
      <button className="btn btn-ghost w-full" onClick={() => signInWithGoogle()}>
        <IconGoogle /> {t('Continue with Google')}
      </button>
      <div className="flex items-center gap-3 text-xs text-fog/70">
        <span className="h-px flex-1 bg-white/8" /> {t('or')} <span className="h-px flex-1 bg-white/8" />
      </div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setState('sending');
          try {
            await signInWithEmail(email);
            setState('sent');
          } catch (err) {
            setState((err as Error).message);
          }
        }}
      >
        <input className="input" type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn btn-ghost shrink-0" disabled={state === 'sending'}>
          {t('Email link')}
        </button>
      </form>
      {state === 'sent' && <p className="text-sm text-mint">{t('Check your inbox for a sign-in link.')}</p>}
      {!['idle', 'sending', 'sent'].includes(state) && <p className="text-sm text-bull">{state}</p>}
      <p className="text-xs text-fog/70">{t('Guests can always play without an account.')}</p>
    </div>
  );
}

export function SignInDialog({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} label={t('Sign in')}>
      <h2 className="font-display text-2xl font-bold">{t('Sign in')}</h2>
      <div className="mt-4">
        <SignInPanel reason={reason} />
      </div>
    </Modal>
  );
}
