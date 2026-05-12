import { useGameStore } from '../../store/game.store';

export function MultiplierDisplay() {
  const { displayMultiplier, roundStatus, crashPoint } = useGameStore();

  const color =
    roundStatus === 'CRASHED' ? 'text-red-500' :
    roundStatus === 'RUNNING' ? 'text-green-400' :
    'text-zinc-400';

  const label =
    roundStatus === 'CRASHED'
      ? `CRASHED @ ${(crashPoint! / 100).toFixed(2)}x`
      : roundStatus === 'BETTING'
      ? 'Aguardando apostas...'
      : `${displayMultiplier}x`;

  return (
    <div className="flex flex-col items-center justify-center h-48">
      <span className={`text-7xl font-bold tabular-nums transition-colors duration-100 ${color}`}>
        {label}
      </span>
      {roundStatus === 'BETTING' && (
        <span className="text-zinc-500 text-sm mt-3">Fase de apostas aberta</span>
      )}
    </div>
  );
}
