import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRoom } from '../state/room';
import { useSession } from '../state/session';
import { Lobby } from '../game/Lobby';
import { Table } from '../game/Table';
import { Header } from '../components/Header';

export function RoomPage() {
  const code = (useParams().code ?? '').toUpperCase();
  const { socket, connected } = useSession();
  const { snapshot, error, closedReason, emotes, clockOffset } = useRoom(code);

  useEffect(() => () => void socket?.emit('room:leave'), [socket]);

  if (closedReason || (error && !snapshot)) {
    return (
      <>
        <Header />
        <Notice title={closedReason ? 'You left the table' : 'Can’t join that table'} body={closedReason ?? error ?? ''} />
      </>
    );
  }

  if (!snapshot) {
    return (
      <>
        <Header />
        <Notice title={connected ? 'Finding your seat…' : 'Connecting…'} body={`Room ${code}`} spinner />
      </>
    );
  }

  if (snapshot.room.phase === 'lobby') {
    return (
      <>
        <Header />
        <Lobby snapshot={snapshot} clockOffset={clockOffset} />
      </>
    );
  }
  return <Table snapshot={snapshot} emotes={emotes} clockOffset={clockOffset} />;
}

function Notice({ title, body, spinner }: { title: string; body: string; spinner?: boolean }) {
  return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
      {spinner && <span className="mb-5 size-8 animate-spin rounded-full border-2 border-white/15 border-t-hay" />}
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-fog">{body}</p>
      {!spinner && (
        <Link to="/" className="btn btn-primary mt-6">
          Back to the lobby
        </Link>
      )}
    </div>
  );
}
