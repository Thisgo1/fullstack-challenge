import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok', description: 'Status do serviço' })
  status: string;

  @ApiProperty({ example: 'games', description: 'Nome do serviço' })
  service: string;
}
