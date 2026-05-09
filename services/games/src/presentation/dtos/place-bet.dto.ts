import {IsInt, Min, Max} from 'class-validator';

export class PlaceBetDto {
  @IsInt()
  @Min(100)    // R$ 1,00 em centavos
  @Max(100000) // R$ 1.000,00 em centavos
  amount: number;
}
