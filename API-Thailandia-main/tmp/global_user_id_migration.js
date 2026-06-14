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

const tables = ['hotels', 'tours', 'transfers', 'excursions', 'agents'];

async function migrate() {
  try {
    console.log('Starting global user_id migration...');
    
    for (const table of tables) {
      const sql = `
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='user_id') THEN
                ALTER TABLE ${table} ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
                RAISE NOTICE 'Added user_id to ${table}';
            END IF;
        END $$;
      `;
      await pool.query(sql);
      console.log(`Checked/Updated table: ${table}`);
    }

    console.log('Global migration successful.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
