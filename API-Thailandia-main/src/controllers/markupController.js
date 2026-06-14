const db = require('../db');

exports.listMarkups = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM markups ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getMarkupGroups = async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT markup_group as name FROM markups');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getMarkup = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM markups WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Markup not found' });
    
    // Fetch hotel ranges
    const ranges = await db.query(
      'SELECT price_from, price_to, markup_percentage FROM hotel_markup_percentages WHERE markup_id = $1 ORDER BY price_from ASC', 
      [id]
    );
    const markup = result.rows[0];
    markup.hotel_markup_percentages = ranges.rows;
    
    res.json(markup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createMarkup = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { 
      markup_group, 
      excursion_markup_unit, excursion_markup, 
      tour_markup_unit, tour_markup, 
      transfer_markup_unit, transfer_markup, 
      hotel_markup_unit, hotel_markup_value,
      hotel_markup_percentages,
      currency_id
    } = req.body;

    const result = await client.query(
      `INSERT INTO markups (
        markup_group, excursion_markup_unit, excursion_markup, 
        tour_markup_unit, tour_markup, transfer_markup_unit, transfer_markup, 
        hotel_markup_unit, hotel_markup_value, currency_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        markup_group, excursion_markup_unit, excursion_markup, 
        tour_markup_unit, tour_markup, transfer_markup_unit, transfer_markup, 
        hotel_markup_unit || '%', hotel_markup_value || 0, currency_id || 4
      ]
    );
    const markupId = result.rows[0].id;
    
    if (hotel_markup_percentages && Array.isArray(hotel_markup_percentages)) {
      for (const range of hotel_markup_percentages) {
        await client.query(
          'INSERT INTO hotel_markup_percentages (markup_id, price_from, price_to, markup_percentage) VALUES ($1, $2, $3, $4)',
          [markupId, range.price_from, range.price_to, range.markup_percentage]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.updateMarkup = async (req, res) => {
  const client = await db.pool.connect();
  const { id } = req.params;
  try {
    await client.query('BEGIN');
    const { 
      markup_group, 
      excursion_markup_unit, excursion_markup, 
      tour_markup_unit, tour_markup, 
      transfer_markup_unit, transfer_markup, 
      hotel_markup_unit, hotel_markup_value,
      hotel_markup_percentages,
      currency_id
    } = req.body;

    const result = await client.query(
      `UPDATE markups SET 
        markup_group=$1, excursion_markup_unit=$2, excursion_markup=$3, 
        tour_markup_unit=$4, tour_markup=$5, transfer_markup_unit=$6, transfer_markup=$7, 
        hotel_markup_unit=$8, hotel_markup_value=$9, currency_id=$10
      WHERE id=$11 RETURNING *`,
      [
        markup_group, excursion_markup_unit, excursion_markup, 
        tour_markup_unit, tour_markup, transfer_markup_unit, transfer_markup, 
        hotel_markup_unit || '%', hotel_markup_value || 0, currency_id || 4, id
      ]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Markup not found' });
    }
    
    // Refresh hotel ranges
    await client.query('DELETE FROM hotel_markup_percentages WHERE markup_id = $1', [id]);
    if (hotel_markup_percentages && Array.isArray(hotel_markup_percentages)) {
      for (const range of hotel_markup_percentages) {
        await client.query(
          'INSERT INTO hotel_markup_percentages (markup_id, price_from, price_to, markup_percentage) VALUES ($1, $2, $3, $4)',
          [id, range.price_from, range.price_to, range.markup_percentage]
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

exports.deleteMarkup = async (req, res) => {
  try {
    await db.query('DELETE FROM markups WHERE id = $1', [req.params.id]);
    res.json({ message: 'Markup deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
