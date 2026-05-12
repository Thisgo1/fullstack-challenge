export type RoundStatus = 'BETTING' | 'RUNNING' | 'CRASHED';
export type BetStatus   = 'PENDING' | 'WON' | 'LOST';

export interface Wallet {
  id:        string;
  playerId:  string;
  balance:   string;
}

export interface Round {
  id:         string;
  status:     RoundStatus;
  crashPoint: number | null;
  seedHash:   string;
  seed:       string | null;
  createdAt:  string;
  crashedAt:  string | null;
}

export interface Bet {
  id:        string;
  roundId:   string;
  amount:    string;
  status:    BetStatus;
  payout:    string | null;
  cashoutAt: number | null;
  createdAt: string;
}

export interface MultiplierTick {
  roundId:    string;
  multiplier: number;
  display:    string;
}

export interface RoundCrashedEvent {
  roundId:    string;
  crashPoint: number;
  display:    string;
}
