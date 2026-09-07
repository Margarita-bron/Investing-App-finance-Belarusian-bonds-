import { pool } from "../db.ts";

export type MacroData = {
  month: string;
  inflationRate: number;
  avgDepositRate: number;
};

export async function updateMacroData(
  inflationRate: number,
  avgDepositRate: number,
) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const monthStr = `${year}-${month}`;
  try {
    await pool.query(
      `
    INSERT INTO macro_data (month, inflation_rate, avg_deposit_rate)
    VALUES ($1, $2, $3)
    ON CONFLICT (month) DO UPDATE
    SET inflation_rate = EXCLUDED.inflation_rate,
        avg_deposit_rate = EXCLUDED.avg_deposit_rate
    `,
      [monthStr, inflationRate, avgDepositRate],
    );
  } catch (e) {
    throw e;
  }
}

export async function getLatestMacro(): Promise<MacroData> {
  const res = await pool.query<MacroData>(
    `
    SELECT
      month,
      inflation_rate AS "inflationRate",
      avg_deposit_rate AS "avgDepositRate"
    FROM macro_data
    ORDER BY created_at DESC
    LIMIT 1
  `,
  );

  if (res.rows.length === 0) {
    throw new Error("No macro data found. Run migration + first update.");
  }

  return res.rows[0];
}
