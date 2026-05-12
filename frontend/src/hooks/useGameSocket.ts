import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useGameStore } from '../store/game.store';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:8000';

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${WS_URL}/game`, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
    });

    socketRef.current = socket;

    socket.on('multiplier:tick', (d) => useGameStore.getState().onTick(d));
    socket.on('round:betting',   (d) => useGameStore.getState().onBetting(d.roundId));
    socket.on('round:started',   (d) => useGameStore.getState().onStarted(d.roundId));
    socket.on('round:crashed',   (d) => useGameStore.getState().onCrashed(d));
    socket.on('bet:won', (d) => {
      useGameStore.getState().onRoundBetUpdate({
        playerId:          d.playerId,
        amount:            Number(d.amount),
        status:            'WON',
        payout:            Number(d.payout),
        cashoutMultiplier: d.cashoutMultiplier,
      });
  });

    return () => { socket.disconnect(); };
  }, []);

  return socketRef;
}
