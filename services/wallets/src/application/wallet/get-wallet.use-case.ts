import { Inject, Injectable, NotImplementedException } from "@nestjs/common";
import type { IWalletRepository } from "@/domain/wallet/wallet.repository";
import { WALLET_REPOSITORY } from "@/domain/wallet/wallet.repository";

export interface GetWalletInput {
  id: string;
  playerId: string;
  balance: string; // string pois bigint não serializa em json
}

@Injectable()
export class GetWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(playerId: string): Promise<GetWalletInput> {
    const wallet = await this.walletRepository.findByPlayerId(playerId);
    if (!wallet) {
      throw new NotImplementedException("Carteira não encontrada");
    }

    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balance: wallet.balance.toString(),
    };
  }
}
