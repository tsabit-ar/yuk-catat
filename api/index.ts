import app from '../backend/src/app.js';
import { initDatabase } from '../backend/src/config/db.js';

// Initialize Neon database schema on lambda cold start (idempotent CREATE TABLE IF NOT EXISTS)
initDatabase().catch((err) => {
  console.error('[Vercel Serverless] Error initializing database schema:', err);
});

export default app;
