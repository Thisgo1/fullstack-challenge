import {IsInt, Min, Max, IsOptional} from 'class-validator';

export class PlaceBetDto {
  @IsInt()
  @Min(100)
  @Max(100000)
  amount: number;

  @IsOptional()
  @IsInt()
  @Min(101) // mínimo 1.01x
  autoCashoutAt?: number;
}
