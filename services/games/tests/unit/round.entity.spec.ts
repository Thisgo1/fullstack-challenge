import { describe, it, expect } from 'bun:test';
import { Round } from '../../src/domain/round/round.entity';
import { Bet } from '../../src/domain/bet/bet.entity';
import { RoundStatus } from '../../src/domain/round/round-status.enum';
import { BetStatus } from '../../src/domain/bet/bet-status.enum';

describe('Round', () => {

  // helpers
  const makeRound = () =>
    Round.create('round-1', 250, 'hash-abc', 'seed-xyz');

  const makeBet = (playerId = 'player-1', amount = 1000n) =>
    Bet.create(`bet-${playerId}`, 'round-1', playerId, amount);

  // ── Criação ────────────────────────────────────────────────────────────
  describe('create', () => {
    it('deve criar rodada em status BETTING', () => {
      const round = makeRound();

      expect(round.status).toBe(RoundStatus.BETTING);
      expect(round.bets).toHaveLength(0);
      expect(round.seed).toBe('seed-xyz'); // seed existe mas fica escondida até o crash
    });
  });

  // ── Apostas ────────────────────────────────────────────────────────────
  describe('addBet', () => {
    it('deve aceitar aposta na fase BETTING', () => {
      const round = makeRound();

      round.addBet(makeBet('player-1'));

      expect(round.bets).toHaveLength(1);
    });

    it('deve rejeitar aposta dupla do mesmo jogador', () => {
      const round = makeRound();
      round.addBet(makeBet('player-1'));

      expect(() => round.addBet(makeBet('player-1')))
        .toThrow('Jogador já apostou nesta rodada');
    });

    it('deve aceitar apostas de jogadores diferentes', () => {
      const round = makeRound();

      round.addBet(makeBet('player-1'));
      round.addBet(makeBet('player-2'));

      expect(round.bets).toHaveLength(2);
    });

    it('deve rejeitar aposta fora da fase de apostas', () => {
      const round = makeRound();
      round.start(); // avança para RUNNING

      expect(() => round.addBet(makeBet('player-1')))
        .toThrow('Fora da fase de apostas');
    });
  });

  // ── Transições de estado ───────────────────────────────────────────────
  describe('start', () => {
    it('deve avançar para status RUNNING', () => {
      const round = makeRound();

      round.start();

      expect(round.status).toBe(RoundStatus.RUNNING);
      expect(round.startedAt).toBeInstanceOf(Date);
    });

    it('deve rejeitar start em rodada já iniciada', () => {
      const round = makeRound();
      round.start();

      expect(() => round.start()).toThrow('Rodada não está na fase de apostas');
    });
  });

  // ── Cashout ────────────────────────────────────────────────────────────
  describe('cashoutBet', () => {
    it('deve registrar cashout do jogador', () => {
      const round = makeRound();
      round.addBet(makeBet('player-1', 1000n));
      round.start();

      const bet = round.cashoutBet('player-1', 200); // 2.00x

      expect(bet.status).toBe(BetStatus.WON);
      expect(bet.payout).toBe(2000n);
    });

    it('deve rejeitar cashout de jogador sem aposta', () => {
      const round = makeRound();
      round.start();

      expect(() => round.cashoutBet('player-sem-aposta', 200))
        .toThrow('Jogador não apostou nesta rodada');
    });

    it('deve rejeitar cashout fora da fase RUNNING', () => {
      const round = makeRound();
      round.addBet(makeBet('player-1'));
      // não chamou start()

      expect(() => round.cashoutBet('player-1', 200))
        .toThrow('Rodada não está em andamento');
    });
  });

  // ── Crash ──────────────────────────────────────────────────────────────
  describe('crash', () => {
    it('deve marcar rodada como CRASHED', () => {
      const round = makeRound();
      round.start();

      round.crash();

      expect(round.status).toBe(RoundStatus.CRASHED);
      expect(round.crashedAt).toBeInstanceOf(Date);
    });

    it('deve marcar como LOST apostas que não sacaram', () => {
      const round = makeRound();
      round.addBet(makeBet('player-1'));
      round.addBet(makeBet('player-2'));
      round.start();

      const lostBets = round.crash();

      expect(lostBets).toHaveLength(2);
      expect(lostBets.every(b => b.status === BetStatus.LOST)).toBe(true);
    });

    it('não deve incluir apostas já sacadas nas perdas', () => {
      const round = makeRound();
      round.addBet(makeBet('player-1'));
      round.addBet(makeBet('player-2'));
      round.start();
      round.cashoutBet('player-1', 200); // player-1 sacou

      const lostBets = round.crash();

      // só player-2 perdeu
      expect(lostBets).toHaveLength(1);
      expect(lostBets[0].playerId).toBe('player-2');
    });

    it('deve rejeitar crash em rodada não iniciada', () => {
      const round = makeRound();

      expect(() => round.crash()).toThrow('Rodada não está em andamento');
    });
  });

  // ── Fluxo completo ─────────────────────────────────────────────────────
  describe('fluxo completo', () => {
    it('happy path: aposta → cashout → crash', () => {
      const round = makeRound();

      // fase de apostas
      round.addBet(makeBet('player-1', 5000n)); // R$ 50,00
      round.addBet(makeBet('player-2', 2000n)); // R$ 20,00

      // rodada começa
      round.start();
      expect(round.status).toBe(RoundStatus.RUNNING);

      // player-1 saca em 1.50x
      round.cashoutBet('player-1', 150);

      // crash acontece
      const lostBets = round.crash();

      // player-1 ganhou
      const winner = round.bets.find(b => b.playerId === 'player-1')!;
      expect(winner.status).toBe(BetStatus.WON);
      expect(winner.payout).toBe(7500n); // 5000 * 150 / 100

      // player-2 perdeu
      expect(lostBets).toHaveLength(1);
      expect(lostBets[0].playerId).toBe('player-2');
      expect(lostBets[0].status).toBe(BetStatus.LOST);
    });
  });

});
