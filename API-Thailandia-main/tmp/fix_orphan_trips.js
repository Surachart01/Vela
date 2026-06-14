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

async function run() {
  try {
    // 1. Find testuser and their agent_id
    const userRes = await pool.query("SELECT id, username, agent_id, role FROM users WHERE username = 'testuser'");
    console.log('User Details:', userRes.rows[0]);

    if (userRes.rows.length === 0) {
      console.log('User testuser not found');
      process.exit(1);
    }

    const testuser = userRes.rows[0];
    
    // 2. Count trips with NULL agent_id
    const nullTripsRes = await pool.query("SELECT COUNT(*) FROM trips WHERE agent_id IS NULL");
    console.log('Trips with NULL agent_id:', nullTripsRes.rows[0].count);

    // 3. Show a few null trips to see if they look like they belong to the agent
    const sampleRes = await pool.query("SELECT id, client_name, created_at FROM trips WHERE agent_id IS NULL ORDER BY created_at DESC LIMIT 5");
    console.log('Sample NULL Trips:', sampleRes.rows);

    if (testuser.agent_id) {
        // 4. Update all NULL trips to this agent_id (since this is likely test data)
        const updateRes = await pool.query("UPDATE trips SET agent_id = $1 WHERE agent_id IS NULL", [testuser.agent_id]);
        console.log(`Updated ${updateRes.rowCount} trips to agent_id ${testuser.agent_id}`);
    } else {
        console.log('Warning: testuser has no agent_id assigned!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
