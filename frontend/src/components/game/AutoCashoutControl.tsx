import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/game.store';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function AutoControls() {
  const [autoBetEnabled,    setAutoBetEnabled]    = useState(false);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutAt,     setAutoCashoutAt]     = useState('200'); // 2.00x em centésimos

  const roundStatus = useGameStore(s => s.roundStatus);
  const hasBet      = useGameStore(s => s.hasBet);
  const betAmount   = useGameStore(s => s.betAmount);
  const onBetPlaced = useGameStore(s => s.onBetPlaced);

  const didBetThisRound = useRef(false);

  // Reseta o controle a cada nova rodada
  useEffect(() => {
    if (roundStatus === 'BETTING') {
      didBetThisRound.current = false;
    }
  }, [roundStatus]);

  // Auto-bet: aposta assim que a fase BETTING começa
  useEffect(() => {
    if (
      !autoBetEnabled          ||
      roundStatus !== 'BETTING' ||
      hasBet                   ||
      didBetThisRound.current  ||
      !betAmount
    ) return;

    didBetThisRound.current = true;

    const amount = parseInt(betAmount);

    api.placeBet(amount, autoCashoutEnabled ? parseInt(autoCashoutAt) : undefined)
      .then(() => {
        onBetPlaced(betAmount);
        toast.info(`Auto-bet: R$ ${(amount / 100).toFixed(2)}`);
      })
      .catch((err: Error) => {
        toast.error(`Auto-bet falhou: ${err.message}`);
        setAutoBetEnabled(false); // desativa se der erro (ex: saldo insuficiente)
      });
  }, [roundStatus, hasBet]);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex flex-col gap-4">

      {/* Auto Bet */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-zinc-300">Auto Bet</span>
          <span className="text-[11px] text-zinc-600">Aposta automaticamente a cada rodada</span>
        </div>
        <button
          onClick={() => setAutoBetEnabled(v => !v)}
          className={`
            relative w-12 h-6 rounded-full transition-colors duration-200
            ${autoBetEnabled ? 'bg-green-500' : 'bg-zinc-700'}
          `}
        >
          <div className={`
            absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200
            ${autoBetEnabled ? 'left-7' : 'left-1'}
          `} />
        </button>
      </div>

      {/* Auto Cashout */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col flex-shrink-0">
          <span className="text-sm font-bold text-zinc-300">Auto Cashout</span>
          <span className="text-[11px] text-zinc-600">Saca automaticamente no multiplicador</span>
        </div>
        <div className="flex items-center gap-2">
          {autoCashoutEnabled && (
            <div className="relative">
              <input
                type="number"
                min="1.01"
                step="0.1"
                value={(parseInt(autoCashoutAt) / 100).toFixed(2)}
                onChange={(e) => {
                  const val = Math.round(parseFloat(e.target.value) * 100);
                  if (!isNaN(val) && val > 100) setAutoCashoutAt(val.toString());
                }}
                className="w-20 bg-zinc-800 text-white text-right rounded-lg px-2 py-1 text-sm
                           font-mono border border-zinc-700 focus:ring-2 focus:ring-yellow-500
                           focus:outline-none"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">x</span>
            </div>
          )}
          <button
            onClick={() => setAutoCashoutEnabled(v => !v)}
            className={`
              relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0
              ${autoCashoutEnabled ? 'bg-yellow-500' : 'bg-zinc-700'}
            `}
          >
            <div className={`
              absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200
              ${autoCashoutEnabled ? 'left-7' : 'left-1'}
            `} />
          </button>
        </div>
      </div>
    </div>
  );
}
