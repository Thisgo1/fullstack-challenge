import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGameStore } from '@/store/game.store';
import { useAuth } from 'react-oidc-context';
import { User, Trophy, Hash, Zap } from "lucide-react";
import { WalletDisplay } from "../wallet/WalletDisplay";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGameSocket } from "#/hooks/useGameSocket";

export function UserSidebar() {
  const { totalRounds, history } = useGameStore();
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  useGameSocket();

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        Carregando...
      </div>
    );
  }



  if (!auth.isAuthenticated) return null;


  const bestMultiplier = history.length > 0
    ? (Math.max(...history) / 100).toFixed(2)
    : "0.00";



  return (
    <aside className="w-64 bg-zinc-950/50 border-r border-zinc-800 h-full flex flex-col p-6 gap-8">
      <div>
        <h1 className="text-lg font-bold tracking-tighter uppercase italic">Crash Game
          <button
            onClick={() => auth.signoutRedirect()}
            className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 ml-3 text-xs transition-all"
          >
            Sair
          </button>
        </h1>
      </div>
      <WalletDisplay />

      {/* Perfil */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar className="h-20 w-20 border-2 border-zinc-800 p-1">
            <AvatarImage src="" />
            <AvatarFallback className="bg-zinc-900 text-zinc-400">
              <User size={32} />
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 h-5 w-5 bg-green-500 border-4 border-zinc-950 rounded-full" />
        </div>

        <div className="text-center">
          <h2 className="font-bold text-zinc-100 tracking-tight">{auth.user?.profile.preferred_username}</h2>
        </div>
      </div>

      {/* Estatísticas da Sessão */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1">
          Session Stats
        </h3>

        <div className="grid gap-3">
          <StatCard
            icon={<Hash size={16} className="text-blue-400" />}
            label="Rounds"
            value={totalRounds.toString()}
          />
          <StatCard
            icon={<Trophy size={16} className="text-yellow-400" />}
            label="Best Multi"
            value={`${bestMultiplier}x`}
          />
          {/* <StatCard
            icon={<Zap size={16} className="text-purple-400" />}
            label="Status"
            value="Active"
          /> */}
        </div>
      </div>

      {/* Footer da Sidebar - Espaço para Nível/Exp no futuro */}
      <div className="mt-auto pt-6 border-t border-zinc-900">
        <div className="bg-zinc-900/50 rounded-xl p-3">
          <div className="flex justify-between text-[10px] mb-2 uppercase font-bold text-zinc-500">
            <span>Level 12</span>
            <span>70%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-[70%]" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
      <div className="p-2 bg-zinc-900 rounded-lg">{icon}</div>
      <div className="flex flex-col">
        <span className="text-[10px] text-zinc-500 font-bold uppercase">{label}</span>
        <span className="text-sm font-black text-zinc-200 tabular-nums">{value}</span>
      </div>
    </div>
  );
}
