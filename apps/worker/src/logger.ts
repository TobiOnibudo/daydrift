import { config } from '@daydrift/config';
import { pino } from 'pino';

export const logger = pino({
  name: 'daydrift-worker',
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
});

export type Logger = Pick<typeof logger, 'info' | 'warn' | 'error'>;
