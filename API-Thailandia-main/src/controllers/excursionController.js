const db = require('../db');

exports.listExcursions = async (req, res) => {
  const { city, country, search, limit, page } = req.query;
  const pLimit = parseInt(limit) || 25;
  const pPage = parseInt(page) || 1;
  const offset = (pPage - 1) * pLimit;

  let query = `
    SELECT e.*, 
           (SELECT json_agg(ep.*) FROM excursion_pricing ep WHERE ep.excursion_id = e.id) as prices,
           COUNT(*) OVER() AS total_count 
    FROM excursions e 
    WHERE 1=1
  `;
  let params = [];
  let paramIndex = 1;


  if (city) {
    query += ` AND city = $${paramIndex++}`;
    params.push(city);
  }
  if (country) {
    query += ` AND country = $${paramIndex++}`;
    params.push(country);
  }
  if (search) {
    query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR supplier_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ` ORDER BY id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(pLimit, offset);

  try {
    const result = await db.query(query, params);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    res.json({
      data: result.rows,
      total: total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getExcursion = async (req, res) => {
  const { id } = req.params;
  try {
    const excursionResult = await db.query('SELECT * FROM excursions WHERE id = $1', [id]);
    if (excursionResult.rows.length === 0) return res.status(404).json({ message: 'Excursion not found' });
    
    const pricingResult = await db.query('SELECT * FROM excursion_pricing WHERE excursion_id = $1', [id]);
    
    const excursion = excursionResult.rows[0];
    excursion.prices = pricingResult.rows;
    
    res.json(excursion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createExcursion = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const permissions = req.user.permissions || {};
    const canAdd = permissions.all || permissions.module_permissions?.cp_excursions?.add;

    if (!isAdmin && !canAdd) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied: You do not have permission to create excursions' });
    }

    const { 
      name, city, country, code, description, 
      sic_price_adult, sic_price_child, 
      supplier_name, valid_days, display_order, prices 
    } = req.body;

    const excursionResult = await client.query(
      `INSERT INTO excursions (
        name, city, country, code, description, 
        sic_price_adult, sic_price_child, 
        supplier_name, valid_days, user_id, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [name, city, country || 'Thailand', code, description, sic_price_adult, sic_price_child, supplier_name, valid_days, req.user.id, display_order || 0]
    );

    const excursionId = excursionResult.rows[0].id;

    if (prices && Array.isArray(prices)) {
      for (const p of prices) {
        await client.query(
          `INSERT INTO excursion_pricing (
            excursion_id, start_date, end_date, pax, price, cost, currency_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [excursionId, p.start_date, p.end_date, p.pax, p.price, p.cost || p.price, p.currency_id || 1]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(excursionResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.updateExcursion = async (req, res) => {
  const client = await db.pool.connect();
  const { id } = req.params;
  try {
    await client.query('BEGIN');
    const { 
      name, city, country, code, description, 
      sic_price_adult, sic_price_child, 
      supplier_name, valid_days, display_order, prices 
    } = req.body;

    const excRes = await client.query('SELECT user_id FROM excursions WHERE id = $1', [id]);
    if (excRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Excursion not found' });
    }
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = excRes.rows[0].user_id === req.user.id;
    const permissions = req.user.permissions || {};
    const canEdit = permissions.all || permissions.module_permissions?.cp_excursions?.edit;

    if (!isAdmin && !isOwner && !canEdit) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied: You do not have permission to update excursions' });
    }

    const result = await client.query(
      `UPDATE excursions SET 
        name=$1, city=$2, country=$3, code=$4, description=$5, 
        sic_price_adult=$6, sic_price_child=$7, 
        supplier_name=$8, valid_days=$9, display_order=$10, updated_at=CURRENT_TIMESTAMP 
      WHERE id=$11 RETURNING *`,
      [name, city, country || 'Thailand', code, description, sic_price_adult, sic_price_child, supplier_name, valid_days, display_order || 0, id]
    );

    // Update prices: Delete old and insert new
    await client.query('DELETE FROM excursion_pricing WHERE excursion_id = $1', [id]);

    if (prices && Array.isArray(prices)) {
      for (const p of prices) {
        await client.query(
          `INSERT INTO excursion_pricing (
            excursion_id, start_date, end_date, pax, price, cost, currency_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, p.start_date, p.end_date, p.pax, p.price, p.cost || p.price, p.currency_id || 1]
        );
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.deleteExcursion = async (req, res) => {
  const { id } = req.params;
  try {
    const excRes = await db.query('SELECT user_id FROM excursions WHERE id = $1', [id]);
    if (excRes.rows.length === 0) return res.status(404).json({ message: 'Excursion not found' });
    
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = excRes.rows[0].user_id === req.user.id;
    const permissions = req.user.permissions || {};
    const canDelete = permissions.all || permissions.module_permissions?.cp_excursions?.delete;

    if (!isAdmin && !isOwner && !canDelete) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to delete excursions' });
    }

    await db.query('DELETE FROM excursions WHERE id = $1', [id]);
    res.json({ message: 'Excursion deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
