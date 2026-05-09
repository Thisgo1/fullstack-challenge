import { IsInt, Min } from 'class-validator';

export class CashoutDto {
  @IsInt()
  @Min(100) // mínimo 1.00x
  currentMultiplier: number;
}
