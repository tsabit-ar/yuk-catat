import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_super_aman_yukcatat_123';

/**
 * POST /api/auth/register
 * Registers a new user account.
 */
router.post('/register', async (req, res): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nama, email, dan kata sandi wajib diisi.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Kata sandi minimal harus 6 karakter.' });
      return;
    }

    const emailLower = email.trim().toLowerCase();

    // Check if user already exists
    const existingCheck = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower]);
    if (existingCheck.rows.length > 0) {
      res.status(409).json({ error: 'Email ini sudah terdaftar. Silakan masuk menggunakan akun Anda.' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at AS "createdAt"`,
      [name.trim(), emailLower, hashedPassword]
    );

    const newUser = insertResult.rows[0];

    // Seed default notification settings
    await pool.query(
      `INSERT INTO notification_settings (user_id, reminder_time, days_of_week, is_enabled)
       VALUES ($1, '20:00', '{1,2,3,4,5,6,7}', true)
       ON CONFLICT (user_id) DO NOTHING`,
      [newUser.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Registrasi berhasil.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error('[Auth] Register Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat registrasi.' });
  }
});

/**
 * POST /api/auth/login
 * Logs in an existing user.
 */
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      return;
    }

    const emailLower = email.trim().toLowerCase();

    // Find user
    const result = await pool.query(
      'SELECT id, name, email, password, created_at AS "createdAt" FROM users WHERE email = $1',
      [emailLower]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
      return;
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Auth] Login Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat proses login.' });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile.
 */
router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const result = await pool.query(
      'SELECT id, name, email, created_at AS "createdAt" FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('[Auth] Me Error:', error);
    res.status(500).json({ error: 'Gagal memuat profil pengguna.' });
  }
});

export default router;
