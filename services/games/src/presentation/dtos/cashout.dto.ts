import { IsInt, Min } from 'class-validator';

export class CashoutDto {
  @IsInt()
  @Min(100) 
  currentMultiplier: number;
}
