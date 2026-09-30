import { useState } from 'react';
import { Modal } from './Modal';
import { IconGoogle } from '../art/icons';
import { useSession } from '../state/session';
import { useT } from '../i18n';

/** Google + email magic-link sign-in, used by the header dialog and the profile dialog. */
export function SignInPanel({ reason }: { reason?: string }) {
  const { signInWithGoogle, sendEmailCode, verifyEmailCode } = useSession();
  const t = useT();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-fog">{reason ?? t('Sign in to save your stats, climb the leaderboard and keep Plus on every device.')}</p>
      <button className="btn btn-ghost w-full" onClick={() => signInWithGoogle()}>
        <IconGoogle /> {t('Continue with Google')}
      </button>
      <div className="flex items-center gap-3 text-xs text-fog/70">
        <span className="h-px flex-1 bg-white/8" /> {t('or')} <span className="h-px flex-1 bg-white/8" />
      </div>
      {step === 'email' ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await sendEmailCode(email.trim());
              setStep('code');
            });
          }}
        >
          <input className="input" type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-ghost shrink-0" disabled={busy}>
            {busy ? t('Sending…') : t('Email me a code')}
          </button>
        </form>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => verifyEmailCode(email.trim(), code));
          }}
        >
          <p className="text-sm text-mint">{t('We sent a 6-digit code to {email}.', { email })}</p>
          <div className="flex gap-2">
            <input
              className="input text-center font-display text-xl font-bold tracking-[0.4em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <button className="btn btn-primary shrink-0" disabled={busy || code.length !== 6}>
              {t('Sign in')}
            </button>
          </div>
          <button type="button" className="text-xs text-fog hover:text-white" onClick={() => { setStep('email'); setCode(''); }}>
            {t('Use a different email')}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-bull">{error}</p>}
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
