import {Controller, Get, Post, Body, Param, Query, Request, HttpCode, HttpStatus} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateRoundUseCase } from '../../application/round/create-round.use-case';
import { PlaceBetUseCase }    from '../../application/bet/place-bet.use-case';
import { CashoutUseCase }     from '../../application/bet/cashout.use-case';
import { PlaceBetDto }        from '../dtos/place-bet.dto';
import { CashoutDto }         from '../dtos/cashout.dto';
import { PaginationDto }      from '../dtos/pagination.dto';
import { ROUND_REPOSITORY } from '@/domain/round/round.repository';
import type { IRoundRepository } from '@/domain/round/round.repository';
import { BET_REPOSITORY } from '@/domain/bet/bet.repository';
import type { IBetRepository } from '@/domain/bet/bet.repository';
import { EVENT_PUBLISHER } from '@/domain/events/event-publisher';
import type { IEventPublisher } from '@/domain/events/event-publisher';
import { ProvablyFair } from '@/domain/round/povably-fair';
import { SERVER_SECRET } from '../../application/round/create-round.use-case';
import { Inject } from '@nestjs/common';
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";

@ApiTags('games')
@Controller()

export class GamesController {
  constructor(
    private readonly createRound: CreateRoundUseCase,
    private readonly placeBet: PlaceBetUseCase,
    private readonly cashout: CashoutUseCase,
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: IRoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: IBetRepository,
    @Inject(SERVER_SECRET)
    private readonly serverSecret: string,
  ) {}

  @Get("health")
  @ApiOperation({ summary: 'Verificar saúde do serviço' })
  @ApiResponse({ status: 200, description: 'Serviço saudável', type: HealthCheckResponseDto })
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "games" };
  }

  @Get('rounds')
  async listRounds(@Query() pagination: PaginationDto) {
  const { rounds, total } = await this.roundRepository.findMany(pagination.page, pagination.limit);
   return {
      data: rounds.map(r => ({
        id:         r.id,
        status:     r.status,
        crashPoint: r.crashPoint,
        seedHash:   r.seedHash,
        // POR QUE SÓ REVELAR A SEED APÓS O CRASH?
        // Antes do crash, revelar a seed permitiria calcular o crashPoint
        // e trapeacear. A seed só é revelada quando a rodada termina.
        seed:       r.status === 'CRASHED' ? r.seed : null,
        createdAt:  r.createdAt,
        crashedAt:  r.crashedAt,
      })),
      meta: {
        total,
        page:  pagination.page,
        limit: pagination.limit,
      },
    };
  }

  @Get('rounds/active')
  async getActiveRound() {
    const round = await this.roundRepository.findActive();
    if (!round) return { data: null };

    return{
      data: {
        id:        round.id,
        status:    round.status,
        seedHash:  round.seedHash,
        betsCount: round.bets.length,
        createdAt: round.createdAt,
        startedAt: round.startedAt,
      },
    }
  }

  @Get('rounds/:id')
  async getRound(@Param('id') id: string) {
    const round = await this.roundRepository.findById(id);
    if (!round) return { data: null };

    return {
      data: {
        id:         round.id,
        status:     round.status,
        crashPoint: round.status === 'CRASHED' ? round.crashPoint : null,
        seedHash:   round.seedHash,
        seed:       round.status === 'CRASHED' ? round.seed : null,
        bets:       round.bets.map(b => ({
          id:        b.id,
          playerId:  b.playerId,
          amount:    b.amount.toString(),
          status:    b.status,
          payout:    b.payout?.toString() ?? null,
          cashoutAt: b.cashoutMultiplier,
        })),
        createdAt:  round.createdAt,
        startedAt:  round.startedAt,
        crashedAt:  round.crashedAt,
      },
    };
  }

  @Get('rounds/:id/verify')
  async verifyRound(@Param('id') id: string) {
    const round = await this.roundRepository.findById(id);
    if (!round || round.status !== 'CRASHED') {
      return {error: "Rodada não encontrada ou ainda não encerrada"};
    }

    const result = ProvablyFair.verify(round.seed!, round.seedHash, this.serverSecret);
    return {
      data: {
        valid:          result.valid,
        seed:           round.seed,
        seedHash:       round.seedHash,
        computedHash:   result.computedHash,
        crashPoint:     round.crashPoint,
        verifiedCrashPoint: result.crashPoint,
        // Se crashPoint === verifiedCrashPoint, o resultado foi legítimo
        match: round.crashPoint === result.crashPoint,
      },
    };
  }

  @Post('bets')
  @HttpCode(HttpStatus.CREATED)
  async bet(@Body() dto: PlaceBetDto, @Request() req: any) {
    const playerId = req.user?.sub ?? req.headers['x-player-id'];
    return this.placeBet.execute({
      playerId,
      amount: BigInt(dto.amount)
    });
  }

  @Post('bets/cashout')
  async doCashout(@Body() dto: CashoutDto, @Request() req: any) {
    const playerId = req.user?.sub ?? req.headers['x-player-id'];
    return this.cashout.execute({
      playerId,
      currentMultiplier: dto.currentMultiplier,
    })
  }

  @Get('bets/me')
  async myBets(@Query() pagination: PaginationDto, @Request() req: any){
    const playerId = req.user?.sub ?? req.headers['x-player-id'];
    const { bets, total} = await this.betRepository.findByPlayerId(
      playerId,
      pagination.page,
      pagination.limit,);

  return {
        data: bets.map(b => ({
          id:        b.id,
          roundId:   b.roundId,
          amount:    b.amount.toString(),
          status:    b.status,
          payout:    b.payout?.toString() ?? null,
          cashoutAt: b.cashoutMultiplier,
          createdAt: b.createdAt,
        })),
        meta: { total, page: pagination.page, limit: pagination.limit },
      };
  }
}
