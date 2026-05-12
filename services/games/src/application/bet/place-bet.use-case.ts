import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IRoundRepository } from '../../domain/round/round.repository';
import { ROUND_REPOSITORY } from '../../domain/round/round.repository';
import type { IBetRepository} from '../../domain/bet/bet.repository';
import {BET_REPOSITORY } from '../../domain/bet/bet.repository';
import type { IEventPublisher } from '../../domain/events/event-publisher';
import { EVENT_PUBLISHER } from '../../domain/events/event-publisher';
import { BET_EVENTS } from '../../domain/events/bet-events';
import type { BetPlacedEvent } from '../../domain/events/bet-events';
import { Bet } from '../../domain/bet/bet.entity';

export interface PlaceBetInput {
  playerId: string;
  amount: bigint;
  autoCashoutAt?: number;
}

export interface PlaceBetOutput {
  betId:    string;
  roundId:  string;
  playerId: string;
  amount:   string;
}

@Injectable()
export class PlaceBetUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: IRoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: IBetRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const round = await this.roundRepository.findActive();
    if (!round) throw new NotFoundException('Nenhuma rodada em fase de apostas');
    if (!round.isBetting) throw new BadRequestException('Rodada não está aceitando apostas');

    let bet: Bet;
    try {
      bet = Bet.create(randomUUID(), round.id, input.playerId, input.amount, input.autoCashoutAt);
      round.addBet(bet);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }

    await this.betRepository.save(bet);

    const event: BetPlacedEvent = {
      betId:    bet.id,
      playerId: bet.playerId,
      amount:   bet.amount.toString(),
      roundId:  round.id,
    };
    await this.eventPublisher.publish(BET_EVENTS.PLACED, event);

    return {
      betId:    bet.id,
      roundId:  round.id,
      playerId: bet.playerId,
      amount:   bet.amount.toString(),
    };
  }
}
