import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel } from "amqplib";
import { CreditWalletUseCase } from "@/application/wallet/credit-wallet.use-case";

const QUEUE = 'wallet.bet-results';
const EXCHANGE = 'crash.event';

@Injectable()
export class RabbitMQConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConsumer.name);
  private channelWrapper: ChannelWrapper;

  constructor(private readonly creditWallet: CreditWalletUseCase){}

  async onModuleInit() {
    const connection = amqp.connect(
      [process.env.RABBIT_URL ?? 'amqp://admin:admin@localhost:5672']
    );

    this.channelWrapper = connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
        await channel.assertQueue(QUEUE, { durable: true});
        await channel.bindQueue(QUEUE, EXCHANGE, 'bet.won');

        await channel.prefetch(1);

        await channel.consume(QUEUE, async (msg) => {
          if (!msg) return;

          try {
            const payload = JSON.parse(msg.content.toString());
            this.logger.log(`Received bet.won gor player ${payload.playerId} with amount ${payload.amount}`);

            await this.creditWallet.execute({
              playerId: payload.playerId,
              amount: payload.amount,
            });

            channel.ack(msg);
          } catch (err) {
            this.logger.error('Failed to process bet.won', err)
            channel.nack(msg, false, true); // requeue the message for retry
          }
        });
        this.logger.log('RabbitMQ consumer ready - listening to bet.won events');
      }
    });
  }
  async onModuleDestroy(): Promise<void> {
    await this.channelWrapper.close();
  }
}
