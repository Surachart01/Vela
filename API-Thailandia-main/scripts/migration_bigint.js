const path = require('path');
const db = require(path.join(__dirname, '../src/db'));

async function migrate() {
  try {
    await db.query('ALTER TABLE notifications ALTER COLUMN id TYPE BIGINT');
    console.log('Successfully altered notifications.id to BIGINT');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
