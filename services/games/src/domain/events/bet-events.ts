export const BET_EVENTS = {
  PLACED: 'bet.placed',
  WON:    'bet.won',
  LOST:   'bet.lost',
} as const;

export interface BetPlacedEvent {
  betId:    string;
  playerId: string;
  amount:   string;
  roundId:  string;
}

export interface BetWonEvent {
  betId:    string;
  playerId: string;
  payout:   string;
  roundId:  string;
  amount:            string;           
  cashoutMultiplier: number;
}

export interface BetLostEvent {
  betId:    string;
  playerId: string;
  roundId:  string;
}
