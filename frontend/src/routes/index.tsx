import { createFileRoute, redirect } from '@tanstack/react-router';
import { useGameSocket } from '../hooks/useGameSocket';
import { CrashCurve } from '#/components/game/CrashCurve';
import { WalletDisplay } from '../components/wallet/WalletDisplay';
import { HistoryBar } from '#/components/game/HistoryBar';
import { UserSidebar } from '#/components/game/UserSideBar';
import { AutoControls } from '#/components/game/AutoCashoutControl';
import { BetControls } from '../components/game/BetControls';
import { useGameEvents } from '../hooks/useGameEvents';
import { BettingTimer } from '#/components/game/BettingTimer';
import { RoundBets } from '#/components/game/RoundBets';

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
  if (context.auth.isLoading) return;
    throw redirect({ to: '/login' });
  }
},
  component: GamePage,
});

function GamePage() {
  useGameSocket();
  useGameEvents();

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden mx-auto">
      <UserSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <HistoryBar />
        <main className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center justify-start gap-2 p-6">
          <div className="w-[850px]">
            <CrashCurve />
          </div>
          <div className="w-full max-w-lg flex flex-col gap-4">
            <BettingTimer/>
            <BetControls />
            <AutoControls />
            <RoundBets />
          </div>
        </main>
      </div>
    </div>
  );
}
