import { useGameStore } from '@/store/game.store';

export function RoundBets() {
  const roundBets   = useGameStore(s => s.roundBets);
  const roundStatus = useGameStore(s => s.roundStatus);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
          Apostas da rodada
        </span>
        <span className="text-[10px] text-zinc-700">{roundBets.length} jogadores</span>
      </div>

      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar">
        {roundBets.length === 0 && (
          <p className="text-zinc-700 text-xs italic text-center py-4">Nenhuma aposta ainda...</p>
        )}

        {roundBets.map((bet, i) => {
  const isCashedOut = bet.status === 'WON';
  const isLost      = bet.status === 'LOST';

  return (
    <div
      key={`${bet.playerId}-${i}`}
      className={`
        flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-all
        ${isCashedOut
          ? 'bg-green-500/10 border-green-500/20 text-green-400'
          : isLost
          ? 'bg-red-500/5 border-red-500/10 text-zinc-600'
          : 'bg-zinc-900/50 border-zinc-800 text-zinc-300'
        }
      `}
    >
      <span className="font-mono text-[11px] truncate max-w-[100px]">
        {bet.playerId.slice(0, 8)}...
      </span>

      <span className="font-bold">
        R$ {(bet.amount / 100).toFixed(2)}
      </span>

      {isCashedOut && (
        <div className="flex flex-col items-end">
          <span className="font-black text-green-400">
            @ {bet.cashoutMultiplier ? (bet.cashoutMultiplier / 100).toFixed(2) : '?'}x
          </span>
          {bet.payout && (
            <span className="text-[10px] text-green-500/70">
              +R$ {(bet.payout / 100).toFixed(2)}
            </span>
          )}
        </div>
      )}

      {isLost && (
        <span className="text-red-500/60 text-[10px]">PERDEU</span>
      )}

      {bet.status === 'PENDING' && roundStatus === 'RUNNING' && (
        <span className="text-yellow-400/60 text-[10px] animate-pulse">EM JOGO</span>
      )}
    </div>
  );
})}
      </div>
    </div>
  );
}
