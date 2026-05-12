import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameLoopService } from '@/application/round/game-loop.service';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  port: 4001,
  namespace: '/game',
})

@Injectable()
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
  {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(GameGateway.name);
    private tickInterval: ReturnType<typeof setInterval> | null = null;

    constructor(private readonly gameLoop: GameLoopService) {}

    afterInit(): void {
      this.logger.log('WebSocket Gateway initialize');
      this.startTicking();
    }

    handleConnection(client: Socket) {
      this.logger.log(`Client connected: ${client.id}`);

      client.emit('round:state', {
        roundId: this.gameLoop.currentRoundId,
        multiplier: this.gameLoop.currentMultiplier,
        display: (this.gameLoop.currentMultiplier / 100).toFixed(2),
      });
    }

    handleDisconnect(client: Socket): void{
      this.logger.log(`Client disconnected: ${client.id}`);
    }

    @OnEvent('round.betting')
    onRoundBetting(payload: any): void {
      this.server.emit('round:betting', payload)
    }
    @OnEvent('round.started')
    onRoundStarted(payload: any): void {
      this.server.emit('round:started', payload);
    }

    @OnEvent('bet.placed')
    onBetPlaced(payload: any): void {
      this.server.emit('bet:placed', {
        playerId: payload.playerId,
        amount:   payload.amount,
      });
    }

    @OnEvent('bet.won')
    onBetWon(payload: any): void {
      this.server.emit('bet:won', {
        playerId:          payload.playerId,
        amount:            payload.amount,
        payout:            payload.payout,
        cashoutMultiplier: payload.cashoutMultiplier,
      });
    }

    @OnEvent('round.crashed')
    onRoundCrashed(payload: any): void {
      this.server.emit('round:crashed', payload);
    }

    private startTicking(): void {
      this.tickInterval = setInterval(() => {
        if (!this.gameLoop.currentRoundId) return;

        this.server.emit('multiplier:tick', {
          roundId: this.gameLoop.currentRoundId,
          multiplier: this.gameLoop.currentMultiplier,
          display: (this.gameLoop.currentMultiplier / 100).toFixed(2),
        });
      }, 100);
    }
  }
