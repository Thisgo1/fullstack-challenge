import { Inject, Injectable, ConflictException } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { IWalletRepository } from "@/domain/wallet/wallet.repository";
import { WALLET_REPOSITORY } from "@/domain/wallet/wallet.repository";
import { Wallet } from "@/domain/wallet/wallet.entity";

export interface CreateWalletInput {
  playerId: string;
}

export interface CreateWalletOutput {
  id: string;
  playerId: string;
  balance: string; // string pois bigint não serializa em json
}

@Injectable()
export class CreateWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(input: CreateWalletInput): Promise<CreateWalletOutput> {
    // Verificar se o jogador já possui uma carteira
    const existing = await this.walletRepository.findByPlayerId(input.playerId);
    if (existing) {
      throw new ConflictException("Jogador já possui uma carteira");
    }

    const wallet = Wallet.create(randomUUID(), input.playerId);
    await this.walletRepository.save(wallet);

    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balance: wallet.balance.toString(),
    };
  }
}
