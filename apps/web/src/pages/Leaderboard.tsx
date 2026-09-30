import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { AdSlot } from '../components/AdSlot';
import { Bullhead, IconSparkle, IconTrophy } from '../art/icons';
import { Art } from '../art/Art';
import { api } from '../lib/api';

interface Row {
  rank: number;
  displayName: string;
  avatar: string;
  isPlus: boolean;
  onlineGames: number;
  onlineWins: number;
  avgBullheads: number;
}

export function Leaderboard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    api<{ players: Row[] }>('/api/leaderboard').then((r) => setRows(r.players)).catch(() => setRows([]));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-4">
        <Art id="render-trophy" alt="" className="size-20 object-contain" fallback={<span className="grid size-14 place-items-center rounded-2xl bg-hay/12 text-hay"><IconTrophy size={28} /></span>} />
        <div>
          <div className="eyebrow">Season 1</div>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">Leaderboard</h1>
        </div>
      </div>
      <p className="mt-2 text-fog">Wins in online games against at least one other person. Minimum three games. Sign in to be listed.</p>

      <div className="panel mt-8 overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_4.5rem_4.5rem_5rem] gap-2 border-b border-white/6 px-4 py-3 text-xs font-bold uppercase tracking-wider text-fog">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Wins</span>
          <span className="text-right">Games</span>
          <span className="text-right">Avg</span>
        </div>
        {rows === null && <div className="p-8 text-center text-fog">Loading…</div>}
        {rows?.length === 0 && (
          <div className="flex flex-col items-center p-8 text-center text-fog">
            <Art id="illustration-empty" alt="" className="mb-3 w-48" fallback={null} />
            No ranked players yet. Be the first!
          </div>
        )}
        {rows?.map((r) => (
          <div key={r.rank} className="grid grid-cols-[3rem_1fr_4.5rem_4.5rem_5rem] items-center gap-2 border-b border-white/4 px-4 py-2.5 last:border-0">
            <span className={`font-display text-lg font-extrabold tabular ${r.rank <= 3 ? 'text-hay' : 'text-fog'}`}>{r.rank}</span>
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar id={r.avatar} size={32} ring={r.isPlus ? '#f5b942' : undefined} />
              <span className="truncate font-semibold">{r.displayName}</span>
              {r.isPlus && <IconSparkle size={13} className="shrink-0 text-hay" />}
            </span>
            <span className="text-right font-bold tabular">{r.onlineWins}</span>
            <span className="text-right text-fog tabular">{r.onlineGames}</span>
            <span className="flex items-center justify-end gap-1 text-fog tabular">{r.avgBullheads} <Bullhead size={11} /></span>
          </div>
        ))}
      </div>
      <AdSlot slot="banner" className="mt-8" />
    </div>
  );
}
