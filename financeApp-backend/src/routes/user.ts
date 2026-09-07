import { Router } from "express";
import { pool } from "../db.ts";
import { verifyToken, type AuthRequest } from "../middleware/auth.ts";

const router = Router();

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  console.log("Fetching user data for userId:", userId);
  await pool.query(
    `INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId],
  );
  await pool.query(
    `INSERT INTO trade_analytics (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId],
  );
  await pool.query(
    `INSERT INTO risk_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId],
  );

  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  console.log("User data fetched:", rows[0]);

  res.json(rows[0]);
});

router.post("/sync", verifyToken, async (req: AuthRequest, res) => {
  const { userId } = req;
  const { name, google_photo_url } = req.body;

  await pool.query(
    `
      INSERT INTO users (id, name, google_photo_url)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          google_photo_url = EXCLUDED.google_photo_url
    `,
    [userId, name ?? null, google_photo_url ?? null],
  );

  await pool.query(
    `
      INSERT INTO trade_analytics (user_id)
      VALUES ($1)
      ON CONFLICT DO NOTHING
    `,
    [userId],
  );

  await pool.query(
    `
      INSERT INTO risk_profiles (user_id)
      VALUES ($1)
      ON CONFLICT DO NOTHING
    `,
    [userId],
  );

  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);

  res.json({
    success: true,
    user: rows[0],
  });
});

router.post("/reset", async (req: AuthRequest, res) => {
  await pool.query(
    `UPDATE users SET
       balance = 10000,
       gross_profit = 0,
       gross_lose = 0
     WHERE id = $1`,
    [req.userId],
  );
  res.json({ success: true });
});

export default router;
