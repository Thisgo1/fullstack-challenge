import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { IEventPublisher } from "@/domain/events/event-publisher";

const EXCHANGE = 'crash.event';

@Injectable()
export class RabbitMQEventPublisher implements IEventPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQEventPublisher.name);
  private channelWrapper: ChannelWrapper;

  async onModuleInit() {
    const connection = amqp.connect([process.env.RABBIT_URL ?? 'amqp://admin:admin@localhost:5672']);

    this.channelWrapper = connection.createChannel({
      setup: async (channel: any) => {
        await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
        this.logger.log('RabbitMQ connection ready');
      },
    });
  }

  async publish(routingKey: string, payload: unknown): Promise<void> {
    await this.channelWrapper.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
      },
    );

    this.logger.log(`Published event to ${EXCHANGE} with routing key ${routingKey}`);
  }

  async onModuleDestroy(){
    await this.channelWrapper.close();
  }
}
