import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { IWalletRepository } from "@/domain/wallet/wallet.repository";
import { WALLET_REPOSITORY } from "@/domain/wallet/wallet.repository";
import { Wallet } from "@/domain/wallet/wallet.entity";

export interface GetWalletOutput {
  id: string;
  playerId: string;
  balance: string;
}

@Injectable()
export class GetWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(playerId: string): Promise<GetWalletOutput> {
    let wallet = await this.walletRepository.findByPlayerId(playerId);

    if (!wallet) {
      wallet = Wallet.create(randomUUID(), playerId);
      wallet.credit(100000n);
      await this.walletRepository.save(wallet);
    }

    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balance: wallet.balance.toString(),
    };
  }
}
