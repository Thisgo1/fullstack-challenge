import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel } from "amqplib";
import { CreditWalletUseCase } from "@/application/wallet/credit-wallet.use-case";
import { DebitWalletUseCase } from "@/application/wallet/debit-wallet.use-case";

const QUEUE = 'wallet.bet-results';
const EXCHANGE = 'crash.event';

@Injectable()
export class RabbitMQConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConsumer.name);
  private channelWrapper: ChannelWrapper;

  constructor(
    private readonly creditWallet: CreditWalletUseCase,
    private readonly debitWallet: DebitWalletUseCase,   // ← adicionar
  ) {}

  async onModuleInit() {
    const connection = amqp.connect(
      [process.env.RABBITMQ_URL ?? 'amqp://admin:admin@localhost:5672']
    );

    this.channelWrapper = connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
        await channel.assertQueue(QUEUE, { durable: true });
        await channel.bindQueue(QUEUE, EXCHANGE, 'bet.placed');  // ← só uma vez
        await channel.bindQueue(QUEUE, EXCHANGE, 'bet.won');     // ← só uma vez
        await channel.prefetch(1);

        await channel.consume(QUEUE, async (msg) => {
          if (!msg) return;

          try {
            const payload = JSON.parse(msg.content.toString());
            const routingKey = msg.fields.routingKey;

            if (routingKey === 'bet.placed') {
              this.logger.log(`Received bet.placed for player ${payload.playerId}`);
              await this.debitWallet.execute({
                playerId: payload.playerId,
                amount:   BigInt(payload.amount),
              });
            }

            if (routingKey === 'bet.won') {
              this.logger.log(`Received bet.won for player ${payload.playerId}`);
              await this.creditWallet.execute({
                playerId: payload.playerId,
                amount:   BigInt(payload.payout),
              });
            }

            channel.ack(msg);
          } catch (err) {
            this.logger.error('Failed to process message', err);
            channel.nack(msg, false, true);
          }
        });

        this.logger.log('RabbitMQ consumer ready - listening to bet.placed and bet.won');
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channelWrapper.close();
  }
}
