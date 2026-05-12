import { describe, it, expect, beforeAll } from 'bun:test';
import {
  GAMES_URL, WALLETS_URL,
  getTestToken, authHeaders,
  waitForRoundPhase, waitForBalanceChange,
} from './helpers/setup';

describe('E2E: Aposta e Perda no Crash', () => {
  beforeAll(async () => {
    await getTestToken();
  });

  it('deve perder a aposta quando a rodada crasha sem sacar', async () => {
    // 1. Prepara o terreno: Aguarda a fase de apostas para garantir que podemos apostar
    await waitForRoundPhase('BETTING');

    // 2. Pega o saldo inicial antes da aposta
    const walletBefore = await fetch(`${WALLETS_URL}/wallets/me`, {
      headers: authHeaders(),
    }).then(r => r.json());
    const balanceBefore = walletBefore.balance;

    // 3. Realiza a aposta de R$ 5,00 (500 centavos)
    const betRes = await fetch(`${GAMES_URL}/games/bet`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ amount: 500 }),
    });
    console.log('bet response:', await betRes.json()); // ← adicione isso
    expect(betRes.status).toBe(201);

    // 4. Confirma que o saldo foi debitado imediatamente (Evento RabbitMQ/Sync)
    const balanceAfterBet = await waitForBalanceChange(balanceBefore);
    expect(BigInt(balanceAfterBet)).toBe(BigInt(balanceBefore) - 500n);
    console.log('Saldo após aposta confirmada:', balanceAfterBet);

    // 5. O momento crucial: Aguarda o jogo rodar e CRASHAR sem que a gente peça o cashout
    // Aumentamos o timeout para 60s caso a rodada suba muito alto
    const crashed = await waitForRoundPhase('CRASHED', 60_000);
    console.log('Rodada finalizada! Crash point:', crashed.crashPoint);

// 6. Aguarda o crash
await waitForRoundPhase('CRASHED', 60_000);

// 7. Polling para garantir que a aposta mudou de PENDING para LOST
let lastBet;
const deadline = Date.now() + 5000; // tenta por até 5 segundos

while (Date.now() < deadline) {
  const betsRes = await fetch(`${GAMES_URL}/games/bets/me`, {
    headers: authHeaders(),
  }).then(r => r.json());

  lastBet = betsRes.data[0];
  if (lastBet.status !== 'PENDING') break;

  await new Promise(r => setTimeout(r, 500)); // espera meio segundo e tenta de novo
}

console.log('Status final da aposta:', lastBet.status);
expect(lastBet.status).toBe('LOST');
expect(lastBet.payout).toBe('0');
  }, 90_000); // Timeout global do teste estendido para rodadas longas
});
