import { Injectable } from "@nestjs/common";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { IRoundRepository } from "../../domain/round/round.repository";
import { Round } from "../../domain/round/round.entity";
import { RoundStatus } from "../../domain/round/round-status.enum";
import { Bet } from "../../domain/bet/bet.entity";
import { BetStatus } from "@/domain/bet/bet-status.enum";

@Injectable()
export class PrismaRoundRepository implements IRoundRepository {
  private readonly prisma: PrismaClient;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL
    });
    this.prisma = new PrismaClient({ adapter });
  }

  async findById(id: string): Promise<Round | null> {
    const record = await this.prisma.round.findUnique({
      where: { id },
      include: {
        bets: true,
      },
    })
    if (!record) return null;

    return this.toEntity(record);
  }

  async findActive(): Promise<Round | null> {
    const record = await this.prisma.round.findFirst({
      where: {
        status: { in: [RoundStatus.BETTING, RoundStatus.RUNNING] },
      },
      include: {
        bets: true,
      },
    })
    if (!record) return null;
    return this.toEntity(record);
  }

  async findMany(page: number, limit: number): Promise<{ rounds: Round[]; total: number }> {
    const [total, records] = await this.prisma.$transaction([
      this.prisma.round.count(),
      this.prisma.round.findMany({
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt:  'desc'},
        include: { bets:       true }
      })
    ]);

    return {
      rounds: records.map(r => this.toEntity(r)),
      total,
    }
  }

  async save(round: Round): Promise<void> {
    await this.prisma.round.upsert({
      where: { id: round.id },
      create: {
        id: round.id,
        status: round.status,
        crashPoint: round.crashPoint,
        seedHash: round.seedHash,
        seed: round.seed,
        startedAt: round.startedAt,
        crashedAt: round.crashedAt,
        createdAt: round.createdAt,
      },
      update: {
        status: round.status,
        startedAt: round.startedAt,
        crashedAt: round.crashedAt,
      },
    })
  }

  private toEntity(record: any): Round {
    const bets = record.bets.map((b: any) =>
      Bet.restore(
        b.id, b.roundId, b.playerId, b.amount,
        b.status as BetStatus,
        b.crashoutAt, b.payout,
        b.createdAt)
      );

    return Round.restore(
      record.id,
      record.status as RoundStatus,
      record.crashPoint,
      record.seedHash,
      record.seed,
      bets,
      record.createdAt,
      record.startedAt,
      record.crashedAt
    )
  }


}
