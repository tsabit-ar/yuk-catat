import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/db.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import notificationRoutes from './routes/notifications.js';
import { startReminderScheduler } from './services/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// CORS configuration
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

// Health check route
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'YukCatat API Backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 Fallback
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Rute ${req.method} ${req.originalUrl} tidak ditemukan.` });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`=========================================`);
  console.log(`🚀 YukCatat Backend Server Berjalan!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🌐 Client Origin Terizinkan: ${CLIENT_ORIGIN}`);
  console.log(`=========================================`);

  // Initialize DB tables
  await initDatabase();

  // Start Cron Scheduler
  startReminderScheduler();
});

export default app;
