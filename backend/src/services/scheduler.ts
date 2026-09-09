import cron from 'node-cron';
import webpush from 'web-push';
import { pool } from '../config/db.js';

/**
 * Gets current hour, minute, and day of week in Asia/Jakarta timezone.
 */
export function getJakartaDateTime(): { currentTime: string; currentDay: number } {
  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  const currentTime = `${hour}:${minute}`;

  const weekdayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
  }).format(now);

  const dayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  const currentDay = dayMap[weekdayStr] || 1;
  return { currentTime, currentDay };
}

/**
 * Executes a single evaluation pass of scheduled reminders.
 * Can be invoked on-demand by serverless cron endpoint or locally by node-cron.
 */
export async function executeScheduledReminders(): Promise<{
  currentTime: string;
  currentDay: number;
  activeCount: number;
  sentCount: number;
  expiredCount: number;
}> {
  const { currentTime, currentDay } = getJakartaDateTime();

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys belum dikonfigurasi di environment server.');
  }

  // Ensure VAPID details are configured
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@yukcatat.local';
  webpush.setVapidDetails(VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  // Query users whose reminder time and day match right now
  const query = `
    SELECT
      ns.user_id,
      ps.id AS sub_id,
      ps.endpoint,
      ps.p256dh,
      ps.auth
    FROM notification_settings ns
    JOIN push_subscriptions ps ON ns.user_id = ps.user_id
    WHERE ns.is_enabled = true
      AND ns.reminder_time = $1
      AND $2 = ANY(ns.days_of_week)
  `;

  const result = await pool.query(query, [currentTime, currentDay]);

  if (result.rows.length === 0) {
    return {
      currentTime,
      currentDay,
      activeCount: 0,
      sentCount: 0,
      expiredCount: 0,
    };
  }

  console.log(
    `[Scheduler] Menemukan ${result.rows.length} langganan push aktif untuk waktu ${currentTime} (Hari ke-${currentDay} WIB). Mengirim pengingat...`
  );

  const payload = JSON.stringify({
    title: 'YukCatat - Pengingat Harian',
    body: 'Sudahkah Anda mencatat pemasukan dan pengeluaran hari ini?',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: '/' },
  });

  let sentCount = 0;
  const expiredIds: (string | number)[] = [];

  for (const row of result.rows) {
    const pushSubscription = {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
      sentCount++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        expiredIds.push(row.sub_id);
      }
    }
  }

  if (expiredIds.length > 0) {
    await pool.query('DELETE FROM push_subscriptions WHERE id = ANY($1)', [expiredIds]);
    console.log(`[Scheduler] Membersihkan ${expiredIds.length} langganan push yang sudah kedaluwarsa.`);
  }

  return {
    currentTime,
    currentDay,
    activeCount: result.rows.length,
    sentCount,
    expiredCount: expiredIds.length,
  };
}

/**
 * Starts the background cron job to evaluate and send daily reminders.
 * In serverless (Vercel) or production, in-memory node-cron is disabled.
 */
export function startReminderScheduler(): void {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    console.log(
      '[Scheduler] In-memory node-cron dinonaktifkan untuk environment serverless/produksi. Pengingat dijalankan via endpoint /api/notifications/run-cron.'
    );
    return;
  }

  console.log('[Scheduler] Cron scheduler lokal diinisialisasi (setiap menit: * * * * *).');

  cron.schedule('* * * * *', async () => {
    try {
      await executeScheduledReminders();
    } catch (error) {
      console.error('[Scheduler] Error pada evaluasi cron pengingat harian:', error);
    }
  });
}
