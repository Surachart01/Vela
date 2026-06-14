const path = require('path');
const db = require(path.join(__dirname, '../src/db'));

async function promote() {
  try {
    // 1. Drop old constraint and add new one
    console.log('Updating users_role_check constraint...');
    await db.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    await db.query(`ALTER TABLE users ADD CONSTRAINT users_role_check 
                   CHECK (role = ANY (ARRAY['agent'::text, 'admin'::text, 'user'::text, 'superadmin'::text]))`);

    const perms = JSON.stringify({
      all: true,
      manage_users: true,
      control_panel: true,
      settings: true
    });

    console.log('Promoting admin to superadmin...');
    const result = await db.query(
      'UPDATE users SET role = $1, permissions = $2::jsonb WHERE username = $3 RETURNING id, username, role',
      ['superadmin', perms, 'admin']
    );

    if (result.rows.length > 0) {
      console.log('Successfully promoted admin to superadmin:', result.rows[0]);
    } else {
      console.log('User admin not found');
    }
    process.exit(0);
  } catch (err) {
    console.error('Promotion failed:', err);
    process.exit(1);
  }
}

promote();
