import { Router } from "express";
import { pool } from "../db.ts";
import type { AuthRequest } from "../middleware/auth.ts";

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM companies ORDER BY issuer_name`,
  );
  res.json(rows);
});

router.get("/:issuerName", async (req, res) => {
  const { issuerName } = req.params;

  const { rows } = await pool.query(
    `SELECT * FROM companies WHERE issuer_name ILIKE $1 LIMIT 1`,
    [issuerName],
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "Компания не найдена" });
  }

  res.json(rows[0]);
});

// POST /companies — создать или обновить компанию (только для админов, проверяется в index.ts)
router.post("/", async (req: AuthRequest, res) => {
  const {
    issuerName,
    displayName,
    description,
    website,
    industry,
    logoStoragePath,
  } = req.body as {
    issuerName: string;
    displayName?: string;
    description?: string;
    website?: string;
    industry?: string;
    logoStoragePath?: string;
  };

  if (!issuerName) {
    return res.status(400).json({ error: "issuerName обязателен" });
  }

  const { rows } = await pool.query(
    `INSERT INTO companies
       (issuer_name, display_name, description, website, industry, logo_storage_path, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())
     ON CONFLICT (issuer_name) DO UPDATE SET
       display_name       = COALESCE(EXCLUDED.display_name, companies.display_name),
       description        = COALESCE(EXCLUDED.description, companies.description),
       website            = COALESCE(EXCLUDED.website, companies.website),
       industry           = COALESCE(EXCLUDED.industry, companies.industry),
       logo_storage_path  = COALESCE(EXCLUDED.logo_storage_path, companies.logo_storage_path),
       updated_at         = NOW()
     RETURNING *`,
    [
      issuerName,
      displayName ?? null,
      description ?? null,
      website ?? null,
      industry ?? null,
      logoStoragePath ?? null,
    ],
  );

  res.json(rows[0]);
});

export default router;
