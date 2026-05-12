import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok', description: 'Status do serviço' })
  status: string;

  @ApiProperty({ example: 'wallets', description: 'Nome do serviço' })
  service: string;
}
