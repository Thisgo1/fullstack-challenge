import { create } from 'zustand';
import type { RoundStatus, MultiplierTick, RoundCrashedEvent } from '../types';

export interface RoundBet {
  playerId: string;
  amount: number;
  status: 'PENDING' | 'WON' | 'LOST';
  payout?: number;
  cashoutMultiplier?: number;
}

interface GameState {
  roundId:           string | null;
  roundStatus:       RoundStatus | null;
  multiplier:        number;
  displayMultiplier: string;
  crashPoint:        number | null;
  hasBet:            boolean;
  betAmount:         string | null;
  cashedOut:         boolean;
  cashoutPayout:     string | null;
  history:           number[];
  totalRounds:       number;
  lastResult:        number | null;
  seedHash:          string | null;
  roundBets:         RoundBet[];

  onTick:            (data: MultiplierTick) => void;
  onBetting:         (roundId: string, seedHash: string) => void; // ← assinatura corrigida
  onStarted:         (roundId: string) => void;
  onCrashed:         (data: RoundCrashedEvent) => void;
  onBetPlaced:       (amount: string) => void;
  onCashedOut:       (payout: string) => void;
  onRoundBetUpdate:  (bet: RoundBet) => void;                     // ← adicionado
}

export const useGameStore = create<GameState>((set) => ({
  roundId:           null,
  roundStatus:       null,
  multiplier:        100,
  displayMultiplier: '1.00',
  crashPoint:        null,
  hasBet:            false,
  betAmount:         null,
  cashedOut:         false,
  cashoutPayout:     null,
  history:           [],
  totalRounds:       0,
  lastResult:        null,
  seedHash:          null,
  roundBets:         [],

  onTick: (data) => set({
    roundId:           data.roundId,
    multiplier:        data.multiplier,
    displayMultiplier: data.display,
  }),

  onBetting: (roundId, seedHash) => set({
    roundId,
    roundStatus:       'BETTING',
    multiplier:        100,
    displayMultiplier: '1.00',
    crashPoint:        null,
    hasBet:            false,
    betAmount:         null,
    cashedOut:         false,
    cashoutPayout:     null,
    lastResult:        null,
    seedHash,
    roundBets:         [],
  }),

  onStarted: (roundId) => set({ roundId, roundStatus: 'RUNNING' }),

  onCrashed: (data) => set((state) => {
    console.log('onCrashed chamado:', data.crashPoint, new Date().toISOString())
    let result = null;
    if (state.hasBet && state.betAmount) {
      const bet = parseFloat(state.betAmount);
      if (state.cashedOut && state.cashoutPayout) {
        result = parseFloat(state.cashoutPayout) - bet;
      } else {
        result = -bet;
      }
    }

    return {
      roundStatus:      'CRASHED',
      crashPoint:       data.crashPoint,
      displayMultiplier: data.display,
      history:          [data.crashPoint, ...state.history].slice(0, 15),
      totalRounds:      state.totalRounds + 1,
      lastResult:       result,
      roundBets:        state.roundBets.map(b =>   // ← movido para dentro do return
        b.status === 'PENDING' ? { ...b, status: 'LOST' as const } : b
      ),
    };
  }),

  onRoundBetUpdate: (bet) => set((state) => ({
    roundBets: state.roundBets.some(b => b.playerId === bet.playerId)
      ? state.roundBets.map(b => b.playerId === bet.playerId ? bet : b)
      : [...state.roundBets, bet],
  })),

  onBetPlaced:  (amount) => set({ hasBet: true, betAmount: amount }),
  onCashedOut:  (payout) => set({ cashedOut: true, cashoutPayout: payout }),
}));
