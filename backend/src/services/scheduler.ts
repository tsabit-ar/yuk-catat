import cron from 'node-cron';
import webpush from 'web-push';
import { pool } from '../config/db.js';

/**
 * Gets current hour, minute, and day of week in Asia/Jakarta timezone.
 */
function getJakartaDateTime(): { currentTime: string; currentDay: number } {
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
 * Starts the background cron job to evaluate and send daily reminders.
 */
export function startReminderScheduler(): void {
  console.log('[Scheduler] Cron scheduler diinisialisasi (setiap menit: * * * * *).');

  cron.schedule('* * * * *', async () => {
    try {
      const { currentTime, currentDay } = getJakartaDateTime();

      // Check if VAPID keys are present
      if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        return;
      }

      // Query users whose reminder time and day match right now
      const query = `
        SELECT
          ns.user_id,
          ps.id AS sub_id,
          ps.endpoint,
          ps.keys_p256dh,
          ps.keys_auth
        FROM notification_settings ns
        JOIN push_subscriptions ps ON ns.user_id = ps.user_id
        WHERE ns.is_enabled = true
          AND ns.reminder_time = $1
          AND $2 = ANY(ns.days_of_week)
      `;

      const result = await pool.query(query, [currentTime, currentDay]);

      if (result.rows.length === 0) {
        return;
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

      const expiredIds: number[] = [];

      for (const row of result.rows) {
        const pushSubscription = {
          endpoint: row.endpoint,
          keys: {
            p256dh: row.keys_p256dh,
            auth: row.keys_auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          // Delete expired endpoints if push returns status 410 or 404
          if (statusCode === 410 || statusCode === 404) {
            expiredIds.push(row.sub_id);
          }
        }
      }

      if (expiredIds.length > 0) {
        await pool.query('DELETE FROM push_subscriptions WHERE id = ANY($1)', [expiredIds]);
        console.log(`[Scheduler] Membersihkan ${expiredIds.length} langganan push yang sudah kedaluwarsa.`);
      }
    } catch (error) {
      console.error('[Scheduler] Error pada evaluasi cron pengingat harian:', error);
    }
  });
}
