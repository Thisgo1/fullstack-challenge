import { Module } from '@nestjs/common';
import { GamesController } from './presentation/controllers/games.controller';
import { ROUND_REPOSITORY } from './domain/round/round.repository';
import { BET_REPOSITORY }   from './domain/bet/bet.repository';
import { SERVER_SECRET, CreateRoundUseCase } from './application/round/create-round.use-case';
import { PlaceBetUseCase }  from './application/bet/place-bet.use-case';
import { CashoutUseCase }   from './application/bet/cashout.use-case';
import { PrismaRoundRepository } from './infrastructure/database/prisma-round.repository';
import { PrismaBetRepository }   from './infrastructure/database/prisma-bet.repository';

@Module({
  controllers: [GamesController],
  providers: [
    {
      provide:  ROUND_REPOSITORY,
      useClass: PrismaRoundRepository,
    },
    {
      provide:  BET_REPOSITORY,
      useClass: PrismaBetRepository,
    },
    {
      provide:  SERVER_SECRET,
      // POR QUE useValue E NÃO useClass?
      // Não é uma classe — é um valor primitivo (string).
      // useValue injeta o valor diretamente.
      // Em produção: useFactory: () => process.env.SERVER_SECRET
      useValue: process.env.SERVER_SECRET ?? 'dev-secret-local',
    },
    CreateRoundUseCase,
    PlaceBetUseCase,
    CashoutUseCase,
  ],
})
export class AppModule {}
