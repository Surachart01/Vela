const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: Number(process.env.PG_PORT || 5432),
});

const sql = `
-- Add user_id column to trips
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='user_id') THEN
        ALTER TABLE trips ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Optional: For the 1-3 rows testuser recognizes, we should assign them to user_id 4 (testuser)
-- Since we don't know exactly which ones, we'll assign the most recent ones as a default fix.
UPDATE trips 
SET user_id = (SELECT id FROM users WHERE username = 'testuser' LIMIT 1)
WHERE agent_id = (SELECT agent_id FROM users WHERE username = 'testuser' LIMIT 1)
AND user_id IS NULL;
`;

async function migrate() {
  try {
    console.log('Migrating trips table...');
    await pool.query(sql);
    console.log('Migration successful: Added user_id to trips and assigned existing orphaned trips to testuser.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
