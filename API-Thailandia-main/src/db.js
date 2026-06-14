const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('[DB.js Debug] Available Env Keys:', Object.keys(process.env).filter(k => k.startsWith('PG') || k.includes('DATABASE') || k.includes('RAILWAY')));
console.log('[DB.js Debug] Checking DATABASE_URL:', !!process.env.DATABASE_URL);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new Pool({
      host: process.env.PGHOST || process.env.PG_HOST || 'localhost',
      user: process.env.PGUSER || process.env.PG_USER,
      password: process.env.PGPASSWORD || process.env.PG_PASSWORD,
      database: process.env.PGDATABASE || process.env.PG_DATABASE,
      port: process.env.PGPORT || process.env.PG_PORT || 5432,
    });

// ─── Auto-migration: Ensure required columns & tables exist ───────────────────
const migrations = [
  `ALTER TABLE trips ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'InProgress'`,
  `ALTER TABLE transfers ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`,
  `ALTER TABLE hotels ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`,
  `ALTER TABLE excursions ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`,
  `ALTER TABLE tours ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`,
  `ALTER TABLE countries ADD COLUMN IF NOT EXISTS province VARCHAR(255)`,
  // Widen markup numeric columns from NUMERIC(5,2) to NUMERIC(10,2) to allow values >= 1000
  `DO $$ BEGIN
     ALTER TABLE markups ALTER COLUMN excursion_markup TYPE NUMERIC(10,2);
     ALTER TABLE markups ALTER COLUMN tour_markup TYPE NUMERIC(10,2);
     ALTER TABLE markups ALTER COLUMN transfer_markup TYPE NUMERIC(10,2);
   EXCEPTION WHEN undefined_table THEN NULL;
   END $$`,
  `DO $$ BEGIN
     ALTER TABLE hotel_markup_percentages ALTER COLUMN price_from TYPE NUMERIC(10,2);
     ALTER TABLE hotel_markup_percentages ALTER COLUMN price_to TYPE NUMERIC(10,2);
     ALTER TABLE hotel_markup_percentages ALTER COLUMN markup_percentage TYPE NUMERIC(10,2);
   EXCEPTION WHEN undefined_table THEN NULL;
   END $$`,
  // Add hotel_markup_unit column so Hotel unit (% vs THB) is persisted
  `ALTER TABLE markups ADD COLUMN IF NOT EXISTS hotel_markup_unit VARCHAR(10) DEFAULT '%'`,
  `CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country_id INTEGER REFERENCES countries(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
];

// Run migrations sequentially then seed city data
async function runMigrationsAndSeed() {
  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.error(`[DB Migration Error] ${err.message}`);
    }
  }

  // ─── Seed: Ensure Thailand exists ───────────────────────────────────────────
  try {
    let thailandId;

    const existing = await pool.query(
      `SELECT id FROM countries WHERE LOWER(name) = 'thailand' LIMIT 1`
    );

    if (existing.rows.length > 0) {
      thailandId = existing.rows[0].id;
    } else {
      const inserted = await pool.query(
        `INSERT INTO countries (name, code) VALUES ('Thailand', 'TH') RETURNING id`
      );
      thailandId = inserted.rows[0].id;
      console.log('[DB Seed] Inserted Thailand into countries.');
    }

    // ─── Seed: Collect all unique cities from service tables ──────────────────
    const cityQuery = await pool.query(`
      SELECT DISTINCT city AS name FROM (
        SELECT city FROM hotels      WHERE city IS NOT NULL AND TRIM(city) != ''
        UNION
        SELECT city FROM tours       WHERE city IS NOT NULL AND TRIM(city) != ''
        UNION
        SELECT city FROM excursions  WHERE city IS NOT NULL AND TRIM(city) != ''
        UNION
        SELECT city FROM transfers   WHERE city IS NOT NULL AND TRIM(city) != ''
      ) AS all_cities
      WHERE city NOT IN (SELECT name FROM cities)
      ORDER BY city ASC
    `);

    const newCities = cityQuery.rows;

    if (newCities.length > 0) {
      // Build bulk INSERT with dynamic placeholders: ($1,$2), ($3,$2), ...
      // All rows share the same country_id so we alternate name / country_id
      const valuePlaceholders = newCities
        .map((_, i) => `($${i + 1}, ${thailandId})`)
        .join(', ');
      const nameParams = newCities.map(c => c.name);

      await pool.query(
        `INSERT INTO cities (name, country_id) VALUES ${valuePlaceholders}`,
        nameParams
      );
      console.log(`[DB Seed] Seeded ${newCities.length} cities linked to Thailand.`);
    } else {
      console.log('[DB Seed] No new cities to seed.');
    }

  } catch (err) {
    console.error('[DB Seed Error]', err.message);
  }
}

runMigrationsAndSeed();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
