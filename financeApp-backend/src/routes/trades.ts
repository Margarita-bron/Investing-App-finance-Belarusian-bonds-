import { Router } from "express";
import { pool } from "../db.ts";
import { getBinancePrice } from "../services/binanceService.ts";
import type { AuthRequest } from "../middleware/auth.ts";

const router = Router();

const VALID_LEVERAGES = [1, 2, 5, 10];

// POST /trades — открыть ставку
router.post("/", async (req: AuthRequest, res) => {
  const { direction, positionSize, durationSeconds, pair, leverage = 1 } = req.body;
  const userId = req.userId!;

  if (!VALID_LEVERAGES.includes(Number(leverage))) {
    return res.status(400).json({ error: "Недопустимое плечо. Допустимые значения: 1, 2, 5, 10" });
  }

  const { rows: userRows } = await pool.query(
    "SELECT balance FROM users WHERE id = $1",
    [userId],
  );
  if (!userRows[0] || userRows[0].balance < positionSize) {
    return res.status(400).json({ error: "Недостаточно средств" });
  }

  // Проверяем нет ли уже открытой ставки
  const { rows: activeTrades } = await pool.query(
    "SELECT id FROM trades WHERE user_id=$1 AND result IS NULL",
    [userId],
  );
  if (activeTrades.length > 0) {
    return res.status(400).json({ error: "Уже есть открытая ставка" });
  }

  const entryPrice = await getBinancePrice(pair || "BTCUSDT");
  const closesAt = new Date(Date.now() + durationSeconds * 1000);

  // Списываем ставку с баланса сразу
  await pool.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [
    positionSize,
    userId,
  ]);

  const { rows } = await pool.query(
    `
    INSERT INTO trades
      (user_id, pair, direction, entry_price, position_size,
       leverage, duration_seconds, closes_at, start_time)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `,
    [
      userId,
      pair || "BTCUSDT",
      direction,
      entryPrice,
      positionSize,
      Number(leverage),
      durationSeconds,
      closesAt,
      Date.now(),
    ],
  );

  res.json(rows[0]);
});

// GET /trades/active — активная ставка (null если нет)
router.get("/active", async (req: AuthRequest, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM trades WHERE user_id=$1 AND result IS NULL LIMIT 1",
    [req.userId],
  );
  res.json(rows[0] ?? null);
});

router.get("/history", async (req: AuthRequest, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM trades
     WHERE user_id=$1 AND result IS NOT NULL
     ORDER BY opens_at DESC LIMIT 50`,
    [req.userId],
  );
  res.json(rows);
});

router.get("/analytics", async (req: AuthRequest, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM trade_analytics WHERE user_id = $1",
    [req.userId],
  );
  res.json(rows[0] ?? null);
});

export default router;
