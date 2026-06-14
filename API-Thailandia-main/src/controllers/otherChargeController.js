const db = require('../db');

exports.listOtherCharges = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM others ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getOtherCharge = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM others WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Charge not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createOtherCharge = async (req, res) => {
  const { description, amount, chargetype } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO others (description, amount, chargetype) VALUES ($1, $2, $3) RETURNING *',
      [description, amount, chargetype]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateOtherCharge = async (req, res) => {
  const { id } = req.params;
  const { description, amount, chargetype } = req.body;
  try {
    const result = await db.query(
      'UPDATE others SET description=$1, amount=$2, chargetype=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *',
      [description, amount, chargetype, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Charge not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteOtherCharge = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM others WHERE id = $1', [id]);
    res.json({ message: 'Charge deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
