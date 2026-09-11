import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getEnv, getEnvNumber } from '@config/env';
import { QUEUE_NAMES } from './queue.constants';

/**
 * Registers the shared Redis connection for BullMQ and declares all three queues so
 * any feature module can `@InjectQueue(QUEUE_NAMES.X)` or `@Processor(QUEUE_NAMES.X)`
 * without redeclaring connection options.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: getEnv('REDIS_HOST', 'localhost'),
          port: getEnvNumber('REDIS_PORT', 6379),
          password: getEnv('REDIS_PASSWORD', '') || undefined,
          // required by BullMQ
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.TRANSCRIPT_GENERATION },
      { name: QUEUE_NAMES.TRANSCRIPT_READY },
      { name: QUEUE_NAMES.EVALUATION_PROCESSING },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
