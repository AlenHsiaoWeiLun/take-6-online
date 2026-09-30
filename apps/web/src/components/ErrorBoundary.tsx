import { Component, type ReactNode } from 'react';
import { BullMark } from '../art/BullMark';
import { useT } from '../i18n';

/** Catches render errors so a bug never leaves players on a black page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ui] crashed', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <CrashScreen message={this.state.error.message} onRetry={() => this.setState({ error: null })} />;
  }
}

function CrashScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT();
  return (
    <div className="grid min-h-[100dvh] place-items-center px-4 text-center">
      <div className="max-w-sm">
        <div className="mx-auto w-fit">
          <BullMark size={96} mood="shock" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold">{t('Something broke')}</h1>
        <p className="mt-2 text-mist">{t('Your game is safe on the server. Reload to jump back in — if you were in a room, you’ll return to your seat.')}</p>
        <div className="mt-6 flex justify-center gap-2.5">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            {t('Reload')}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              onRetry();
              window.location.assign('/');
            }}
          >
            {t('Go home')}
          </button>
        </div>
        <p className="mt-6 break-words font-mono text-[11px] text-fog/60">{message}</p>
      </div>
    </div>
  );
}
