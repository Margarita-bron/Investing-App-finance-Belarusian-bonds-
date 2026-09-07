import { Router } from "express";
import { pool } from "../db.ts";
import { getAuth } from "../firebase/firebase.ts";
import { updateBonds } from "../services/updateBonds.ts";

const router = Router();
// All routes here are already protected by verifyAdmin (mounted in index.ts)

// ── Users ─────────────────────────────────────────────────────────────────────

router.get("/users", async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT u.*, rp.profile, rp.composite_score,
           rp.onboarding_score, rp.trading_score, rp.quiz_score, rp.task_score
    FROM users u
    LEFT JOIN risk_profiles rp ON rp.user_id = u.id
    ORDER BY u.created_at DESC
  `);
  res.json(rows);
});

router.get("/users/:id", async (req, res) => {
  const { rows: userRows } = await pool.query(
    `SELECT u.*, rp.profile, rp.composite_score,
            rp.onboarding_score, rp.trading_score, rp.quiz_score, rp.task_score,
            rp.win_rate, rp.aggressiveness
     FROM users u
     LEFT JOIN risk_profiles rp ON rp.user_id = u.id
     WHERE u.id = $1`,
    [req.params.id],
  );
  if (!userRows[0])
    return res.status(404).json({ error: "Пользователь не найден" });

  await pool.query(
    "INSERT INTO trade_analytics (user_id) VALUES ($1) ON CONFLICT DO NOTHING",
    [req.params.id],
  );
  const { rows: analyticsRows } = await pool.query(
    "SELECT * FROM trade_analytics WHERE user_id = $1",
    [req.params.id],
  );

  res.json({ user: userRows[0], analytics: analyticsRows[0] ?? null });
});

// ── Risk profile test questions ───────────────────────────────────────────────

router.get("/questions", async (_req, res) => {
  const { rows: questions } = await pool.query(
    `SELECT * FROM risk_profile_questions ORDER BY "order"`,
  );
  const { rows: options } = await pool.query(
    `SELECT * FROM risk_profile_options ORDER BY question_id, "order"`,
  );
  const result = questions.map((q) => ({
    ...q,
    options: options.filter((o) => o.question_id === q.id),
  }));
  res.json(result);
});

router.post("/questions", async (req, res) => {
  const { textRu, textEn, order, options } = req.body as {
    textRu: string;
    textEn: string;
    order: number;
    options: Array<{
      textRu: string;
      textEn: string;
      score: number;
      order: number;
    }>;
  };

  const { rows } = await pool.query(
    `INSERT INTO risk_profile_questions (text_ru, text_en, "order")
     VALUES ($1,$2,$3) RETURNING *`,
    [textRu, textEn, order],
  );
  const question = rows[0];

  for (const opt of options ?? []) {
    await pool.query(
      `INSERT INTO risk_profile_options (question_id, text_ru, text_en, score, "order")
       VALUES ($1,$2,$3,$4,$5)`,
      [question.id, opt.textRu, opt.textEn, opt.score, opt.order],
    );
  }

  res.status(201).json(question);
});

router.put("/questions/:id", async (req, res) => {
  const { textRu, textEn, order } = req.body;
  const { rows } = await pool.query(
    `UPDATE risk_profile_questions
     SET text_ru=$1, text_en=$2, "order"=$3
     WHERE id=$4 RETURNING *`,
    [textRu, textEn, order, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Вопрос не найден" });
  res.json(rows[0]);
});

router.delete("/questions/:id", async (req, res) => {
  await pool.query("DELETE FROM risk_profile_questions WHERE id=$1", [
    req.params.id,
  ]);
  res.json({ ok: true });
});

// ── Macro data ────────────────────────────────────────────────────────────────

router.get("/macro", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM macro_data ORDER BY created_at DESC LIMIT 1`,
  );
  res.json(rows[0] ?? null);
});

router.put("/macro", async (req, res) => {
  const { inflationRate, avgDepositRate } = req.body as {
    inflationRate: number;
    avgDepositRate: number;
  };

  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const { rows } = await pool.query(
    `INSERT INTO macro_data (month, inflation_rate, avg_deposit_rate)
     VALUES ($1,$2,$3)
     ON CONFLICT (month) DO UPDATE
       SET inflation_rate = $2, avg_deposit_rate = $3
     RETURNING *`,
    [month, inflationRate, avgDepositRate],
  );
  res.json(rows[0]);
});

// ── Admins ────────────────────────────────────────────────────────────────────

router.get("/admins", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT a.*, u.name, u.google_photo_url
     FROM admins a
     LEFT JOIN users u ON u.id = a.id
     ORDER BY a.created_at DESC`,
  );
  res.json(rows);
});

router.post("/admins", async (req, res) => {
  const { uid, createdBy } = req.body as { uid: string; createdBy: string };

  if (!uid) return res.status(400).json({ error: "uid обязателен" });

  // Set Firebase Custom Claim
  await getAuth().setCustomUserClaims(uid, { admin: true });

  const { rows } = await pool.query(
    `INSERT INTO admins (id, created_by) VALUES ($1,$2)
     ON CONFLICT (id) DO NOTHING RETURNING *`,
    [uid, createdBy],
  );

  res.status(201).json(rows[0] ?? { id: uid, created_by: createdBy });
});

router.delete("/admins/:uid", async (req, res) => {
  await getAuth().setCustomUserClaims(req.params.uid, { admin: false });
  await pool.query("DELETE FROM admins WHERE id=$1", [req.params.uid]);
  res.json({ ok: true });
});

// ── Bonds ─────────────────────────────────────────────────────────────────────

router.get("/bonds", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM bonds ORDER BY quality_score DESC NULLS LAST, ytm DESC NULLS LAST`,
  );
  res.json(rows);
});

// ── parseSinglePage config ────────────────────────────────────────────────────

router.get("/parse-config", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT value FROM app_config WHERE key = 'parseSinglePage'`,
  );
  res.json({ code: rows[0]?.value ?? "" });
});

router.put("/parse-config", async (req, res) => {
  const { code } = req.body as { code: string };

  if (typeof code !== "string") {
    return res.status(400).json({ error: "code должен быть строкой" });
  }

  await pool.query(
    `UPDATE app_config SET value=$1, updated_at=NOW() WHERE key='parseSinglePage'`,
    [code],
  );
  res.json({ ok: true });
});

// POST /admin/parse-now — ручной запуск парсинга облигаций
router.post("/parse-now", async (_req, res) => {
  res.json({ ok: true, message: "Парсинг запущен в фоне" });
  // Run after response so client doesn't time out
  updateBonds().catch((e) => console.error("Ошибка парсинга:", e));
});

export default router;
