import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GamesController } from './presentation/controllers/games.controller';
import { ROUND_REPOSITORY } from './domain/round/round.repository';
import { BET_REPOSITORY }   from './domain/bet/bet.repository';
import { EVENT_PUBLISHER }  from './domain/events/event-publisher';
import { SERVER_SECRET, CreateRoundUseCase } from './application/round/create-round.use-case';
import { PlaceBetUseCase }  from './application/bet/place-bet.use-case';
import { CashoutUseCase }   from './application/bet/cashout.use-case';
import { PrismaRoundRepository } from './infrastructure/database/prisma-round.repository';
import { PrismaBetRepository }   from './infrastructure/database/prisma-bet.repository';
import { RabbitMQEventPublisher } from './infrastructure/messaging/rabbitmq-event-publisher';
import { GameLoopService } from './application/round/game-loop.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [GamesController],
  providers: [
    { provide: ROUND_REPOSITORY, useClass: PrismaRoundRepository },
    { provide: BET_REPOSITORY,   useClass: PrismaBetRepository },
    { provide: EVENT_PUBLISHER,  useClass: RabbitMQEventPublisher },
    {
      provide:  SERVER_SECRET,
      useValue: process.env.SERVER_SECRET ?? 'dev-secret-local',
    },
    CreateRoundUseCase,
    PlaceBetUseCase,
    CashoutUseCase,
    GameLoopService,
  ],
})
export class AppModule {}
