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
    // 1. Get the first agent (default Vera Thailandia Online)
    const agentRes = await pool.query("SELECT id, name FROM agents ORDER BY id ASC LIMIT 1");
    if (agentRes.rows.length === 0) {
      console.error('No agents found in database!');
      process.exit(1);
    }
    const agentId = agentRes.rows[0].id;
    console.log(`Using Agent: ${agentRes.rows[0].name} (ID: ${agentId})`);

    // 2. Assign this agent to testuser
    const userUpdate = await pool.query("UPDATE users SET agent_id = $1 WHERE username = 'testuser'", [agentId]);
    console.log(`Updated testuser with agent_id ${agentId}: ${userUpdate.rowCount} rows`);

    // 3. Update all existing trips that have NULL agent_id to this ID
    const tripUpdate = await pool.query("UPDATE trips SET agent_id = $1 WHERE agent_id IS NULL", [agentId]);
    console.log(`Assigned ${tripUpdate.rowCount} previously orphaned trips to agent_id ${agentId}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
