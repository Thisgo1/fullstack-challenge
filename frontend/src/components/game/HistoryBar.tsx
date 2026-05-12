import { useGameStore } from '@/store/game.store';

export function HistoryBar() {
  const history = useGameStore((state) => state.history);

  return (
    <div className="w-full flex items-center gap-2 p-2 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 overflow-x-hidden select-none">
      <div className="flex-shrink-0 px-3 border-r border-zinc-800">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">History</span>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {history.length === 0 && (
          <div className="text-zinc-700 text-xs italic animate-pulse">Waiting for first crash...</div>
        )}

        {history.map((val, i) => {
          const multiplier = val / 100;

          // Definindo a "personalidade" da cor
          // Vermelho: < 1.2x | Branco: 1.2x a 2.0x | Verde: > 2.0x | Roxo/Dourado: > 10.0x
          const getColorClass = () => {
            if (multiplier < 1.2) return "text-red-500 bg-red-500/10 border-red-500/20";
            if (multiplier >= 10) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20 shadow-[0_0_10px_rgba(250,204,21,0.2)]";
            if (multiplier >= 2) return "text-green-400 bg-green-400/10 border-green-500/20";
            return "text-zinc-300 bg-zinc-800/50 border-zinc-700";
          };

          return (
            <div
              key={`${val}-${i}`}
              className={`
                flex-shrink-0 px-3 py-1 rounded-md text-xs font-bold border transition-all duration-300
                animate-in fade-in slide-in-from-right-4
                ${getColorClass()}
              `}
            >
              {multiplier.toFixed(2)}x
            </div>
          );
        })}
      </div>
    </div>
  );
}
