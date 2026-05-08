import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ROUND_REPOSITORY } from "@/domain/round/round.repository";
import type { IRoundRepository } from "@/domain/round/round.repository";
import { BET_REPOSITORY } from "@/domain/bet/bet.repository";
import type { IBetRepository } from "@/domain/bet/bet.repository";

export interface CashoutBetInput {
  playerId: string;
  currentMultiplier: number;
}

export interface CashoutOutput {
  payout: string; // string pois bigint não serializa em json
  multiplier: number;
}

@Injectable()
export class CashoutUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: IRoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: IBetRepository,
  ){}

  async execute(input: CashoutBetInput): Promise<CashoutOutput> {
    const round = await this.roundRepository.findActive();
    if (!round || !round.isRunning) {
      throw new NotFoundException("Nenhuma rodada em andamento");
    }

    if (input.currentMultiplier > round.crashPoint) {
      throw new BadRequestException("Nultiplicador inválido");
    }

    let bet;
    try{
      bet = await this.cashoutBet(input.playerId, input.currentMultiplier);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }

    await this.betRepository.save(bet);

    return {
      payout: bet.payout.toString(),
      multiplier: input.currentMultiplier,
    };
  }
}
