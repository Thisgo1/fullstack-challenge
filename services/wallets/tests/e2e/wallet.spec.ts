import { describe, it, expect, beforeAll } from 'bun:test';
import {
  WALLETS_URL,
  getTestToken,
  authHeaders,
  TEST_PLAYER_ID
} from '../../../../packages/test-commons';

describe('E2E: Wallet', () => {
  beforeAll(async () => {
    // Garante que o token global do setup esteja preenchido
    await getTestToken();
  });

  it('deve retornar a wallet do jogador autenticado', async () => {
    const res  = await fetch(`${WALLETS_URL}/wallets/me`, {
      headers: authHeaders()
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.playerId).toBeDefined();
    expect(body.balance).toBeDefined();
    expect(BigInt(body.balance)).toBeGreaterThanOrEqual(0n);
  });

  it('deve rejeitar acesso sem autenticação', async () => {
    const res = await fetch(`${WALLETS_URL}/wallets/me`);
    expect(res.status).toBe(401);
  });

it('deve rejeitar criação de wallet duplicada', async () => {
  // Primeiro garante que a wallet existe (GET já cria automaticamente)
  const me = await fetch(`${WALLETS_URL}/wallets/me`, {
    headers: authHeaders(),
  }).then(r => r.json());

  // Tenta criar de novo com o mesmo playerId real
  const res = await fetch(`${WALLETS_URL}/wallets`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ playerId: me.playerId }),
  });

  expect(res.status).toBe(409);
});
});
