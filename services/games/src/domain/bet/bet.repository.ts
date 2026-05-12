import { Bet } from './bet.entity';

export interface IBetRepository {
  findById(id: string): Promise<Bet | null>;

  findByRoundId(roundId: string): Promise<Bet[]>;

  save(bet: Bet): Promise<void>;

  saveMany(bets: Bet[]): Promise<void>;
}

export const BET_REPOSITORY = "BET_REPOSITORY";
