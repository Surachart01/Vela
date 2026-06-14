const db = require('../db');

exports.listCities = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, co.name AS country_name
       FROM cities c
       LEFT JOIN countries co ON co.id = c.country_id
       ORDER BY c.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addCity = async (req, res) => {
  const { name, country_id } = req.body;
  if (!name) return res.status(400).json({ message: 'City name is required.' });
  try {
    const result = await db.query(
      'INSERT INTO cities (name, country_id) VALUES ($1, $2) RETURNING *',
      [name, country_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCity = async (req, res) => {
  const { id } = req.params;
  const { name, country_id } = req.body;
  try {
    const result = await db.query(
      'UPDATE cities SET name = $1, country_id = $2 WHERE id = $3 RETURNING *',
      [name, country_id || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCity = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM cities WHERE id = $1', [id]);
    res.json({ message: 'City deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
