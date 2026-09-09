import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();
if (!process.env.DATABASE_URL) {
  const backendEnvPath = path.resolve(process.cwd(), 'backend/.env');
  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
  }
}

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Initializes required tables in PostgreSQL / Neon if they do not exist yet.
 */
export async function initDatabase(): Promise<void> {
  if (!connectionString) {
    console.warn('[DB] DATABASE_URL tidak terdefinisi di environment. Server tetap berjalan, namun fitur database akan gagal sampai DATABASE_URL dikonfigurasi.');
    return;
  }

  try {
    const client = await pool.connect();
    try {
      console.log('[DB] Terhubung ke database PostgreSQL/Neon. Menyiapkan schema tabel...');

      await client.query(`
        -- 1. Users Table
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- 2. Transactions Table
        CREATE TABLE IF NOT EXISTS transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          description TEXT DEFAULT '',
          debit NUMERIC(15, 2) DEFAULT 0,
          credit NUMERIC(15, 2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Indexes for transaction performance
        CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date ASC, created_at ASC);

        -- 3. Push Subscriptions Table
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- 4. Notification Settings Table
        CREATE TABLE IF NOT EXISTS notification_settings (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          reminder_time VARCHAR(5) DEFAULT '20:00',
          days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
          is_enabled BOOLEAN DEFAULT true,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      console.log('[DB] Schema tabel database berhasil diverifikasi/dibuat.');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DB] Gagal menginisialisasi koneksi database:', error);
  }
}
