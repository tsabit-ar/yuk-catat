import { Router, Response } from 'express';
import { pool } from '../config/db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// All transactions routes require JWT authentication
router.use(authenticateJWT);

/**
 * GET /api/transactions
 * Fetches transactions with dynamically calculated running balance via SQL window functions,
 * opening balance calculation for date filters, and summary metrics.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const startDate = typeof req.query.startDate === 'string' && req.query.startDate.trim() !== ''
      ? req.query.startDate.trim()
      : null;
    const endDate = typeof req.query.endDate === 'string' && req.query.endDate.trim() !== ''
      ? req.query.endDate.trim()
      : null;

    // 1. Calculate Opening Balance (Saldo Awal) before startDate
    let openingBalance = 0;
    if (startDate) {
      const openingResult = await pool.query(
        `SELECT COALESCE(SUM(debit - credit), 0)::numeric AS "openingBalance"
         FROM transactions
         WHERE user_id = $1 AND date < $2`,
        [userId, startDate]
      );
      openingBalance = Number(openingResult.rows[0]?.openingBalance) || 0;
    }

    // 2. Fetch rows with dynamic cumulative runningBalance using SQL window function
    // Partitioned by user_id and ordered chronologically ASC for exact mathematical continuity
    const query = `
      WITH all_computed AS (
        SELECT
          id,
          TO_CHAR(date, 'YYYY-MM-DD') AS date,
          description,
          debit::numeric AS debit,
          credit::numeric AS credit,
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          SUM(debit - credit) OVER (
            PARTITION BY user_id
            ORDER BY date ASC, created_at ASC
          )::numeric AS "runningBalance"
        FROM transactions
        WHERE user_id = $1
      )
      SELECT *
      FROM all_computed
      WHERE ($2::date IS NULL OR date >= $2)
        AND ($3::date IS NULL OR date <= $3)
      ORDER BY date DESC, "createdAt" DESC;
    `;

    const result = await pool.query(query, [userId, startDate, endDate]);

    // Format rows to ensure numeric values
    const displayRows = result.rows.map((row) => ({
      id: row.id,
      date: row.date,
      description: row.description || '',
      debit: Number(row.debit) || 0,
      credit: Number(row.credit) || 0,
      runningBalance: Number(row.runningBalance) || 0,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    }));

    // 3. Compute period totals
    const periodDebit = displayRows.reduce((sum, r) => sum + r.debit, 0);
    const periodCredit = displayRows.reduce((sum, r) => sum + r.credit, 0);
    const closingBalance = openingBalance + periodDebit - periodCredit;

    res.json({
      openingBalance,
      periodDebit,
      periodCredit,
      closingBalance,
      displayRows,
    });
  } catch (error) {
    console.error('[Transactions] GET Error:', error);
    res.status(500).json({ error: 'Gagal memuat data transaksi.' });
  }
});

/**
 * POST /api/transactions
 * Creates a new transaction record.
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { date, description, debit, credit } = req.body;

    const txDate = date || new Date().toISOString().slice(0, 10);
    const txDesc = typeof description === 'string' ? description : '';
    const txDebit = Math.max(0, Math.round(Number(debit) || 0));
    const txCredit = Math.max(0, Math.round(Number(credit) || 0));

    const insertResult = await pool.query(
      `INSERT INTO transactions (user_id, date, description, debit, credit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         TO_CHAR(date, 'YYYY-MM-DD') AS date,
         description,
         debit::numeric AS debit,
         credit::numeric AS credit,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [userId, txDate, txDesc, txDebit, txCredit]
    );

    const created = insertResult.rows[0];

    res.status(201).json({
      id: created.id,
      date: created.date,
      description: created.description,
      debit: Number(created.debit) || 0,
      credit: Number(created.credit) || 0,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (error) {
    console.error('[Transactions] POST Error:', error);
    res.status(500).json({ error: 'Gagal menyimpan transaksi baru.' });
  }
});

/**
 * PUT /api/transactions/:id
 * Updates an existing transaction (debounced auto-save target).
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { date, description, debit, credit } = req.body;

    const txDate = date || new Date().toISOString().slice(0, 10);
    const txDesc = typeof description === 'string' ? description : '';
    const txDebit = Math.max(0, Math.round(Number(debit) || 0));
    const txCredit = Math.max(0, Math.round(Number(credit) || 0));

    const updateResult = await pool.query(
      `UPDATE transactions
       SET date = $1,
           description = $2,
           debit = $3,
           credit = $4,
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING
         id,
         TO_CHAR(date, 'YYYY-MM-DD') AS date,
         description,
         debit::numeric AS debit,
         credit::numeric AS credit,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [txDate, txDesc, txDebit, txCredit, id, userId]
    );

    if (updateResult.rows.length === 0) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan atau bukan milik Anda.' });
      return;
    }

    const updated = updateResult.rows[0];

    res.json({
      id: updated.id,
      date: updated.date,
      description: updated.description,
      debit: Number(updated.debit) || 0,
      credit: Number(updated.credit) || 0,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('[Transactions] PUT Error:', error);
    res.status(500).json({ error: 'Gagal memperbarui transaksi.' });
  }
});

/**
 * DELETE /api/transactions/:id
 * Deletes a transaction owned by the authenticated user.
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const deleteResult = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (deleteResult.rows.length === 0) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan atau tidak memiliki akses hapus.' });
      return;
    }

    res.json({ message: 'Transaksi berhasil dihapus.', id });
  } catch (error) {
    console.error('[Transactions] DELETE Error:', error);
    res.status(500).json({ error: 'Gagal menghapus transaksi.' });
  }
});

export default router;
