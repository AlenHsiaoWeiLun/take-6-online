import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRoom } from '../state/room';
import { useSession } from '../state/session';
import { Lobby } from '../game/Lobby';
import { Table } from '../game/Table';
import { Header } from '../components/Header';
import { useT } from '../i18n';
import { CardLoader } from '../components/CardLoader';

export function RoomPage() {
  const code = (useParams().code ?? '').toUpperCase();
  const { socket, connected } = useSession();
  const { snapshot, error, closedReason, emotes, clockOffset, ratings, log } = useRoom(code);
  const t = useT();

  useEffect(() => () => void socket?.emit('room:leave'), [socket]);

  if (closedReason || (error && !snapshot)) {
    return (
      <>
        <Header />
        <Notice title={closedReason ? t('You left the table') : t('Can’t join that table')} body={t(closedReason ?? error ?? '')} />
      </>
    );
  }

  if (!snapshot) {
    return (
      <>
        <Header />
        <Notice title={connected ? t('Finding your seat…') : t('Connecting…')} body={t('Room {code}', { code })} spinner />
      </>
    );
  }

  const banner = !connected && <ReconnectBanner />;
  if (snapshot.room.phase === 'lobby') {
    return (
      <>
        <Header />
        {banner}
        <Lobby snapshot={snapshot} clockOffset={clockOffset} />
      </>
    );
  }
  return (
    <>
      {banner}
      <Table snapshot={snapshot} emotes={emotes} clockOffset={clockOffset} ratings={ratings} log={log} />
    </>
  );
}

function Notice({ title, body, spinner }: { title: string; body: string; spinner?: boolean }) {
  const t = useT();
  return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
      {spinner ? (
        <>
          <CardLoader label={title} />
          <p className="mt-1 text-sm text-fog">{body}</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-fog">{body}</p>
        </>
      )}
      {!spinner && (
        <Link to="/" className="btn btn-primary mt-6">
          {t('Back to the lobby')}
        </Link>
      )}
    </div>
  );
}

/** Connection dropped: the seat is kept on the server and the room is re-joined automatically. */
function ReconnectBanner() {
  const t = useT();
  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex justify-center p-2" role="status" aria-live="polite">
      <div className="flex items-center gap-2 rounded-full border border-hay/40 bg-ink-900/95 px-4 py-2 text-sm font-semibold text-hay shadow-xl">
        <span className="size-2 animate-pulse rounded-full bg-hay" />
        {t('Connection lost — reconnecting. Your seat is kept.')}
      </div>
    </div>
  );
}
