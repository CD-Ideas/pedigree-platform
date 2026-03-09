import winston from 'winston';

const fmt = process.env.NODE_ENV === 'production'
  ? winston.format.combine(winston.format.timestamp(), winston.format.json())
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`)
    );

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fmt,
  transports: [new winston.transports.Console()],
});
