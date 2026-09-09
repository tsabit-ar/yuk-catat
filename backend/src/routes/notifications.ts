import { Router, Request, Response } from 'express';
import webpush from 'web-push';
import { pool } from '../config/db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth.js';
import { executeScheduledReminders } from '../services/scheduler.js';

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

// Public endpoint to fetch VAPID public key for browser PushManager subscription
router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY || '' });
});

/**
 * GET /api/notifications/run-cron
 * Serverless trigger endpoint for scheduled reminders (e.g. Vercel Cron).
 * Protected by CRON_SECRET via Authorization: Bearer <CRON_SECRET> or query param ?secret=<CRON_SECRET>.
 */
router.get('/run-cron', async (req: Request, res: Response): Promise<void> => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const querySecret = (req.query.secret as string) || (req.query.cron_secret as string);

  // If CRON_SECRET is configured, enforce matching token
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
    console.error('[Notifications] Run-Cron Error:', error);
    res.status(500).json({ error: (error as Error).message || 'Gagal menjalankan cron pengingat.' });
  }
});

// All notification routes below require user authentication
router.use(authenticateJWT);

/**
 * Handler for retrieving reminder schedule config.
 */
const getScheduleHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
};

router.get('/config', getScheduleHandler);
router.get('/schedule', getScheduleHandler);

/**
 * Handler for saving/updating reminder schedule config.
 */
const saveScheduleHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const body = req.body || {};

    const reminderTime = body.reminderTime || body.reminder_time || '20:00';
    const daysOfWeek = body.daysOfWeek || body.days_of_week || [1, 2, 3, 4, 5, 6, 7];
    const isEnabled = typeof body.isEnabled === 'boolean'
      ? body.isEnabled
      : typeof body.is_enabled === 'boolean'
      ? body.is_enabled
      : true;

    const time = typeof reminderTime === 'string' ? reminderTime : '20:00';
    const days = Array.isArray(daysOfWeek) ? daysOfWeek : [1, 2, 3, 4, 5, 6, 7];
    const enabled = Boolean(isEnabled);

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
};

router.post('/schedule', saveScheduleHandler);
router.put('/schedule', saveScheduleHandler);

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
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
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
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
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
    const expiredIds: (string | number)[] = [];

    for (const sub of subsResult.rows) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
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
