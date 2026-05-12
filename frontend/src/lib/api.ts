import type { User } from 'oidc-client-ts';
import type { Wallet, Bet, Round } from '../types';

const KONG_URL = 'http://localhost:8000';

function getToken(): string | null {
  const key = `oidc.user:http://localhost:8080/realms/crash-game:crash-game-client`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  const user: User = JSON.parse(raw);
  return user.access_token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${KONG_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  getWallet: () =>
    request<Wallet>('/wallets/me'),

  createWallet: (playerId: string) =>
    request('/wallets', { method: 'POST', body: JSON.stringify({ playerId }) }),
  getActiveRound: () =>
    request<{ data: Round | null }>('/games/rounds/current'),

  getRounds: (page = 1) =>
    request<{ data: Round[]; meta: { total: number } }>(`/games/rounds/history?page=${page}`),

  placeBet: (amount: number, autoCashoutAt?: number ) =>
    request('/games/bet', { method: 'POST', body: JSON.stringify({
      amount,
      ...(autoCashoutAt ? { autoCashoutAt } : {}),
    }), }),

  cashout: (currentMultiplier: number) =>
    request('/games/bet/cashout', { method: 'POST', body: JSON.stringify({ currentMultiplier }) }),

  getMyBets: (page = 1) =>
    request<{ data: Bet[]; meta: { total: number } }>(`/games/bets/me?page=${page}`),
};
