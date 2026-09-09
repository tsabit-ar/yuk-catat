import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import notificationRoutes from './routes/notifications.js';
import { executeScheduledReminders } from './services/scheduler.js';

import path from 'path';
import fs from 'fs';

dotenv.config();
if (!process.env.DATABASE_URL) {
  const backendEnvPath = path.resolve(process.cwd(), 'backend/.env');
  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
  }
}

const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Permissive CORS configuration supporting localhost, Vercel deployments, and same-origin
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, serverless cron, or same-origin)
      if (!origin) return callback(null, true);
      // Allow localhost, 127.0.0.1, Vercel previews (*.vercel.app), and configured CLIENT_ORIGIN
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.vercel.app') ||
        origin === CLIENT_ORIGIN
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'CRON_SECRET', 'cron_secret'],
  })
);

// Body parser
app.use(express.json());

// Request logger middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check route (supports both /api/health and /health)
const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'YukCatat API Backend (Serverless Ready)',
    timestamp: new Date().toISOString(),
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Top-level serverless cron trigger alias: GET /api/cron or /cron
const cronHandler = async (req: Request, res: Response): Promise<void> => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const querySecret = (req.query.secret as string) || (req.query.cron_secret as string);

  if (cronSecret) {
    const isBearerMatch = authHeader === `Bearer ${cronSecret}`;
    const isQueryMatch = querySecret === cronSecret;
    if (!isBearerMatch && !isQueryMatch) {
      res.status(401).json({ error: 'Akses ditolak: CRON_SECRET tidak valid.' });
      return;
    }
  }

  try {
    const result = await executeScheduledReminders();
    res.json({
      message: 'Cron pengingat harian berhasil dijalankan.',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: unknown) {
    console.error('[App] Cron Error:', error);
    res.status(500).json({ error: (error as Error).message || 'Gagal menjalankan cron pengingat.' });
  }
};
app.get('/api/cron', cronHandler);
app.get('/cron', cronHandler);

// API Routes mounted on both /api/* and root /* to defend against any rewrite path stripping
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/transactions', transactionRoutes);
app.use('/transactions', transactionRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);

// 404 Fallback
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Rute ${req.method} ${req.originalUrl} tidak ditemukan.` });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
});

export { app };
export default app;
