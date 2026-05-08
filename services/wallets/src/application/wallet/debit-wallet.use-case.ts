import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import type { IWalletRepository } from "@/domain/wallet/wallet.repository";
import { WALLET_REPOSITORY } from "@/domain/wallet/wallet.repository";

export interface DebitWalletInput {
  playerId: string;
  amount: bigint;
}

@Injectable()
export class DebitWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ){}

  async execute(input: DebitWalletInput): Promise<void> {
    const wallet = await this.walletRepository.findByPlayerId(input.playerId);
    if (!wallet) {
      throw new NotFoundException("Carteira não encontrada");
    }

    try {
      wallet.debit(input.amount);
    } catch (e: any){
      throw new BadRequestException(e.message);
    }

    await this.walletRepository.save(wallet);
  }
}
