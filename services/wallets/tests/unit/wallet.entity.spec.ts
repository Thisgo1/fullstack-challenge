import { describe, it, expect } from 'bun:test';
import { Wallet } from '../../src/domain/wallet/wallet.entity';

describe('Wallet', () => {

  // ── Criação ────────────────────────────────────────────────────────────
  describe('create', () => {
    it('deve criar carteira com saldo zero', () => {
      const wallet = Wallet.create('id-1', 'player-1');

      expect(wallet.balance).toBe(0n);
      expect(wallet.playerId).toBe('player-1');
    });
  });

  // ── Crédito ────────────────────────────────────────────────────────────
  describe('credit', () => {
    it('deve aumentar o saldo corretamente', () => {
      const wallet = Wallet.create('id-1', 'player-1');

      wallet.credit(1000n); // R$ 10,00

      expect(wallet.balance).toBe(1000n);
    });

    it('deve acumular múltiplos créditos', () => {
      const wallet = Wallet.create('id-1', 'player-1');

      wallet.credit(500n);
      wallet.credit(300n);

      expect(wallet.balance).toBe(800n);
    });

    it('deve rejeitar crédito com valor zero', () => {
      const wallet = Wallet.create('id-1', 'player-1');

      expect(() => wallet.credit(0n)).toThrow('Valor de crédito deve ser positivo');
    });

    it('deve rejeitar crédito com valor negativo', () => {
      const wallet = Wallet.create('id-1', 'player-1');

      expect(() => wallet.credit(-100n)).toThrow('Valor de crédito deve ser positivo');
    });
  });

  // ── Débito ─────────────────────────────────────────────────────────────
  describe('debit', () => {
    it('deve diminuir o saldo corretamente', () => {
      const wallet = Wallet.create('id-1', 'player-1');
      wallet.credit(1000n);

      wallet.debit(400n);

      expect(wallet.balance).toBe(600n);
    });

    it('deve permitir débito do saldo exato', () => {
      const wallet = Wallet.create('id-1', 'player-1');
      wallet.credit(1000n);

      wallet.debit(1000n);

      expect(wallet.balance).toBe(0n);
    });

    it('deve rejeitar débito com saldo insuficiente', () => {
      const wallet = Wallet.create('id-1', 'player-1');
      wallet.credit(500n);

      expect(() => wallet.debit(501n)).toThrow('Saldo insuficiente');
    });

    it('deve rejeitar débito com valor zero', () => {
      const wallet = Wallet.create('id-1', 'player-1');

      expect(() => wallet.debit(0n)).toThrow('Valor de débito deve ser positivo');
    });

    it('saldo nunca deve ficar negativo', () => {
      const wallet = Wallet.create('id-1', 'player-1');

      expect(() => wallet.debit(1n)).toThrow();
      expect(wallet.balance).toBeGreaterThanOrEqual(0n);
    });
  });

  // ── Precisão monetária ─────────────────────────────────────────────────
  describe('precisão monetária', () => {
    it('deve operar com centavos sem perda de precisão', () => {
      const wallet = Wallet.create('id-1', 'player-1');

      // R$ 100.000,00 em centavos
      wallet.credit(10_000_000n);
      wallet.debit(1n); // 1 centavo

      expect(wallet.balance).toBe(9_999_999n);
    });
  });

});
