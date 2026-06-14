const path = require('path');
const db = require(path.join(__dirname, '../src/db'));

async function migrate() {
  try {
    // 1. Add permissions column
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT \'{}\'::jsonb');
    
    // 2. Default permissions for roles
    const superAdminPerms = JSON.stringify({
      all: true,
      manage_users: true,
      control_panel: true,
      settings: true,
      notifications_enabled: true,
      pages: ['home', 'quotation', 'add-quotation', 'payment', 'itinerary', 'analytics', 'settings', 'cp_activities', 'cp_agents', 'cp_bookings', 'cp_excursions', 'cp_hotels', 'cp_markups', 'cp_other_charges', 'cp_suppliers', 'cp_tools', 'cp_tours', 'cp_transfers', 'cp_users']
    });
    
    const adminPerms = JSON.stringify({
      control_panel: true,
      bookings: 'all',
      hotels: 'all',
      transfers: 'all',
      excursions: 'all',
      tours: 'all',
      notifications_enabled: true,
      pages: ['home', 'quotation', 'add-quotation', 'payment', 'itinerary', 'analytics', 'cp_activities', 'cp_agents', 'cp_bookings', 'cp_excursions', 'cp_hotels', 'cp_markups', 'cp_other_charges', 'cp_suppliers', 'cp_tools', 'cp_tours', 'cp_transfers']
    });
    
    const agentPerms = JSON.stringify({
      bookings: 'own',
      hotels: 'read',
      transfers: 'read',
      excursions: 'read',
      tours: 'read',
      notifications_enabled: true,
      pages: ['home', 'quotation', 'add-quotation', 'payment', 'itinerary']
    });

    await db.query('UPDATE users SET permissions = $1::jsonb WHERE role = \'superadmin\'', [superAdminPerms]);
    await db.query('UPDATE users SET permissions = $1::jsonb WHERE role = \'admin\'', [adminPerms]);
    await db.query('UPDATE users SET permissions = $1::jsonb WHERE role = \'agent\' OR role IS NULL', [agentPerms]);

    console.log('Successfully added and seeded permissions column');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
