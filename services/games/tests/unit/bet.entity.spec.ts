import { describe, it, expect } from 'bun:test';
import { Bet } from '../../src/domain/bet/bet.entity';
import { BetStatus } from '../../src/domain/bet/bet-status.enum';

describe('Bet', () => {

  // helper — evita repetir os mesmos argumentos em todo teste
  const makeBet = (amount = 1000n) =>
    Bet.create('bet-1', 'round-1', 'player-1', amount);

  // ── Criação ────────────────────────────────────────────────────────────
  describe('create', () => {
    it('deve criar aposta com status PENDING', () => {
      const bet = makeBet();

      expect(bet.status).toBe(BetStatus.PENDING);
      expect(bet.payout).toBeNull();
      expect(bet.cashoutMultiplier).toBeNull();
    });

    it('deve rejeitar aposta abaixo do mínimo (R$ 1,00)', () => {
      // 99 centavos — abaixo do mínimo
      expect(() => makeBet(99n)).toThrow('Aposta mínima é R$ 1,00');
    });

    it('deve aceitar aposta no valor mínimo exato', () => {
      expect(() => makeBet(100n)).not.toThrow();
    });

    it('deve rejeitar aposta acima do máximo (R$ 1.000,00)', () => {
      // 100.001 centavos — acima do máximo
      expect(() => makeBet(100_001n)).toThrow('Aposta máxima é R$ 1.000,00');
    });

    it('deve aceitar aposta no valor máximo exato', () => {
      expect(() => makeBet(100_000n)).not.toThrow();
    });
  });

  // ── Cashout ────────────────────────────────────────────────────────────
  describe('cashout', () => {
    it('deve calcular o payout corretamente', () => {
      const bet = makeBet(1000n); // R$ 10,00

      bet.cashout(250); // 2.50x

      // payout = 1000 * 250 / 100 = 2500 centavos = R$ 25,00
      expect(bet.payout).toBe(2500n);
      expect(bet.status).toBe(BetStatus.WON);
      expect(bet.cashoutMultiplier).toBe(250);
    });

    it('deve calcular payout no multiplicador mínimo (1.00x)', () => {
      const bet = makeBet(1000n);

      bet.cashout(100); // 1.00x — saca sem lucro

      expect(bet.payout).toBe(1000n); // devolve exatamente o que apostou
    });

    it('deve rejeitar cashout em aposta já encerrada', () => {
      const bet = makeBet();
      bet.cashout(200);

      // tenta sacar de novo
      expect(() => bet.cashout(300)).toThrow('Aposta já foi encerrada');
    });

    it('deve rejeitar cashout em aposta perdida', () => {
      const bet = makeBet();
      bet.lose();

      expect(() => bet.cashout(200)).toThrow('Aposta já foi encerrada');
    });
  });

  // ── Lose ───────────────────────────────────────────────────────────────
  describe('lose', () => {
    it('deve marcar aposta como LOST com payout zero', () => {
      const bet = makeBet();

      bet.lose();

      expect(bet.status).toBe(BetStatus.LOST);
      expect(bet.payout).toBe(0n);
    });

    it('deve rejeitar lose em aposta já encerrada', () => {
      const bet = makeBet();
      bet.lose();

      expect(() => bet.lose()).toThrow('Aposta já foi encerrada');
    });
  });

});
