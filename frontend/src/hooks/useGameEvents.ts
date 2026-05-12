import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useGameStore } from '@/store/game.store';

export function useGameEvents() {
  const lastResult  = useGameStore(s => s.lastResult);
  const roundStatus = useGameStore(s => s.roundStatus);
  const hasBet      = useGameStore(s => s.hasBet);
  const cashedOut   = useGameStore(s => s.cashedOut);
  const crashPoint  = useGameStore(s => s.crashPoint);

  const prevStatus = useRef<string | null>(null);

  useEffect(() => {
    if (roundStatus !== 'CRASHED' || prevStatus.current === 'CRASHED') {
      prevStatus.current = roundStatus;
      return;
    }
    prevStatus.current = roundStatus;

    if (!hasBet || lastResult === null) return;

    if (lastResult >= 0) {
    } else {
      const lost = Math.abs(lastResult);
      toast.error(`Você perdeu R$ ${(lost / 100).toFixed(2)} @ ${(crashPoint! / 100).toFixed(2)}x`, {
        duration: 5000,
      });
    }
  }, [roundStatus]);
}
