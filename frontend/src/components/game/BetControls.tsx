import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useGameStore } from '../../store/game.store';
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
} from '../ui/button-group';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export function BetControls() {
  const [amount, setAmount] = useState('100');
  const queryClient = useQueryClient();

  const roundStatus   = useGameStore(s => s.roundStatus);
  const hasBet        = useGameStore(s => s.hasBet);
  const cashedOut     = useGameStore(s => s.cashedOut);
  const cashoutPayout = useGameStore(s => s.cashoutPayout);
  const multiplier    = useGameStore(s => s.multiplier);
  const crashPoint    = useGameStore(s => s.crashPoint);
  const onBetPlaced   = useGameStore(s => s.onBetPlaced);
  const onCashedOut   = useGameStore(s => s.onCashedOut);
  const onRoundBetUpdate = useGameStore(s => s.onRoundBetUpdate);

  const canBet     = roundStatus === 'BETTING' && !hasBet;
  const canCashout = roundStatus === 'RUNNING' && hasBet && !cashedOut;
  const lost       = roundStatus === 'CRASHED' && hasBet && !cashedOut;
  const MIN_CENTS = 100;

  const betMutation = useMutation({
    mutationFn: () => api.placeBet(parseInt(amount)),
    onSuccess: (data: any) => {
      onBetPlaced(amount);
      toast.success(`Aposta feita! R$ ${(parseInt(amount) / 100).toFixed(2)}`); // ← usa amount, não data.payout
      onRoundBetUpdate({
        playerId: data.playerId, // ← vem da resposta da API
        amount:   parseInt(amount),
        status:   'PENDING',
      });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erro ao realizar aposta');
    },
  });

  const cashoutMutation = useMutation({
    mutationFn: () => api.cashout(multiplier),
    onSuccess: (data: any) => {
      onCashedOut(data.payout);
      toast.success(`Saque! R$ ${(parseInt(data.payout) / 100).toFixed(2)}`);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: () => {
    toast.error('Erro ao realizar saque');
    },
  });

  // 1. Lida com o que o usuário digita (Ex: usuário digita "1.50")
  const handleInputChange = (displayValue: string) => {
  const sanitized = displayValue.replace(',', '.').replace(/[^\d.]/g, '');
  if (!sanitized) {
    setAmount(MIN_CENTS.toString());
    return;
  }
  const cents = Math.round(parseFloat(sanitized) * 100);
  if (!isNaN(cents)) {
    setAmount(Math.max(MIN_CENTS, cents).toString()); // ← clamp aqui
  }
};


  // 2. Lida com os botões de ADICIONAR (1, 5, 10 Reais)
  const addAmount = (reais: number) => {
    setAmount((prev) => {
      const currentCents = parseInt(prev || '0');
      const addCents = reais * 100;
      return (currentCents + addCents).toString();
    });
  };

  const subAmount = (reais: number) => {
  setAmount((prev) => {
    const currentCents = parseInt(prev || '0');
    const subCents = reais * 100;
    return Math.max(MIN_CENTS, currentCents - subCents).toString(); // ← clamp aqui
  });
};

  return (
  <div className="bg-zinc-900 grid grid-cols-2  rounded-xl p-4 space-y-4 border border-zinc-800">
    <div className="flex flex-col gap-4">

      {/* Campo de Input e Visualização */}
      <div className="flex flex-row gap-2">
      <Button
            variant="secondary"
            size="sm"
            onClick={() => subAmount(1)}
            className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700 h-full"
          >
            -
      </Button>

        <div className="w-28">

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
            <input
              type="text" // Usamos text para melhor controle de formatação
              value={(parseInt(amount) / 100).toFixed(2)} // Mostra 1.00
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={!canBet}
              className="w-full bg-zinc-800 text-white rounded-lg pl-10 pr-2 py-1 text-lg font-mono
                         border border-zinc-700 focus:ring-2 focus:ring-green-500 focus:outline-none
                         disabled:opacity-50 transition-all"
            />
          </div>
        </div>
        <Button
            variant="secondary"
            size="sm"
            onClick={() => addAmount(1)}
            className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700 h-full"
          >
            +
      </Button>

    </div>

      {/* Botões de Atalho para ADICIONAR */}
      <div className="grid grid-cols-3 gap-2">
        <ButtonGroup>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => addAmount(1)}
            className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
          >
            +R$ 1
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => addAmount(5)}
            className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
          >
            +R$ 5
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => addAmount(10)}
            className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
          >
            +R$ 10
          </Button>
        </ButtonGroup>
      </div>

        {/* Botão de Ação Principal (Apostar/Sacar) */}

    </div>
            <div className="w-full h-full">
          {lost ? (
            <div className="w-full bg-red-500/10 border border-red-500/50 text-red-500 text-center py-4 rounded-lg font-bold">
              PERDEU @ {(crashPoint! / 100).toFixed(2)}x
            </div>
          ) : !hasBet ? (
            <button
              onClick={() => betMutation.mutate()}
              disabled={!canBet || betMutation.isPending}
              className="w-full h-full min-h-[60px] bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-black text-xl rounded-lg transition-all active:scale-95"
            >
              {betMutation.isPending ? 'PROCESSANDO...' : 'APOSTAR'}
            </button>
          ) : cashedOut ? (
            <div className="w-full bg-green-500/10 border border-green-500/50 text-green-400 text-center py-4 rounded-lg font-bold">
              LUCRO: R$ {cashoutPayout ? (parseInt(cashoutPayout) / 100).toFixed(2) : '0.00'}
            </div>
          ) : (
            <button
              onClick={() => cashoutMutation.mutate()}
              disabled={!canCashout || cashoutMutation.isPending}
              className="w-full h-full min-h-[60px] bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl rounded-lg transition-all animate-pulse active:scale-95"
            >
              SACAR R$ {((parseInt(amount) * multiplier) / 10000).toFixed(2)}
            </button>
          )}
        </div>
    </div>
  );
}
