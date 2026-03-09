import 'dotenv/config';
import app from './app';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('✅  PostgreSQL connected');
  } catch (err) {
    logger.error('❌  DB connection failed', err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    logger.info(`🚀  API running → http://localhost:${PORT}/api/v1`);
    logger.info(`    NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} — shutting down`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap();
