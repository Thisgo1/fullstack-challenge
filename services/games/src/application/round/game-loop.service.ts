import { Injectable, Inject,OnModuleInit, Logger } from "@nestjs/common";
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_PUBLISHER } from "@/domain/events/event-publisher";
import type { IEventPublisher } from "@/domain/events/event-publisher";
import { ROUND_REPOSITORY } from "@/domain/round/round.repository";
import type { IRoundRepository } from "@/domain/round/round.repository";
import { BET_REPOSITORY } from "@/domain/bet/bet.repository";
import type { IBetRepository } from "@/domain/bet/bet.repository";
import { BET_EVENTS } from "@/domain/events/bet-events";
import type { BetLostEvent } from "@/domain/events/bet-events";
import { CreateRoundUseCase } from "./create-round.use-case";
import { CashoutUseCase } from "../bet/cashout.use-case";

const BETTING_PHASE_MS = 10_000;
const CRASH_INTERVAL_MS = 100;
const BETWEEN_ROUNDS_MS = 5_000;


@Injectable()
export class GameLoopService implements OnModuleInit {
  private readonly logger = new Logger(GameLoopService.name);

  public currentMultiplier = 100;
  public currentRoundId: string | null = null;

  constructor(
    private readonly createRound: CreateRoundUseCase,
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: IRoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: IBetRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: IEventPublisher,
    private readonly eventEmitter: EventEmitter2,
    private readonly cashoutUseCase: CashoutUseCase,
  ){}

  async onModuleInit(): Promise<void> {
    this.logger.log('Game loop starting...');
    setTimeout(() => this.runLoop(), 2000);
  }

  private async runLoop(): Promise<void> {
    while (true) {
      try {
        await this.runRound();
      } catch (err) {
        this.logger.error('Game Loop error, restartimg im 5s', err)
        await this.sleep(5000)
      }
    }
  }

private async runRound(): Promise<void> {
  // ── Fase 1: BETTING ───────────────────────────────────────────────
  const round = await this.createRound.execute();
  this.currentRoundId = round.id;
  this.currentMultiplier = 100;

  this.eventEmitter.emit('round.betting', {
    roundId: round.id,
    seedHash: round.seedHash,
    duration: BETTING_PHASE_MS
  });

  this.logger.log(`Round ${round.id} started - BETTING phase (${BETTING_PHASE_MS}ms)`);
  await this.sleep(BETTING_PHASE_MS);

  // ── Fase 2: RUNNING ───────────────────────────────────────────────

  round.start();
  await this.roundRepository.save(round);

  const runningRound = await this.roundRepository.findById(round.id);
  if (!runningRound) throw new Error(`Round ${round.id} não encontrado após BETTING`);

  this.eventEmitter.emit('round.started', { roundId: runningRound.id });
  this.logger.log(`Round ${runningRound.id} - RUNNING`);

  const crashTimeMs = this.multiplierToMs(runningRound.crashPoint);

  await new Promise<void>((resolve) => {
    const startTime = Date.now();

    const interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;

      this.currentMultiplier = Math.round(
        100 * Math.pow(Math.E, elapsed / 6000)
      );

      const pendingBets = runningRound.bets.filter(
        bet => bet.isPending &&
               bet.autoCashoutAt !== null &&
               this.currentMultiplier >= bet.autoCashoutAt!
      );

      for (const bet of pendingBets) {
        try {
          await this.cashoutUseCase.execute({
            playerId: bet.playerId,
            currentMultiplier: bet.autoCashoutAt!,
          });
          this.logger.log(`Auto cashout: player ${bet.playerId} at ${bet.autoCashoutAt! / 100}x`);
        } catch (err: any) {
          this.logger.warn(`Auto cashout failed for ${bet.playerId}: ${err.message}`);
        }
      }

      if (elapsed >= crashTimeMs) {
        clearInterval(interval);
        this.currentMultiplier = runningRound.crashPoint;
        resolve();
      }
    }, CRASH_INTERVAL_MS);
  });

  // ── Fase 3: CRASHED ───────────────────────────────────────────────

  const lostBets = runningRound.crash();
  await this.roundRepository.save(runningRound);

  this.logger.log(
    `Round ${runningRound.id} CRASHED at ${runningRound.crashPoint / 100}x - ${lostBets.length} bets lost`
  );

  this.eventEmitter.emit('round.crashed', {
    roundId: runningRound.id,
    crashPoint: runningRound.crashPoint,
    display: (runningRound.crashPoint / 100).toFixed(2),
  });

  if (lostBets.length > 0) {
    await this.betRepository.saveMany(lostBets);

    await Promise.all(
      lostBets.map(bet => {
        const event: BetLostEvent = {
          betId: bet.id,
          playerId: bet.playerId,
          roundId: runningRound.id,
        };
        return this.eventPublisher.publish(BET_EVENTS.LOST, event);
      })
    );
  }

  this.currentRoundId = null;
  await this.sleep(BETWEEN_ROUNDS_MS);
}

  private multiplierToMs(multiplier: number): number {
    return Math.floor(6000 * Math.log(multiplier / 100));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
