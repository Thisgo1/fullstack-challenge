export const BET_EVENTS = {
  WON: 'bet.won',
  LOST: 'bet.lost',
} as const;

export interface BetWonEvent {
  betId: string;
  playerId: string;
  payout: string;
  roundId: string;
}

export interface BetLostEvent{
  betId: string;
  playerId: string;
  roundId: string;
}
