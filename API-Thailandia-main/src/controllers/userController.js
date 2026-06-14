const db = require('../db');
const bcrypt = require('bcryptjs');

exports.listUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.username, u.email, u.role, u.agent_id, u.permissions, a.name as agent_name 
      FROM users u 
      LEFT JOIN agents a ON u.agent_id = a.id 
      ORDER BY u.username ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, email, role, agent_id FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createUser = async (req, res) => {
  const { username, email, password, role, agent_id } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Determine default permissions based on role
    let permissions = {
      pages: [],
      module_permissions: {},
      notifications_enabled: true
    };

    const allModules = [
      'quotation', 'cp_activities', 'cp_agents', 'cp_bookings', 'cp_excursions', 
      'cp_hotels', 'cp_markups', 'cp_other_charges', 'cp_suppliers', 
      'cp_tools', 'cp_tours', 'cp_transfers', 'cp_users'
    ];

    if (role === 'superadmin') {
      permissions.all = true;
      permissions.pages = ['home', 'quotation', 'payment', 'itinerary', 'analytics', 'settings', ...allModules];
      allModules.forEach(m => {
        permissions.module_permissions[m] = { view: true, add: true, edit: true, delete: true };
      });
    } else if (role === 'admin') {
      permissions.pages = ['home', 'quotation', 'payment', 'itinerary', 'analytics', ...allModules];
      allModules.forEach(m => {
        permissions.module_permissions[m] = { view: true, add: true, edit: true, delete: true };
      });
    } else {
      permissions.pages = ['home', 'quotation', 'payment', 'itinerary'];
      allModules.forEach(m => {
        permissions.module_permissions[m] = { view: true, add: false, edit: false, delete: false };
      });
    }

    const result = await db.query(
      'INSERT INTO users (username, email, password, role, agent_id, permissions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, role, agent_id, permissions',
      [username, email, hashedPassword, role, agent_id ? parseInt(agent_id) : null, JSON.stringify(permissions)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const field = err.detail.includes('username') ? 'Username' : 'Email';
      return res.status(400).json({ message: `${field} already exists. Please use a different one.` });
    }
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateUser = async (req, res) => {
  const { username, email, password, role, agent_id, permissions } = req.body;
  try {
    let query = 'UPDATE users SET username=$1, email=$2, role=$3, agent_id=$4, updated_at=CURRENT_TIMESTAMP';
    let params = [username, email, role, agent_id ? parseInt(agent_id) : null];
    
    let counter = 5;
    if (permissions) {
      query += `, permissions=$${counter}`;
      params.push(typeof permissions === 'string' ? permissions : JSON.stringify(permissions));
      counter++;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password=$${counter} WHERE id=$${counter + 1}`;
      params.push(hashedPassword, req.params.id);
    } else {
      query += ` WHERE id=$${counter}`;
      params.push(req.params.id);
    }
    
    query += ' RETURNING id, username, email, role, agent_id, permissions';
    const result = await db.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const field = err.detail.includes('username') ? 'Username' : 'Email';
      return res.status(400).json({ message: `${field} already exists. Please use a different one.` });
    }
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateRole = async (req, res) => {
  const { role } = req.body;
  const userId = req.params.id;

  try {
    // Determine default permissions for the new role
    let permissions = {
      pages: [],
      module_permissions: {},
      notifications_enabled: true
    };

    const allModules = [
      'quotation', 'cp_activities', 'cp_agents', 'cp_bookings', 'cp_excursions', 
      'cp_hotels', 'cp_markups', 'cp_other_charges', 'cp_suppliers', 
      'block_tools', 'cp_tours', 'cp_transfers', 'cp_users'
    ];

    if (role === 'superadmin') {
      permissions.all = true;
      permissions.pages = ['home', 'quotation', 'payment', 'itinerary', 'analytics', 'settings', ...allModules];
      allModules.forEach(m => {
        permissions.module_permissions[m] = { view: true, add: true, edit: true, delete: true };
      });
    } else if (role === 'admin') {
      permissions.pages = ['home', 'quotation', 'payment', 'itinerary', 'analytics', ...allModules];
      allModules.forEach(m => {
        permissions.module_permissions[m] = { view: true, add: true, edit: true, delete: true };
      });
    } else {
      permissions.pages = ['home', 'quotation', 'payment', 'itinerary'];
      allModules.forEach(m => {
        permissions.module_permissions[m] = { view: true, add: false, edit: false, delete: false };
      });
    }

    const result = await db.query(
      'UPDATE users SET role = $1, permissions = $2::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, username, role, permissions',
      [role, JSON.stringify(permissions), userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updatePermissions = async (req, res) => {
  const { permissions } = req.body;
  const userId = req.params.id;

  try {
    const result = await db.query(
      'UPDATE users SET permissions = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, role, permissions',
      [JSON.stringify(permissions), userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.migratePermissions = async (req, res) => {
  try {
    const result = await db.query('SELECT id, role, permissions FROM users');
    let updatedCount = 0;

    const allModules = [
      'quotation', 'cp_activities', 'cp_agents', 'cp_bookings', 'cp_excursions', 
      'cp_hotels', 'cp_markups', 'cp_other_charges', 'cp_suppliers', 
      'cp_tools', 'cp_tours', 'cp_transfers', 'cp_users'
    ];

    for (const user of result.rows) {
      let perms = user.permissions || {};
      let needsUpdate = false;

      // 1. Ensure pages exists
      if (!perms.pages) {
        perms.pages = ['home', 'quotation', 'payment', 'itinerary'];
        needsUpdate = true;
      }

      // 2. Ensure module_permissions exists and is structured
      if (!perms.module_permissions) {
        perms.module_permissions = {};
        allModules.forEach(m => {
          const hasPage = perms.pages.includes(m);
          const isFull = perms.all || user.role === 'superadmin' || user.role === 'admin';
          perms.module_permissions[m] = {
            view: hasPage,
            add: isFull,
            edit: isFull,
            delete: isFull
          };
        });
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db.query('UPDATE users SET permissions = $1 WHERE id = $2', [JSON.stringify(perms), user.id]);
        updatedCount++;
      }
    }
    res.json({ message: `Migration to granular permissions complete. Updated ${updatedCount} users.` });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ message: 'Migration failed.' });
  }
};
