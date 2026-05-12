import { RoundStatus } from './round-status.enum';
import { Bet } from '../bet/bet.entity';


export class Round {
  private constructor(
    public readonly id: string,
    private _status: RoundStatus,
    public readonly crashPoint: number,  x
    public readonly seedHash: string,
    private _seed: string | null,
    private _bets: Bet[],
    public readonly createdAt: Date,
    private _startedAt: Date | null,
    private _crashedAt: Date | null,
  ) {}

  /**
   * Cria uma nova rodada com ponto de crash pré-determinado.
   * @param id Identificador único da rodada
   * @param crashPoint Ponto de crash (ex: 250 para 2.50x)
   * @param seedHash Hash da seed para verificação provably fair
   * @param seed Seed usada para gerar o crash point
   * @returns Nova instância de Round
   */
  static create(id: string, crashPoint: number, seedHash: string, seed: string): Round {
    return new Round(id, RoundStatus.BETTING, crashPoint, seedHash, seed, [], new Date(), null, null);
  }

  /**
   * Restaura uma rodada existente do banco de dados.
   * @param id Identificador único da rodada
   * @param status Status atual da rodada
   * @param crashPoint Ponto de crash
   * @param seedHash Hash da seed
   * @param seed Seed (pode ser null se não revelada)
   * @param bets Lista de apostas da rodada
   * @param createdAt Data de criação
   * @param startedAt Data de início (se aplicável)
   * @param crashedAt Data de crash (se aplicável)
   * @returns Instância restaurada de Round
   */
  static restore(
    id: string, status: RoundStatus, crashPoint: number,
    seedHash: string, seed: string | null, bets: Bet[],
    createdAt: Date, startedAt: Date | null, crashedAt: Date | null,
  ): Round {
    return new Round(id, status, crashPoint, seedHash, seed, bets, createdAt, startedAt, crashedAt);
  }

  get status(): RoundStatus { return this._status; }
  get seed(): string | null { return this._seed; }
  get bets(): Bet[] { return [...this._bets]; }
  get startedAt(): Date | null { return this._startedAt; }
  get crashedAt(): Date | null { return this._crashedAt; }
  get isBetting(): boolean { return this._status === RoundStatus.BETTING; }
  get isRunning(): boolean { return this._status === RoundStatus.RUNNING; }

  /**
   * Adiciona uma aposta à rodada.
   * @param bet Aposta a ser adicionada
   * @throws Error se não estiver na fase de apostas ou jogador já apostou
   */
  addBet(bet: Bet): void {
    if (!this.isBetting) throw new Error('Fora da fase de apostas');
    const alreadyBet = this._bets.some(b => b.playerId === bet.playerId);
    if (alreadyBet) throw new Error('Jogador já apostou nesta rodada');
    this._bets.push(bet);
  }

  /**
   * Inicia a rodada, mudando para status RUNNING.
   * @throws Error se não estiver na fase de apostas
   */
  start(): void {
    if (!this.isBetting) throw new Error('Rodada não está na fase de apostas');
    this._status = RoundStatus.RUNNING;
    this._startedAt = new Date();
  }

  /**
   * Realiza cashout de uma aposta específica.
   * @param playerId ID do jogador
   * @param multiplier Multiplicador atual
   * @returns A aposta após cashout
   * @throws Error se rodada não estiver em andamento ou aposta não encontrada
   */
  cashoutBet(playerId: string, multiplier: number): Bet {
    if (!this.isRunning) throw new Error('Rodada não está em andamento');
    const bet = this._bets.find(b => b.playerId === playerId);
    if (!bet) throw new Error('Jogador não apostou nesta rodada');
    bet.cashout(multiplier);
    return bet;
  }

  /**
   * Faz a rodada crashar, marcando todas as apostas pendentes como perdidas.
   * @returns Lista de apostas perdidas
   * @throws Error se rodada não estiver em andamento
   */
  crash(): Bet[] {
    if (!this.isRunning) throw new Error('Rodada não está em andamento');
    this._status = RoundStatus.CRASHED;
    this._crashedAt = new Date();
    const lost: Bet[] = [];
    for (const bet of this._bets) {
      if (bet.isPending) {
        bet.lose();
        lost.push(bet);
      }
    }
    return lost;
  }
}
