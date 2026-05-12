import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function WalletDisplay() {
  const { data, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn:  api.getWallet,
    refetchInterval: 10_000,
  });

  if (isLoading) return <span className="text-zinc-400 text-sm">...</span>;

  const balance = data ? parseInt(data.balance) / 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-400 text-sm">Saldo:</span>
      <span className="text-white font-semibold">R$ {balance.toFixed(2)}</span>
    </div>
  );
}
