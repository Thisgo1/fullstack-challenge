import { Controller, Get, Post, Body, Request, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateWalletDto } from "../dtos/create-wallet.dto";
import { CreateWalletUseCase } from "@/application/wallet/create-wallet.use-case";
import { GetWalletUseCase } from "@/application/wallet/get-wallet.use-case";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";

@ApiTags('wallets')
@Controller()
export class WalletsController {

  constructor(
    private readonly createWallet: CreateWalletUseCase,
    private readonly getWallet: GetWalletUseCase,
  ){}

  @Get("health")
  @ApiOperation({ summary: 'Verificar saúde do serviço' })
  @ApiResponse({ status: 200, description: 'Serviço saudável', type: HealthCheckResponseDto })
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateWalletDto) {
    return this.createWallet.execute({playerId: dto.playerId});
  }

  @Get("me")
  async getMe(@Request() req: any) {
    const playerId = req.user?.sub ?? req.headers['x-player-id'];
    return this.getWallet.execute(playerId)
  }
}
