import { BetStatus } from './bet-status.enum';

/**
 * Representa uma aposta em uma rodada do jogo Crash.
 * Gerencia o estado da aposta, incluindo criação, cashout e perda.
 */
export class Bet {
  private constructor(
    public readonly id: string,
    public readonly roundId: string,
    public readonly playerId: string,
    public readonly amount: bigint,       // em centavos
    private _status: BetStatus,
    private _cashoutMultiplier: number | null, // ex: 250 = 2.50x
    private _payout: bigint | null,
    public readonly createdAt: Date,
  ) {}

  /**
   * Cria uma nova aposta com validações de valor mínimo e máximo.
   * @param id Identificador único da aposta
   * @param roundId ID da rodada
   * @param playerId ID do jogador
   * @param amount Valor da aposta em centavos (mín 100, máx 100000)
   * @returns Nova instância de Bet
   * @throws Error se o valor estiver fora dos limites
   */
  static create(id: string, roundId: string, playerId: string, amount: bigint): Bet {
    if (amount < 100n) throw new Error('Aposta mínima é R$ 1,00');
    if (amount > 100_000n) throw new Error('Aposta máxima é R$ 1.000,00');
    return new Bet(id, roundId, playerId, amount, BetStatus.PENDING, null, null, new Date());
  }

  /**
   * Restaura uma aposta existente do banco de dados.
   * @param id Identificador único da aposta
   * @param roundId ID da rodada
   * @param playerId ID do jogador
   * @param amount Valor da aposta em centavos
   * @param status Status atual da aposta
   * @param cashoutMultiplier Multiplicador no cashout (se aplicável)
   * @param payout Valor do payout em centavos (se aplicável)
   * @param createdAt Data de criação
   * @returns Instância restaurada de Bet
   */
  static restore(
    id: string, roundId: string, playerId: string, amount: bigint,
    status: BetStatus, cashoutMultiplier: number | null, payout: bigint | null,
    createdAt: Date,
  ): Bet {
    return new Bet(id, roundId, playerId, amount, status, cashoutMultiplier, payout, createdAt);
  }

  get status(): BetStatus { return this._status; }
  get cashoutMultiplier(): number | null { return this._cashoutMultiplier; }
  get payout(): bigint | null { return this._payout; }
  get isPending(): boolean { return this._status === BetStatus.PENDING; }

  /**
   * Realiza o cashout da aposta no multiplicador atual.
   * @param multiplier Multiplicador atual (ex: 250 para 2.50x)
   * @throws Error se a aposta não estiver pendente ou multiplicador inválido
   */
  cashout(multiplier: number): void {
    if (!this.isPending) throw new Error('Aposta já foi encerrada');
    if (multiplier < 100) throw new Error('Multiplicador inválido');
    // payout = amount * multiplier / 100  (tudo em inteiros)
    this._payout = (this.amount * BigInt(multiplier)) / 100n;
    this._cashoutMultiplier = multiplier;
    this._status = BetStatus.WON;
  }

  /**
   * Marca a aposta como perdida (crash ocorreu sem cashout).
   * @throws Error se a aposta não estiver pendente
   */
  lose(): void {
    if (!this.isPending) throw new Error('Aposta já foi encerrada');
    this._status = BetStatus.LOST;
    this._payout = 0n;
  }
}
