const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Load env variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Error: DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    // 1. Reset admin
    const adminHash = await bcrypt.hash('admin', 10);
    const resultAdmin = await client.query(
      "UPDATE users SET password = $1 WHERE username = 'admin' RETURNING username, email",
      [adminHash]
    );
    if (resultAdmin.rows.length > 0) {
      console.log(`Success! Password for "admin" has been set to "admin".`);
    }

    // 2. Reset testuser
    const testHash = await bcrypt.hash('testuser', 10);
    const resultTest = await client.query(
      "UPDATE users SET password = $1 WHERE username = 'testuser' RETURNING username, email",
      [testHash]
    );
    if (resultTest.rows.length > 0) {
      console.log(`Success! Password for "testuser" has been set to "testuser".`);
    }

  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
