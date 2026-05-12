import { describe, it, expect, beforeAll } from 'bun:test';
import {
  GAMES_URL, WALLETS_URL,
  getTestToken, authHeaders,
  waitForRoundPhase, waitForBalanceChange,
} from '../../../../packages/test-commons';

describe('E2E: Aposta e Cashout', () => {
  beforeAll(async () => {
    await getTestToken();
  });

  it('deve debitar saldo ao apostar e creditar ao sacar', async () => {
    // 1. Aguarda fase de apostas
    await waitForRoundPhase('BETTING');

    // 2. Pega saldo inicial
    const walletBefore = await fetch(`${WALLETS_URL}/wallets/me`, {
      headers: authHeaders(),
    }).then(r => r.json());

    const balanceBefore = walletBefore.balance;
    console.log('Saldo antes:', balanceBefore);

    // 3. Faz a aposta (R$ 10,00 = 1000 centavos)
    const betRes = await fetch(`${GAMES_URL}/games/bet`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ amount: 1000 }),
    });

    expect(betRes.status).toBe(201);
    const bet = await betRes.json();
    expect(bet.betId).toBeDefined();
    expect(bet.amount).toBe('1000');

    // 4. Confirma débito via RabbitMQ (aguarda até 10s)
    const balanceAfterBet = await waitForBalanceChange(balanceBefore);
    expect(BigInt(balanceAfterBet)).toBe(BigInt(balanceBefore) - 1000n);
    console.log('Saldo após aposta:', balanceAfterBet);

    // 5. Aguarda rodada iniciar
    const round = await waitForRoundPhase('RUNNING');
    console.log('Rodada iniciou:', round.id);

    // 6. Saca imediatamente em 1.00x
    // POR QUE 100? É o multiplicador mínimo (1.00x em centésimos)
    // Sacamos imediatamente para garantir que não crashou ainda
    const cashoutRes = await fetch(`${GAMES_URL}/games/bet/cashout`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ currentMultiplier: 100 }),
    });

    expect(cashoutRes.status).toBe(200);
    const cashout = await cashoutRes.json();
    expect(cashout.payout).toBeDefined();
    console.log('Payout:', cashout.payout);

    // 7. Confirma crédito via RabbitMQ
    const balanceAfterCashout = await waitForBalanceChange(balanceAfterBet);
    expect(BigInt(balanceAfterCashout)).toBeGreaterThan(BigInt(balanceAfterBet));
    console.log('Saldo após cashout:', balanceAfterCashout);
  }, 60_000); // timeout de 60s — o teste pode esperar até 30s por fase
});
