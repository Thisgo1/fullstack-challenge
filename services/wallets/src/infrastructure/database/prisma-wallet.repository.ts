import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { IWalletRepository } from '../../domain/wallet/wallet.repository';
import { Wallet } from '../../domain/wallet/wallet.entity';

@Injectable()
export class PrismaWalletRepository implements IWalletRepository {
  private readonly prisma: PrismaClient;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL
    });
    this.prisma = new PrismaClient({ adapter });
  }

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    const record = await this.prisma.wallet.findUnique({ where: { playerId } })

    if (!record) return null;

    return Wallet.restore(
      record.id,
      record.playerId,
      record.balance,
      record.createdAt,
    )
  }

  async save(wallet: Wallet): Promise<void>{
    await this.prisma.wallet.upsert({
      where: { playerId: wallet.playerId },
      create: {
        id:       wallet.id,
        playerId: wallet.playerId,
        balance:  wallet.balance,
      },
      update: {
        balance: wallet.balance,
      }
    })
  }
}
