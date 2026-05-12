import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ROUND_REPOSITORY } from "@/domain/round/round.repository";
import type { IRoundRepository } from "@/domain/round/round.repository";
import { Round } from "@/domain/round/round.entity";
import { ProvablyFair } from "@/domain/round/povably-fair";

export const SERVER_SECRET = Symbol("SERVER_SECRET");

@Injectable()
export class CreateRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: IRoundRepository,
    @Inject(SERVER_SECRET)
    private readonly serverSecret: string,
  ){}

  async execute(): Promise<Round> {
    const seed = ProvablyFair.generateSeed();
    const seedHash = ProvablyFair.hashSeed(seed);
    const crashPoint = ProvablyFair.calculateCrashPoint(seed, this.serverSecret);

    const round = Round.create(randomUUID(), crashPoint, seedHash, seed);
    await this.roundRepository.save(round);

    return round;
  }

}
