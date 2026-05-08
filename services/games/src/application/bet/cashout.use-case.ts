import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ROUND_REPOSITORY } from "@/domain/round/round.repository";
import type { IRoundRepository } from "@/domain/round/round.repository";
import { BET_REPOSITORY } from "@/domain/bet/bet.repository";
import type { IBetRepository } from "@/domain/bet/bet.repository";
import { EVENT_PUBLISHER } from "@/domain/events/event-publisher";
import type { IEventPublisher } from "@/domain/events/event-publisher";
import { BET_EVENTS } from "@/domain/events/bet-events";
import type { BetWonEvent } from "@/domain/events/bet-events";

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
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: IEventPublisher,
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
      bet = round.cashoutBet(input.playerId, input.currentMultiplier);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }

    await this.betRepository.save(bet);

    const event: BetWonEvent = {
      betId: bet.id,
      playerId: bet.playerId,
      payout: bet.payout!.toString(),
      roundId: round.id,
    };
    await this.eventPublisher.publish(BET_EVENTS.WON, event);

    return {
      payout:      bet.payout.toString(),
      multiplier:  input.currentMultiplier,
    };
  }
}
