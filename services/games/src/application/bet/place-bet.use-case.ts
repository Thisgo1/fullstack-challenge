import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ROUND_REPOSITORY } from "@/domain/round/round.repository";
import type { IRoundRepository } from "@/domain/round/round.repository";
import { BET_REPOSITORY } from "@/domain/bet/bet.repository";
import type { IBetRepository } from "@/domain/bet/bet.repository";
import { Bet } from "@/domain/bet/bet.entity";

export interface PlaceBetInput {
  playerId: string;
  amount: bigint;
}

export interface PlaceBetOutput {
  betId: string;
  roundId: string;
  playerId: string;
  amount: string; // string pois bigint não serializa em json
}

@Injectable()
export class PlaceBetUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: IRoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: IBetRepository,
  ){}

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const round = await this.roundRepository.findActive();
    if (!round) throw new NotFoundException("Nenhuma rodada em fase de aposta");
    if (!round.isBetting) throw new BadRequestException("Rodada não está aceitando apostas");

    let bet: Bet;
    try{
      bet = Bet.create(randomUUID(), round.id, input.playerId, input.amount);
      round.addBet(bet);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }

    await this.betRepository.save(bet);

    return {
      betId: bet.id,
      roundId: round.id,
      playerId: bet.playerId,
      amount: bet.amount.toString(),
    };
  }
}
