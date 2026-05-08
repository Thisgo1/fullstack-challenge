import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WalletsController } from './presentation/controllers/wallets.controller';
import { WALLET_REPOSITORY } from './domain/wallet/wallet.repository';
import { PrismaWalletRepository } from './infrastructure/database/prisma-wallet.repository';
import { RabbitMQConsumer }  from './infrastructure/messaging/rabbitmq-consumer';
import { CreateWalletUseCase } from './application/wallet/create-wallet.use-case';
import { GetWalletUseCase }    from './application/wallet/get-wallet.use-case';
import { CreditWalletUseCase } from './application/wallet/credit-wallet.use-case';
import { DebitWalletUseCase }  from './application/wallet/debit-wallet.use-case';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [WalletsController],
  providers: [
    { provide: WALLET_REPOSITORY, useClass: PrismaWalletRepository },
    CreateWalletUseCase,
    GetWalletUseCase,
    CreditWalletUseCase,
    DebitWalletUseCase,
    RabbitMQConsumer, // inicia o consumer automaticamente via OnModuleInit
  ],
})
export class AppModule {}
