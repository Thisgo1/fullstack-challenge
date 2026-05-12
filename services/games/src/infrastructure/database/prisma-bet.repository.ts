import { Injectable } from "@nestjs/common";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { IBetRepository } from "../../domain/bet/bet.repository";
import { Bet } from "../../domain/bet/bet.entity";
import { BetStatus } from "../../domain/bet/bet-status.enum";

@Injectable()
export class PrismaBetRepository implements IBetRepository {
  private readonly prisma: PrismaClient;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL
    });
    this.prisma = new PrismaClient({ adapter });
  }

  async findById(id: string): Promise<Bet | null> {
    const record = await this.prisma.bet.findUnique({
      where: { id },
    });
    if (!record) return null;

    return this.toEntity(record);
  }

  async findByRoundId(roundId: string): Promise<Bet[]> {
    const records = await this.prisma.bet.findMany({
      where: { roundId },
    });

    return records.map(r => this.toEntity(r));
  }

  async findByPlayerId(playerId: string, page: number, limit: number){
    const [total, records] = await this.prisma.$transaction([
      this.prisma.bet.count({where : { playerId}}),
      this.prisma.bet.findMany({
        where: { playerId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {bets: records.map(r => this.toEntity(r)), total};
  }

  async save(bet: Bet): Promise<void> {
  await this.prisma.bet.upsert({
    where: { id: bet.id },
    create: {
      id: bet.id,
      roundId: bet.roundId,
      playerId: bet.playerId,
      amount: bet.amount,
      status: bet.status,
      cashoutMultiplier: bet.cashoutMultiplier,
      payout: bet.payout,
      createdAt: bet.createdAt,
      autoCashoutAt: bet.autoCashoutAt,
    },
    update: {
      status: bet.status,
      cashoutMultiplier: bet.cashoutMultiplier,
      payout: bet.payout,
    }
  });
}

  async saveMany(bets: Bet[]): Promise<void> {
    await this.prisma.$transaction(
      bets.map(bet => this.prisma.bet.update({
        where: { id: bet.id },
        data: {
          status: bet.status,
          payout: bet.payout,
        }
      })
    )
    );
  }

 private toEntity(record: any): Bet {
  return Bet.restore(
    record.id,
    record.roundId,
    record.playerId,
    record.amount,
    record.status as BetStatus,
    record.cashoutMultiplier,  
    record.payout,
    record.createdAt,
    record.autoCashoutAt,
  );
}
}
