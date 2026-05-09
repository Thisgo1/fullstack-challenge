import { Injectable, Inject,OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { EVENT_PUBLISHER } from "@/domain/events/event-publisher";
import type { IEventPublisher } from "@/domain/events/event-publisher";
import { ROUND_REPOSITORY } from "@/domain/round/round.repository";
import type { IRoundRepository } from "@/domain/round/round.repository";
import { BET_REPOSITORY } from "@/domain/bet/bet.repository";
import type { IBetRepository } from "@/domain/bet/bet.repository";
import { BET_EVENTS } from "@/domain/events/bet-events";
import type { BetLostEvent } from "@/domain/events/bet-events";
import { CreateRoundUseCase } from "./create-round.use-case";

const BETTING_PHASE_MS = 10_000; //10 segundos para apostar
const CRASH_INTERVAL_MS = 100; // tick a cada 100ms
const BETWEEN_ROUNDS_MS = 5_000; //5s entre rodadas


@Injectable()
export class GameLoopService implements OnModuleInit {
  private readonly logger = new Logger(GameLoopService.name);

  public currentMultiplier = 100; // multiplicador atual, começa em 1.00x (100 em centavos)
  public currentRoundId: string | null = null;

  constructor(
    private readonly createRound: CreateRoundUseCase,
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: IRoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: IBetRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: IEventPublisher,
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

    this.logger.log(`Round ${round.id} started - BETTING phase (${BETTING_PHASE_MS}ms)`)

    await this.sleep(BETTING_PHASE_MS)

    // ── Fase 2: RUNNING ───────────────────────────────────────────────

    round.start()
    await this.roundRepository.save(round);
    this.logger.log(`Round ${round.id} - RUNNING`)

    const crashTimeMs = this.multiplierToMs(round.crashPoint);

    await new Promise<void> ((resolve) => {
      const startTime = Date.now();

      const interval = setInterval(async () => {
        const elapsed = Date.now() - startTime;

        this.currentMultiplier = Math.floor(
          100 * Math.pow(Math.E, elapsed / 6000)
        );

        if (elapsed >= crashTimeMs) {
          clearInterval(interval);
          this.currentMultiplier = round.crashPoint;
          resolve();
        }
      }, CRASH_INTERVAL_MS);
    });

    // ── Fase 3: CRASHED ───────────────────────────────────────────────

    const lostBets = round.crash();
    await this.roundRepository.save(round);

    this.logger.log(
      `Round ${round.id} CRASHED at ${round.crashPoint / 100}x - ${lostBets.length} bets lost`
    )

    if (lostBets.length > 0){
      await this.betRepository.saveMany(lostBets);

      await Promise.all(
        lostBets.map(bet => {
          const event: BetLostEvent = {
            betId: bet.id,
            playerId: bet.playerId,
            roundId: round.id,
          };
          return this.eventPublisher.publish(BET_EVENTS.LOST, event)
        })
      );
    }
    this.currentRoundId = null;
    await this.sleep(BETWEEN_ROUNDS_MS)
  }

  private multiplierToMs(multiplier: number): number {
    return Math.floor(6000 * Math.log(multiplier / 100));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
