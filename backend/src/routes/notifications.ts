import { Router, Response } from 'express';
import webpush from 'web-push';
import { pool } from '../config/db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// Configure web-push with VAPID keys if provided
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@yukcatat.local';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('[WebPush] VAPID details configured successfully.');
  } catch (err) {
    console.warn('[WebPush] Error setting VAPID details:', err);
  }
}

// All notification routes require authentication
router.use(authenticateJWT);

/**
 * GET /api/notifications/config
 * Retrieves the user's notification settings.
 */
router.get('/config', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const result = await pool.query(
      'SELECT reminder_time AS "reminderTime", days_of_week AS "daysOfWeek", is_enabled AS "isEnabled" FROM notification_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default
      res.json({
        reminderTime: '20:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        isEnabled: true,
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Notifications] Config GET Error:', error);
    res.status(500).json({ error: 'Gagal mengambil pengaturan notifikasi.' });
  }
});

/**
 * POST /api/notifications/schedule
 * Saves or updates user's daily reminder schedule.
 */
router.post('/schedule', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { reminderTime, daysOfWeek, isEnabled } = req.body;

    const time = typeof reminderTime === 'string' ? reminderTime : '20:00';
    const days = Array.isArray(daysOfWeek) ? daysOfWeek : [1, 2, 3, 4, 5, 6, 7];
    const enabled = typeof isEnabled === 'boolean' ? isEnabled : true;

    await pool.query(
      `INSERT INTO notification_settings (user_id, reminder_time, days_of_week, is_enabled, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         reminder_time = EXCLUDED.reminder_time,
         days_of_week = EXCLUDED.days_of_week,
         is_enabled = EXCLUDED.is_enabled,
         updated_at = NOW()`,
      [userId, time, days, enabled]
    );

    res.json({
      message: 'Jadwal pengingat berhasil disimpan.',
      reminderTime: time,
      daysOfWeek: days,
      isEnabled: enabled,
    });
  } catch (error) {
    console.error('[Notifications] Schedule Error:', error);
    res.status(500).json({ error: 'Gagal memperbarui jadwal notifikasi.' });
  }
});

/**
 * POST /api/notifications/subscribe
 * Registers or updates a client browser Web Push subscription endpoint.
 */
router.post('/subscribe', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      res.status(400).json({ error: 'Payload subscription web push tidak valid.' });
      return;
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         keys_p256dh = EXCLUDED.keys_p256dh,
         keys_auth = EXCLUDED.keys_auth,
         created_at = NOW()`,
      [userId, endpoint, p256dh, auth]
    );

    res.status(201).json({ message: 'Browser berhasil terdaftar untuk Web Push.' });
  } catch (error) {
    console.error('[Notifications] Subscribe Error:', error);
    res.status(500).json({ error: 'Gagal mendaftarkan langganan push.' });
  }
});

/**
 * POST /api/notifications/test-push
 * Dispatches an immediate test push notification to user's registered browser endpoints.
 */
router.post('/test-push', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      res.status(503).json({
        error: 'VAPID keys belum dikonfigurasi di environment server. Harap atur VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY.',
      });
      return;
    }

    const subsResult = await pool.query(
      'SELECT id, endpoint, keys_p256dh, keys_auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    if (subsResult.rows.length === 0) {
      res.status(404).json({
        error: 'Belum ada perangkat browser yang terdaftar untuk akun ini. Pastikan Anda telah mengizinkan notifikasi di browser.',
      });
      return;
    }

    const payload = JSON.stringify({
      title: 'YukCatat - Uji Coba Pengingat',
      body: 'Notifikasi Web Push dari server berhasil terhubung!',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: '/' },
    });

    let sentCount = 0;
    const expiredIds: number[] = [];

    for (const sub of subsResult.rows) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sentCount++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredIds.push(sub.id);
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await pool.query('DELETE FROM push_subscriptions WHERE id = ANY($1)', [expiredIds]);
    }

    res.json({
      message: `Notifikasi uji coba berhasil dikirim ke ${sentCount} endpoint perangkat.`,
      sentCount,
    });
  } catch (error) {
    console.error('[Notifications] Test Push Error:', error);
    res.status(500).json({ error: 'Gagal mengirimkan notifikasi uji coba.' });
  }
});

export default router;
