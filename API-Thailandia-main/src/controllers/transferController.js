const db = require('../db');

exports.listTransfers = async (req, res) => {
  const { city, country, transfer_type, search, limit, page } = req.query;
  const pLimit = parseInt(limit) || 25;
  const pPage = parseInt(page) || 1;
  const offset = (pPage - 1) * pLimit;

  let query = `
    SELECT t.*, 
           (SELECT json_agg(tp.*) FROM transfer_pricing tp WHERE tp.transfer_id = t.id) as prices,
           COUNT(*) OVER() AS total_count 
    FROM transfers t 
    WHERE 1=1
  `;
  let params = [];
  let paramIndex = 1;


  if (city) {
    query += ` AND t.city = $${paramIndex++}`;
    params.push(city);
  }
  if (country) {
    query += ` AND t.country = $${paramIndex++}`;
    params.push(country);
  }
  if (transfer_type) {
    query += ` AND t.transfer_type = $${paramIndex++}`;
    params.push(transfer_type);
  }
  if (search) {
    query += ` AND (t.description ILIKE $${paramIndex} OR t.departure ILIKE $${paramIndex} OR t.arrival ILIKE $${paramIndex} OR t.supplier_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ` ORDER BY t.id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
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

exports.getTransfer = async (req, res) => {
  const { id } = req.params;
  try {
    const transferResult = await db.query(`
      SELECT t.* FROM transfers t WHERE t.id = $1
    `, [id]);
    
    if (transferResult.rows.length === 0) return res.status(404).json({ message: 'Transfer not found' });

    const transfer = transferResult.rows[0];

    // Fetch associated pricing
    const pricingResult = await db.query(
      'SELECT * FROM transfer_pricing WHERE transfer_id = $1 ORDER BY start_date ASC',
      [id]
    );

    res.json({ ...transfer, pricing: pricingResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.createTransfer = async (req, res) => {
  const { 
    transfer_type, city, country, description, departure, arrival, 
    supplier_id, supplier_name, sic_price_adult, sic_price_child, display_order, pricing 
  } = req.body;
  const client = await db.pool.connect();
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const permissions = req.user.permissions || {};
    const canAdd = permissions.all || permissions.module_permissions?.cp_transfers?.add;

    if (!isAdmin && !canAdd) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to create transfers' });
    }

    await client.query('BEGIN');

    const result = await client.query(`INSERT  INTO transfers (
        transfer_type, city, country, description, departure, arrival,
        supplier_id, supplier_name, sic_price_adult, sic_price_child, user_id, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        transfer_type, city, country || 'Thailand', description, departure, arrival,
        supplier_id || null, supplier_name || null,
        sic_price_adult || 0, sic_price_child || 0, req.user.id, display_order || 0
      ]
    );
    const transferId = result.rows[0].id;
    console.log('Created transfer with ID:', transferId);
    if (pricing && Array.isArray(pricing)) {
      for (const p of pricing) {
        await client.query(
          `INSERT INTO transfer_pricing (transfer_id, start_date, end_date, pax, price, cost, currency_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [transferId, p.start_date, p.end_date, p.pax, p.price, p.cost || 0, p.currency_id || 4]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...result.rows[0], pricing: pricing || [] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
};
exports.updateTransfer = async (req, res) => {
  const { 
    transfer_type, city, country, description, departure, arrival, 
    supplier_id, supplier_name, sic_price_adult, sic_price_child, display_order, pricing 
  } = req.body;
  const { id } = req.params;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const transRes = await client.query('SELECT user_id FROM transfers WHERE id = $1', [id]);
    if (transRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transfer not found' });
    }
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = transRes.rows[0].user_id === req.user.id;
    const permissions = req.user.permissions || {};
    const canEdit = permissions.all || permissions.module_permissions?.cp_transfers?.edit;

    if (!isAdmin && !isOwner && !canEdit) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied: You do not have permission to update transfers' });
    }

    const result = await client.query(
      `UPDATE transfers SET 
        transfer_type=$1, city=$2, country=$3, description=$4, 
        departure=$5, arrival=$6, supplier_id=$7, supplier_name=$8,
        sic_price_adult=$9, sic_price_child=$10, display_order=$11,
        updated_at=CURRENT_TIMESTAMP 
      WHERE id=$12 RETURNING *`,
      [
        transfer_type, city, country || 'Thailand', description,
        departure, arrival, supplier_id || null, supplier_name || null,
        sic_price_adult || 0, sic_price_child || 0, display_order || 0, id
      ]
    );

    // Replace pricing: delete old, insert new
    await client.query('DELETE FROM transfer_pricing WHERE transfer_id = $1', [id]);
    if (pricing && Array.isArray(pricing)) {
      for (const p of pricing) {
        await client.query(
          `INSERT INTO transfer_pricing (transfer_id, start_date, end_date, pax, price, cost, currency_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, p.start_date, p.end_date, p.pax, p.price, p.cost || 0, p.currency_id || 4]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ ...result.rows[0], pricing: pricing || [] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
};

exports.deleteTransfer = async (req, res) => {
  const { id } = req.params;
  try {
    const transRes = await db.query('SELECT user_id FROM transfers WHERE id = $1', [id]);
    if (transRes.rows.length === 0) return res.status(404).json({ message: 'Transfer not found' });
    
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = transRes.rows[0].user_id === req.user.id;
    const permissions = req.user.permissions || {};
    const canDelete = permissions.all || permissions.module_permissions?.cp_transfers?.delete;

    if (!isAdmin && !isOwner && !canDelete) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to delete transfers' });
    }

    await db.query('DELETE FROM transfers WHERE id = $1', [id]);
    res.json({ message: 'Transfer deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
