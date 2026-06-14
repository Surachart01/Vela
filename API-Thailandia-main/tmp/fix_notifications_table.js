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
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_id VARCHAR(100),
    agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure agent_id exists if table was already created manually
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='agent_id') THEN
        ALTER TABLE notifications ADD COLUMN agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL;
    END IF;

    -- Also check for link_id and is_read just in case
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='link_id') THEN
        ALTER TABLE notifications ADD COLUMN link_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
        ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
`;

async function fixTable() {
  try {
    console.log('Connecting to database...');
    await pool.query(sql);
    console.log('Successfully fixed notifications table schema!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to fix notifications table:', err);
    process.exit(1);
  }
}

fixTable();
