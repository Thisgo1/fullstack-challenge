export interface IEventPublisher {
  publish(routingKey: string, payload: unknown): Promise<void>;
}

export const EVENT_PUBLISHER = 'EVENT_PUBLISHER';
