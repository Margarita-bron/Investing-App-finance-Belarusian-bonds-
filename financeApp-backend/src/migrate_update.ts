import { pool } from "./db.ts";

async function migrate() {
  await pool.query(`DROP TABLE IF EXISTS courses CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS lessons CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS tasks CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS questions CASCADE`);

  console.log("🗑️  Старые таблицы удалены");
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
}
