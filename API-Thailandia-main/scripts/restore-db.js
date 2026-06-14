const fs = require('fs');
const path = require('path');
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
    // 1. Clean the schema to prevent any sequence/table dependency conflicts
    console.log('Cleaning existing public schema (dropping and recreating)...');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO public'); // Ensure permissions are set

    // 2. Enable uuid-ossp extension
    console.log('Creating uuid-ossp extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public');

    const sqlPath = path.join(__dirname, '../../public.sql');
    console.log(`Reading SQL file from ${sqlPath}...`);
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // 3. Remove the manual DROP/CREATE function statements for uuid functions
    // which are already created and protected by the uuid-ossp extension.
    console.log('Removing uuid extension function definitions from SQL dump to prevent conflicts...');
    const originalLength = sql.length;
    sql = sql.replace(/DROP FUNCTION IF EXISTS "public"\."uuid_[a-z0-9_]+"\([\s\S]*?COST 1;/gi, '');
    console.log(`Removed ${originalLength - sql.length} characters of duplicate function definitions.`);

    console.log('Disabling triggers and foreign key checks (session_replication_role = replica)...');
    await client.query("SET session_replication_role = 'replica'");

    console.log('Executing database schema and seed data...');
    await client.query(sql);

    console.log('Restoring triggers and foreign key checks (session_replication_role = origin)...');
    await client.query("SET session_replication_role = 'origin'");

    console.log('Database restore completed successfully!');
  } catch (err) {
    console.error('Error restoring database:', err);
    try {
      await client.query("SET session_replication_role = 'origin'");
    } catch (_) {}
  } finally {
    client.release();
    await pool.end();
  }
}

main();
