export const GAMES_URL   = process.env.GAMES_URL   ?? 'http://localhost:4001';
export const WALLETS_URL = process.env.WALLETS_URL ?? 'http://localhost:4002';

export let TEST_TOKEN = '';
export const TEST_PLAYER_ID = '41734736-8870-458e-b124-7b2adbf435d0';

export async function getTestToken(): Promise<string> {
  const res = await fetch(
    'http://localhost:8080/realms/crash-game/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id:  'crash-game-client',
        username:   'player',
        password:   'player123',
      }),
    }
  );
  const data = await res.json();
  TEST_TOKEN = data.access_token;
  return TEST_TOKEN;
}

export function authHeaders() {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${TEST_TOKEN}`,
  };
}

export async function waitForRoundPhase(
  phase: 'BETTING' | 'RUNNING' | 'CRASHED',
  timeoutMs = 30_000
): Promise<any> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${GAMES_URL}/games/rounds/current`);

      if (res.status === 404 && phase === 'CRASHED') {
         const histRes = await fetch(`${GAMES_URL}/games/rounds/history?page=1&limit=1`);
         const histBody = await histRes.json();
         if (histBody.data?.[0]?.status === 'CRASHED') return histBody.data[0];
      }

      if (res.ok) {
        const body = await res.json();
        const round = body.data;

        if (round?.status === phase) return round;

        if (phase === 'CRASHED') {
          const histRes = await fetch(`${GAMES_URL}/games/rounds/history?page=1&limit=1`);
          const histBody = await histRes.json();
          const last = histBody.data?.[0];
          if (last?.status === 'CRASHED') return last;
        }
      }
    } catch (e) {

    }

    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error(`Timeout esperando fase ${phase}. Verifique o Game Loop no backend.`);
}

export async function waitForBalanceChange(
  previousBalance: string,
  timeoutMs = 10_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${WALLETS_URL}/wallets/me`, { headers: authHeaders() });
      const body = await res.json();

      if (body.balance !== previousBalance) return body.balance;
    } catch (e) {}

    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error('Timeout esperando mudança de saldo');
}
