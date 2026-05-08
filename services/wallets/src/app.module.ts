import { Module } from '@nestjs/common';
import { WalletsController } from './presentation/controllers/wallets.controller';
import { CreateWalletUseCase } from './application/wallet/create-wallet.use-case';
import { GetWalletUseCase }    from './application/wallet/get-wallet.use-case';
import { CreditWalletUseCase } from './application/wallet/credit-wallet.use-case';
import { DebitWalletUseCase }  from './application/wallet/debit-wallet.use-case';
import { PrismaWalletRepository } from './infrastructure/database/prisma-wallet.repository';
import { WALLET_REPOSITORY } from './domain/wallet/wallet.repository';

@Module({
  controllers: [WalletsController],
  providers: [
    // Bind da interface → implementação concreta
    // POR QUE useClass?
    // O Nest vai instanciar PrismaWalletRepository e injetá-la
    // sempre que alguém pedir WALLET_REPOSITORY
    {
      provide:  WALLET_REPOSITORY,
      useClass: PrismaWalletRepository,
    },
    CreateWalletUseCase,
    GetWalletUseCase,
    CreditWalletUseCase,
    DebitWalletUseCase,
  ],
})
export class AppModule {}
