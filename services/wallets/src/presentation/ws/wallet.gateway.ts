import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  // This is the CRITICAL part for fixing your CORS error
  namespace: '/wallet',
})
@Injectable()
export class WalletGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WalletGateway.name);

  handleConnection(client: Socket) {
    const playerId = client.handshake.query.playerId as string;
    if (playerId) {
      client.join(`player_${playerId}`);
      this.logger.log(`Player ${playerId} connected to Wallet Socket`);
    }
  }

  // This catches the event from your RabbitMQ Consumer
  @OnEvent('wallet.balance.updated')
  handleBalanceUpdate(payload: { playerId: string; newBalance: number }) {
    this.server.to(`player_${payload.playerId}`).emit('balance_changed', {
      balance: payload.newBalance,
    });
  }
}
