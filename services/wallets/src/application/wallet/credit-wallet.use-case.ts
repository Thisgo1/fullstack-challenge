import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { IWalletRepository } from "@/domain/wallet/wallet.repository";
import { WALLET_REPOSITORY } from "@/domain/wallet/wallet.repository";

export interface CreditWalletInput {
  playerId: string;
  amount: bigint;
}

@Injectable()
export class CreditWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ){}

  async execute(input: CreditWalletInput): Promise<void> {
    const wallet = await this.walletRepository.findByPlayerId(input.playerId);
    if (!wallet) {
      throw new NotFoundException("Carteira não encontrada");
    }

    // A regra de negocio (amount > 0) esta na entidade e não aqui, pois a entidade é a responsável por garantir a integridade do seu estado
    wallet.credit(input.amount);
    await this.walletRepository.save(wallet);
  }
}
