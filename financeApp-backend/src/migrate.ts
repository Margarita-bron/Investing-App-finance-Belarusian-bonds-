import { pool } from "./db.ts";

async function migrate() {
  // Drop in dependency order (children first)
  await pool.query(`DROP TABLE IF EXISTS lesson_task_results CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS lesson_quiz_results CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS user_risk_test_responses CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS risk_profile_options CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS risk_profile_questions CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS app_config CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS companies CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS risk_profiles CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS trade_analytics CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS trades CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS bonds CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS macro_data CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS users CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS courses CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS lessons CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS tasks CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS questions CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS admins CASCADE`);
  console.log("🗑️  Старые таблицы удалены");

  // ── Core user data ────────────────────────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY,
      name VARCHAR(255),
      google_photo_url VARCHAR(255),
      balance DECIMAL DEFAULT 10000,
      deposit DECIMAL DEFAULT 10000,
      gross_profit DECIMAL DEFAULT 0,
      gross_lose DECIMAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ users");

  // ── Educational content (metadata only; content lives in Firestore) ───────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id VARCHAR PRIMARY KEY,
      name VARCHAR(255),
      created_by VARCHAR(255),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ courses");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lessons (
      id VARCHAR PRIMARY KEY,
      document_id VARCHAR(255),
      title VARCHAR(255),
      created_by VARCHAR(255),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ lessons");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id VARCHAR(255),
      title VARCHAR(255),
      created_by VARCHAR(255),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      lesson_id VARCHAR REFERENCES lessons(id) ON DELETE SET NULL
    )
  `);
  console.log("✅ tasks");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id VARCHAR(255),
      title VARCHAR(255),
      created_by VARCHAR(255),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      lesson_id VARCHAR REFERENCES lessons(id) ON DELETE SET NULL
    )
  `);
  console.log("✅ questions");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id VARCHAR PRIMARY KEY NOT NULL,
      created_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ admins");

  // ── Bonds ─────────────────────────────────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bonds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      issuer VARCHAR(255) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('government','corporate','banking')),
      currency VARCHAR(10) NOT NULL,
      nominal_value NUMERIC(18,4) NOT NULL,
      current_price NUMERIC(18,4) NOT NULL,
      coupon_rate NUMERIC(8,4) NOT NULL,
      coupon_frequency INTEGER NOT NULL DEFAULT 12,
      maturity_date DATE NOT NULL,
      coupon_amount NUMERIC(18,4),
      next_coupon_date DATE,
      ytm NUMERIC,
      duration NUMERIC,
      modified_duration NUMERIC,
      years_to_maturity NUMERIC,
      quality_score NUMERIC(5,2),
      real_yield NUMERIC(6,4),
      spread_over_deposit NUMERIC(6,4),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (name, issuer)
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_bonds_type     ON bonds (type)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_bonds_currency ON bonds (currency)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_bonds_maturity ON bonds (maturity_date)`,
  );
  console.log("✅ bonds");

  // ── Company info for bond issuers ─────────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      issuer_name TEXT UNIQUE NOT NULL,
      display_name TEXT,
      description TEXT,
      website TEXT,
      industry TEXT,
      logo_storage_path TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ companies");

  // ── Macro data ────────────────────────────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS macro_data (
      id SERIAL PRIMARY KEY,
      month TEXT NOT NULL,
      inflation_rate NUMERIC(8,4) NOT NULL,
      avg_deposit_rate NUMERIC(8,4) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(month)
    )
  `);
  console.log("✅ macro_data");

  // ── Trades ────────────────────────────────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR REFERENCES users(id),
      pair VARCHAR DEFAULT 'BTCUSDT',
      direction VARCHAR NOT NULL,
      entry_price DECIMAL NOT NULL,
      exit_price DECIMAL,
      position_size DECIMAL NOT NULL,
      leverage INTEGER NOT NULL DEFAULT 1,
      duration_seconds INTEGER NOT NULL,
      opens_at TIMESTAMP DEFAULT NOW(),
      closes_at TIMESTAMP NOT NULL,
      start_time BIGINT,
      end_time BIGINT,
      result VARCHAR
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_trades_user_id  ON trades (user_id)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_trades_closes_at ON trades (closes_at)`,
  );
  console.log("✅ trades");

  // ── Trade analytics ───────────────────────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trade_analytics (
      user_id VARCHAR PRIMARY KEY REFERENCES users(id),

      total_trades INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      total_profit DECIMAL DEFAULT 0,
      total_loss DECIMAL DEFAULT 0,
      equity DECIMAL DEFAULT 0,
      peak_equity DECIMAL DEFAULT 0,
      max_drawdown DECIMAL DEFAULT 0,

      current_win_streak INTEGER DEFAULT 0,
      longest_win_streak INTEGER DEFAULT 0,
      current_lose_streak INTEGER DEFAULT 0,
      longest_lose_streak INTEGER DEFAULT 0,

      loss_followed_by_trade_count INTEGER DEFAULT 0,
      total_growth_after_loss DECIMAL DEFAULT 0,
      growth_up_sum DECIMAL DEFAULT 0,
      growth_up_count INTEGER DEFAULT 0,
      growth_down_sum DECIMAL DEFAULT 0,
      growth_down_count INTEGER DEFAULT 0,
      position_change_count_after_loss INTEGER DEFAULT 0,
      max_growth_after_loss DECIMAL DEFAULT 1,
      min_growth_after_loss DECIMAL DEFAULT 1,
      double_after_loss_count INTEGER DEFAULT 0,

      total_position_size DECIMAL DEFAULT 0,
      max_position_size DECIMAL DEFAULT 0,
      min_position_size DECIMAL DEFAULT 0,
      total_trade_duration DECIMAL DEFAULT 0,
      fast_trades INTEGER DEFAULT 0,

      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ trade_analytics");

  // ── Risk profile (composite scoring) ─────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS risk_profiles (
      user_id VARCHAR PRIMARY KEY REFERENCES users(id),
      profile VARCHAR CHECK (profile IN ('conservative','moderate','aggressive')),
      -- Individual component scores (0–100 each)
      onboarding_score NUMERIC(5,2) DEFAULT 0,
      trading_score NUMERIC(5,2) DEFAULT 0,
      quiz_score NUMERIC(5,2) DEFAULT 0,
      task_score NUMERIC(5,2) DEFAULT 0,
      -- Weighted composite (0–100): onboarding×0.4 + trading×0.3 + quiz×0.2 + task×0.1
      composite_score NUMERIC(5,2) DEFAULT 0,
      -- Legacy fields kept for backward compat
      win_rate DECIMAL,
      aggressiveness DECIMAL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ risk_profiles");

  // ── Risk profile onboarding test ──────────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS risk_profile_questions (
      id SERIAL PRIMARY KEY,
      text_ru TEXT NOT NULL,
      text_en TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ risk_profile_questions");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS risk_profile_options (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES risk_profile_questions(id) ON DELETE CASCADE,
      text_ru TEXT NOT NULL,
      text_en TEXT NOT NULL,
      score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 4),
      "order" INTEGER NOT NULL
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_options_question ON risk_profile_options (question_id)`,
  );
  console.log("✅ risk_profile_options");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_risk_test_responses (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id VARCHAR NOT NULL,
      option_id VARCHAR NOT NULL,
      score INTEGER NOT NULL,
      answered_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_responses_user ON user_risk_test_responses (user_id)`,
  );
  console.log("✅ user_risk_test_responses");

  // ── Lesson quiz & task results ────────────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lesson_quiz_results (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      selected_answer TEXT,
      correct_answer TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL,
      thinking_time_ms INTEGER NOT NULL DEFAULT 0,
      completed_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON lesson_quiz_results (user_id)`,
  );
  console.log("✅ lesson_quiz_results");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lesson_task_results (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL,
      task_text TEXT NOT NULL,
      user_answer TEXT,
      is_correct BOOLEAN NOT NULL,
      thinking_time_ms INTEGER NOT NULL DEFAULT 0,
      completed_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_task_results_user ON lesson_task_results (user_id)`,
  );
  console.log("✅ lesson_task_results");

  // ── Admin-editable app config (key/value) ─────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Seed the parseSinglePage config slot so the admin panel always finds a row
  await pool.query(`
    INSERT INTO app_config (key, value)
    VALUES ('parseSinglePage', '')
    ON CONFLICT (key) DO NOTHING
  `);
  console.log("✅ app_config");

  console.log("\n✅ Миграция завершена!");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Ошибка миграции:", err);
  process.exit(1);
});
