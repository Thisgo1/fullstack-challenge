import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/store/game.store';

const BETTING_PHASE_MS = 10_000;

export function BettingTimer() {
  const roundStatus = useGameStore(s => s.roundStatus);
  const seedHash    = useGameStore(s => s.seedHash);
  const [timeLeft, setTimeLeft] = useState(BETTING_PHASE_MS / 1000);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (roundStatus !== 'BETTING') return;

    startedAt.current = Date.now();
    setTimeLeft(BETTING_PHASE_MS / 1000);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      const remaining = Math.max(0, (BETTING_PHASE_MS - elapsed) / 1000);
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 100);

    return () => clearInterval(interval);
  }, [roundStatus]);

  if (roundStatus !== 'BETTING') return null;

  const progress = (timeLeft / (BETTING_PHASE_MS / 1000)) * 100;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="font-bold uppercase tracking-widest">Apostas abertas</span>
        <span className={`font-mono font-bold ${timeLeft < 3 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
          {timeLeft.toFixed(1)}s
        </span>
      </div>
      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {seedHash && (
        <div className="flex items-center gap-2 mt-1 bg-zinc-900/50 rounded-lg px-3 py-2 border border-zinc-800">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 flex-shrink-0">Seed hash</span>
          <span className="text-[10px] font-mono text-zinc-500 truncate">{seedHash}</span>
        </div>
      )}
    </div>
  );
}
