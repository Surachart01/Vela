const pool = require('../db');

exports.listCountries = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM countries ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addCountry = async (req, res) => {
  const { name, code, province } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO countries (name, code, province) VALUES ($1, $2, $3) RETURNING *',
      [name, code, province]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCountry = async (req, res) => {
  const { id } = req.params;
  const { name, code, province } = req.body;
  try {
    const result = await pool.query(
      'UPDATE countries SET name = $1, code = $2, province = $3 WHERE id = $4 RETURNING *',
      [name, code, province, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCountry = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM countries WHERE id = $1', [id]);
    res.json({ message: 'Country deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
