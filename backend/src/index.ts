import app from './app.js';
import { initDatabase } from './config/db.js';
import { startReminderScheduler } from './services/scheduler.js';

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Only start the standalone HTTP listener in non-serverless environments (local dev/standalone VPS)
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(`🚀 YukCatat Backend Server Berjalan!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🌐 Client Origin Terizinkan: ${CLIENT_ORIGIN}`);
    console.log(`=========================================`);

    // Initialize DB tables
    await initDatabase();

    // Start Cron Scheduler (will self-disable in production/serverless)
    startReminderScheduler();
  });
}

export { app };
export default app;
