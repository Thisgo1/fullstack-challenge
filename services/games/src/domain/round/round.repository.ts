import { Round } from "./round.entity";
import { RoundStatus } from "./round-status.enum";

export interface IRoundRepository {
  findById(id: string): Promise<Round | null>;

  findActive(): Promise<Round | null>;

  findMany(page: number, limit: number): Promise< {rounds: Round[]; total: number}>

  save(round: Round): Promise<void>;
}

export const ROUND_REPOSITORY = "ROUND_REPOSITORY";
