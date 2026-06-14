const db = require('../db');

exports.listSuppliers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM suppliers ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getSupplier = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createSupplier = async (req, res) => {
  const { name, description, email, telephone, location, offers_transfers, offers_excursions, offers_tours } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO suppliers (name, description, email, telephone, location, offers_transfers, offers_excursions, offers_tours) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, description, email, telephone, location, offers_transfers || false, offers_excursions || false, offers_tours || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateSupplier = async (req, res) => {
  const { name, description, email, telephone, location, offers_transfers, offers_excursions, offers_tours } = req.body;
  try {
    const result = await db.query(
      'UPDATE suppliers SET name=$1, description=$2, email=$3, telephone=$4, location=$5, offers_transfers=$6, offers_excursions=$7, offers_tours=$8, updated_at=CURRENT_TIMESTAMP WHERE id=$9 RETURNING *',
      [name, description, email, telephone, location, offers_transfers, offers_excursions, offers_tours, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    await db.query('DELETE FROM suppliers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
