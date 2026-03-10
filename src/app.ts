import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { authRouter }         from './api/routes/auth.routes';
import { dogRouter }          from './api/routes/dog.routes';
import { breederRouter }      from './api/routes/breeder.routes';
import { kennelRouter }       from './api/routes/kennel.routes';
import { litterRouter }       from './api/routes/litter.routes';
import { pedigreeRouter }     from './api/routes/pedigree.routes';
import { registrationRouter } from './api/routes/registration.routes';
import { imageRouter }        from './api/routes/image.routes';
import { healthRouter }       from './api/routes/health.routes';

import { globalRateLimiter }  from './api/middleware/rateLimiter';
import { errorHandler, notFound } from './api/middleware/errorHandler';
import { logger }             from './lib/logger';

const app = express();

app.set('trust proxy', 1);

app.get('/', (_req, res) => {
  res.json({
    name: "TrueMark Registry API",
    status: "running",
    version: "v1"
  });
});

// ─── Security & Parsing ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ─── Rate Limiting ─────────────────────────────────────────────────────────
app.use('/api/', globalRateLimiter);

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/ping', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API Routes ────────────────────────────────────────────────────────────
const V1 = '/api/v1';
app.use(`${V1}/auth`,           authRouter);
app.use(`${V1}/dogs`,           dogRouter);
app.use(`${V1}/breeders`,       breederRouter);
app.use(`${V1}/kennels`,        kennelRouter);
app.use(`${V1}/litters`,        litterRouter);
app.use(`${V1}/pedigree`,       pedigreeRouter);
app.use(`${V1}/registrations`,  registrationRouter);
app.use(`${V1}/images`,         imageRouter);
app.use(`${V1}/health-records`, healthRouter);

// ─── Error Handling ────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
