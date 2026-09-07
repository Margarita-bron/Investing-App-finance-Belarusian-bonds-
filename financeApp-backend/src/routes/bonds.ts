import { Router } from "express";
import { pool } from "../db.ts";
import { verifyToken } from "../middleware/auth.ts";
import type { AuthRequest } from "../middleware/auth.ts";

const router = Router();

// GET /bonds — все облигации (метрики уже хранятся в БД после парсинга)
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM bonds
      ORDER BY maturity_date ASC, id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Ошибка получения облигаций:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/bonds-test", (_req, res) => {
  res.json({ ok: true });
});

// GET /bonds/recommendations — персональный рейтинг облигаций под риск-профиль
router.get("/recommendations", verifyToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const { rows: profileRows } = await pool.query(
    "SELECT profile, aggressiveness FROM risk_profiles WHERE user_id = $1",
    [userId],
  );
  const profile: string = profileRows[0]?.profile ?? "moderate";
  const aggressiveness: number = Number(profileRows[0]?.aggressiveness ?? 50);

  const { rows: allBonds } = await pool.query("SELECT * FROM bonds");

  // --- type affinity: how well the bond type fits each risk profile (0–100) ---
  const TYPE_AFFINITY: Record<string, Record<string, number>> = {
    conservative: { government: 100, banking: 50,  corporate: 0   },
    moderate:     { government: 80,  banking: 70,  corporate: 40  },
    aggressive:   { government: 30,  banking: 60,  corporate: 100 },
  };

  // --- sub-score weights per profile ---
  const WEIGHTS: Record<string, { type: number; yield: number; safety: number; quality: number; realYield: number }> = {
    conservative: { type: 0.35, yield: 0.10, safety: 0.30, quality: 0.20, realYield: 0.05 },
    moderate:     { type: 0.20, yield: 0.25, safety: 0.20, quality: 0.25, realYield: 0.10 },
    aggressive:   { type: 0.40, yield: 0.35, safety: 0.05, quality: 0.05, realYield: 0.15 },
  };

  // --- hard filters before scoring ---
  // Step 1: type-based pool selection — each profile gets a fundamentally different bond universe
  const TYPE_POOL: Record<string, string[]> = {
    conservative: ["government"],
    moderate:     ["government", "banking"],
    aggressive:   ["corporate", "banking"],
  };
  const allowedTypes = TYPE_POOL[profile] ?? ["government", "banking", "corporate"];
  let filtered = allBonds.filter((b) => allowedTypes.includes(b.type as string));

  // fallback: if type pool is empty (no bonds of those types in DB), use all
  if (filtered.length === 0) filtered = allBonds;

  // Step 2: metric-based filters within the pool
  filtered = filtered.filter((b) => {
    const years = Number(b.years_to_maturity ?? 0);
    const realYield = Number(b.real_yield ?? 0);
    const qualityScore = Number(b.quality_score ?? 0);
    if (profile === "conservative") {
      if (years > 7) return false;
      if (realYield <= 0) return false;
    }
    if (profile === "moderate") {
      if (qualityScore < 20) return false;
    }
    return true;
  });

  // fallback: if metric filters removed everything, use type pool only
  if (filtered.length === 0) {
    filtered = allBonds.filter((b) => allowedTypes.includes(b.type as string));
  }
  if (filtered.length === 0) filtered = allBonds;

  // --- min-max normalization helpers ---
  const vals = (key: string) => filtered.map((b) => Number(b[key] ?? 0));
  const normalize = (val: number, min: number, max: number): number => {
    if (max === min) return 50;
    return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  };

  const ytms      = vals("ytm");
  const realYields = vals("real_yield");
  const minYtm   = Math.min(...ytms);
  const maxYtm   = Math.max(...ytms);
  const minReal  = Math.min(...realYields);
  const maxReal  = Math.max(...realYields);

  const affinity = TYPE_AFFINITY[profile] ?? TYPE_AFFINITY.moderate;
  const w        = WEIGHTS[profile] ?? WEIGHTS.moderate;

  // --- score every bond ---
  const scored = filtered.map((b) => {
    // 1. type_score: issuer category fit
    const type_score = affinity[b.type as string] ?? 50;

    // 2. yield_score: normalized YTM; cap at 70 for conservative (high yield = higher risk)
    let yield_score = normalize(Number(b.ytm ?? 0), minYtm, maxYtm);
    if (profile === "conservative") yield_score = Math.min(yield_score, 70);

    // 3. safety_score: inverse modified duration (shorter = safer, floor 0, ceil 100)
    //    divisor 12 covers the practical upper bound of modified duration in this market
    const safety_score = Math.max(0, (1 - Number(b.modified_duration ?? 0) / 12)) * 100;

    // 4. quality_score: pre-computed 0–100 composite already in DB
    const quality_score = Number(b.quality_score ?? 0);

    // 5. real_yield_score: normalized inflation-adjusted return
    const real_yield_score = normalize(Number(b.real_yield ?? 0), minReal, maxReal);

    const recommendation_score =
      type_score       * w.type     +
      yield_score      * w.yield    +
      safety_score     * w.safety   +
      quality_score    * w.quality  +
      real_yield_score * w.realYield;

    return {
      ...b,
      recommendation_score: Math.round(recommendation_score * 100) / 100,
    };
  });

  scored.sort((a, b) => b.recommendation_score - a.recommendation_score);

  const typeCounts = allBonds.reduce<Record<string, number>>((acc, b) => {
    const t = b.type as string;
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  console.log(`[recommendations] userId=${userId} profile=${profile} allowedTypes=${allowedTypes} filteredCount=${filtered.length} typeCounts=${JSON.stringify(typeCounts)}`);

  res.json({ profile, aggressiveness, recommendations: scored.slice(0, 10) });
});

export default router;
