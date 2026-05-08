/**
 * Representa a carteira de um jogador.
 * Gerencia saldo, créditos e débitos com precisão usando bigint.
 */
export class Wallet {
  private constructor(
    public readonly id: string,
    public readonly playerId: string,
    private _balance: bigint,
    public readonly createdAt: Date,
  ) {}

  /**
   * Cria uma nova carteira para um jogador com saldo zero.
   * @param id Identificador único da carteira
   * @param playerId ID do jogador
   * @returns Nova instância de Wallet
   */
  static create(id: string, playerId: string): Wallet {
    return new Wallet(id, playerId, 0n, new Date());
  }

  /**
   * Restaura uma carteira existente do banco de dados.
   * @param id Identificador único da carteira
   * @param playerId ID do jogador
   * @param balance Saldo atual em centavos
   * @param createdAt Data de criação
   * @returns Instância restaurada de Wallet
   */
  static restore(id: string, playerId: string, balance: bigint, createdAt: Date): Wallet {
    return new Wallet(id, playerId, balance, createdAt);
  }

  get balance(): bigint {
    return this._balance;
  }

  /**
   * Credita um valor à carteira.
   * @param amount Valor a creditar em centavos (deve ser positivo)
   * @throws Error se o valor não for positivo
   */
  credit(amount: bigint): void {
    if (amount <= 0n) {
      throw new Error('Valor de crédito deve ser positivo');
    }
    this._balance += amount;
  }

  /**
   * Debita um valor da carteira.
   * @param amount Valor a debitar em centavos (deve ser positivo)
   * @throws Error se o valor não for positivo ou saldo insuficiente
   */
  debit(amount: bigint): void {
    if (amount <= 0n) {
      throw new Error('Valor de débito deve ser positivo');
    }
    if (this._balance < amount) {
      throw new Error('Saldo insuficiente');
    }
    this._balance -= amount;
  }
}
