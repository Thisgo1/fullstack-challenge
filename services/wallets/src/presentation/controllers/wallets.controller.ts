import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";

@ApiTags('wallets')
@Controller()
export class WalletsController {
  @Get("health")
  @ApiOperation({ summary: 'Verificar saúde do serviço' })
  @ApiResponse({ status: 200, description: 'Serviço saudável', type: HealthCheckResponseDto })
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }
}
