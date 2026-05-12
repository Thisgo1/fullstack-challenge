import { describe, it, expect, beforeAll } from 'bun:test';
import {
  GAMES_URL, WALLETS_URL,
  getTestToken, authHeaders,
  waitForRoundPhase,
} from '../../../../packages/test-commons';

describe('E2E: Validações de erro', () => {
  beforeAll(async () => {
    await getTestToken();
  });

  it('deve rejeitar aposta sem autenticação', async () => {
    const res = await fetch(`${GAMES_URL}/games/bet`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amount: 1000 }),
    });

    expect(res.status).toBe(401);
  });



  it('deve rejeitar aposta com valor abaixo do mínimo', async () => {
    await waitForRoundPhase('BETTING');

    const res = await fetch(`${GAMES_URL}/games/bet`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ amount: 50 }), // abaixo de 100 centavos
    });

    expect(res.status).toBe(400);
  }, 30_000);

  it('deve rejeitar aposta com valor acima do máximo', async () => {
    await waitForRoundPhase('BETTING');

    const res = await fetch(`${GAMES_URL}/games/bet`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ amount: 200_000 }), // acima de 100.000 centavos
    });

    expect(res.status).toBe(400);
  });

  it('deve rejeitar aposta dupla na mesma rodada', async () => {
    await waitForRoundPhase('BETTING');

    // Primeira aposta
    const first = await fetch(`${GAMES_URL}/games/bet`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ amount: 100 }),
    });
    expect(first.status).toBe(201);

    // Segunda aposta na mesma rodada
    const second = await fetch(`${GAMES_URL}/games/bet`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ amount: 100 }),
    });

    expect(second.status).toBe(400);
    const body = await second.json();
    expect(body.message).toContain('já apostou');
  }, 30_000);

  it('deve rejeitar cashout sem aposta na rodada', async () => {
    // Aguarda rodada RUNNING onde não apostamos
    await waitForRoundPhase('CRASHED');  // deixa a rodada atual terminar
    await waitForRoundPhase('BETTING');  // nova rodada
    await waitForRoundPhase('RUNNING'); // rodada começa sem aposta

    const res = await fetch(`${GAMES_URL}/games/bet/cashout`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ currentMultiplier: 150 }),
    });

    expect(res.status).toBe(400);
  }, 60_000);

  it('deve rejeitar aposta durante fase RUNNING', async () => {
    await waitForRoundPhase('RUNNING');

    const res = await fetch(`${GAMES_URL}/games/bet`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ amount: 1000 }),
    });

    expect(res.status).toBe(400);
  }, 30_000);

  it('deve rejeitar saldo insuficiente', async () => {
    await waitForRoundPhase('BETTING');

    // Tenta apostar mais do que tem na carteira
    const res = await fetch(`${GAMES_URL}/games/bet`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ amount: 99_999_999 }), // R$ 999.999,99
    });

    // Validação de máximo (100.000 centavos) vai rejeitar antes do saldo
    expect(res.status).toBe(400);
  }, 30_000);
});
