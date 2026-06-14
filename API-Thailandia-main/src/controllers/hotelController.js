const db = require('../db');

exports.listCities = async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT city FROM currencies WHERE city IS NOT NULL AND city != \'\' ORDER BY city ASC');
    res.json(result.rows.map(row => row.city));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.listHotels = async (req, res) => {
  const { city, country, search, limit, page } = req.query;
  const pLimit = parseInt(limit) || 25;
  const pPage = parseInt(page) || 1;
  const offset = (pPage - 1) * pLimit;

  let query = `
    SELECT 
      h.*, 
      EXISTS(SELECT 1 FROM room_types rt WHERE rt.hotel_id = h.id) as has_pricing,
      COUNT(*) OVER() AS total_count 
    FROM hotels h 
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
    query += ` AND (name ILIKE $${paramIndex} OR notes ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ` ORDER BY h.id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
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

exports.getHotel = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM hotels WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Hotel not found' });
    
    const roomTypes = await db.query('SELECT * FROM room_types WHERE hotel_id = $1', [id]);
    const promotions = await db.query('SELECT * FROM hotel_promotions WHERE hotel_id = $1', [id]);
    const contacts = await db.query('SELECT * FROM hotel_contacts WHERE hotel_id = $1', [id]);
    const feesResult = await db.query('SELECT * FROM hotel_fees WHERE hotel_id = $1', [id]);
    
    const hotel = result.rows[0];
    hotel.roomTypes = roomTypes.rows;
    hotel.promotions = promotions.rows;
    hotel.contacts = contacts.rows;
    hotel.fees = feesResult.rows[0] || {};

    res.json(hotel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createHotel = async (req, res) => {
  const { name, city, notes, address, display_order, contacts, roomTypes, promotions, fees } = req.body;
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const permissions = req.user.permissions || {};
    const canAdd = permissions.all || permissions.module_permissions?.cp_hotels?.add;

    if (!isAdmin && !canAdd) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to create hotels' });
    }
    await db.query('BEGIN');
    
    const result = await db.query(
      'INSERT INTO hotels (name, city, notes, address, user_id, display_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, city, notes, address, req.user.id, display_order || 0]
    );
    const hotelId = result.rows[0].id;

    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        await db.query(
          'INSERT INTO hotel_contacts (hotel_id, contact_name, email, telephone, fax) VALUES ($1, $2, $3, $4, $5)',
          [hotelId, c.name || c.contact_name, c.email, c.telephone, c.fax || '']
        );
      }
    }

    if (roomTypes && roomTypes.length > 0) {
      for (const rt of roomTypes) {
        await db.query(
          'INSERT INTO room_types (hotel_id, name, start_date, end_date, allotment, single_price, double_price, extra_bed_adult, extra_bed_child, extra_bed_shared, food_adult_abf, food_adult_lunch, food_adult_dinner, food_child_abf, food_child_lunch, food_child_dinner, currency_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)',
          [hotelId, rt.name, rt.start_date || '2024-01-01', rt.end_date || '2025-12-31', rt.allotment || 0, rt.single_price || 0, rt.double_price || 0, rt.extra_bed_adult || 0, rt.extra_bed_child || 0, rt.extra_bed_shared || 0, rt.food_adult_abf || 0, rt.food_adult_lunch || 0, rt.food_adult_dinner || 0, rt.food_child_abf || 0, rt.food_child_lunch || 0, rt.food_child_dinner || 0, rt.currency_id || 1]
        );
      }
    }

    if (promotions && promotions.length > 0) {
      for (const p of promotions) {
        await db.query(
          'INSERT INTO hotel_promotions (hotel_id, name, promotion_code, booking_date_from, booking_date_to, travel_date_from, travel_date_to, early_bird_days, minimum_nights, enabled, discount_amount, discount_type, valid_for_extra_beds, free_meals_abf, free_meals_lunch, free_meals_dinner, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)',
          [hotelId, p.name, p.promotion_code || '', p.booking_date_from, p.booking_date_to, p.travel_date_from, p.travel_date_to, p.early_bird_days, p.minimum_nights, p.enabled !== false, p.discount_amount || 0, p.discount_type || '%', p.valid_for_extra_beds || false, p.free_meals_abf || 0, p.free_meals_lunch || 0, p.free_meals_dinner || 0, p.description || '']
        );
      }
    }

    if (fees) {
      await db.query(
        'INSERT INTO hotel_fees (hotel_id, early_checkin_fee, late_checkout_fee, late_checkout_21_fee, christmas_dinner_fee, new_year_dinner_fee) VALUES ($1, $2, $3, $4, $5, $6)',
        [hotelId, fees.early_checkin_fee || 0, fees.late_checkout_fee || 0, fees.late_checkout_21_fee || 0, fees.christmas_dinner_fee || 0, fees.new_year_dinner_fee || 0]
      );
    }

    await db.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error: ' + err.message });
  }
};

exports.updateHotel = async (req, res) => {
  const { id } = req.params;
  const { name, city, notes, address, display_order, contacts, roomTypes, promotions, fees } = req.body;
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const permissions = req.user.permissions || {};
    const canEdit = permissions.all || permissions.module_permissions?.cp_hotels?.edit;

    if (!isAdmin && !canEdit) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to update hotels' });
    }
    await db.query('BEGIN');
    
    const result = await db.query(
      'UPDATE hotels SET name=$1, city=$2, notes=$3, address=$4, display_order=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *',
      [name, city, notes, address, display_order || 0, id]
    );

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Hotel not found' });
    }

    // Wipe and re-insert sub-entities
    await db.query('DELETE FROM hotel_contacts WHERE hotel_id = $1', [id]);
    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        await db.query(
          'INSERT INTO hotel_contacts (hotel_id, contact_name, email, telephone, fax) VALUES ($1, $2, $3, $4, $5)',
          [id, c.name || c.contact_name, c.email, c.telephone, c.fax || '']
        );
      }
    }

    await db.query('DELETE FROM room_types WHERE hotel_id = $1', [id]);
    if (roomTypes && roomTypes.length > 0) {
      for (const rt of roomTypes) {
        await db.query(
          'INSERT INTO room_types (hotel_id, name, start_date, end_date, allotment, single_price, double_price, extra_bed_adult, extra_bed_child, extra_bed_shared, food_adult_abf, food_adult_lunch, food_adult_dinner, food_child_abf, food_child_lunch, food_child_dinner, currency_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)',
          [id, rt.name, rt.start_date || '2024-01-01', rt.end_date || '2025-12-31', rt.allotment || 0, rt.single_price || 0, rt.double_price || 0, rt.extra_bed_adult || 0, rt.extra_bed_child || 0, rt.extra_bed_shared || 0, rt.food_adult_abf || 0, rt.food_adult_lunch || 0, rt.food_adult_dinner || 0, rt.food_child_abf || 0, rt.food_child_lunch || 0, rt.food_child_dinner || 0, rt.currency_id || 1]
        );
      }
    }

    await db.query('DELETE FROM hotel_promotions WHERE hotel_id = $1', [id]);
    if (promotions && promotions.length > 0) {
      for (const p of promotions) {
        await db.query(
          'INSERT INTO hotel_promotions (hotel_id, name, promotion_code, booking_date_from, booking_date_to, travel_date_from, travel_date_to, early_bird_days, minimum_nights, enabled, discount_amount, discount_type, valid_for_extra_beds, free_meals_abf, free_meals_lunch, free_meals_dinner, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)',
          [id, p.name, p.promotion_code || '', p.booking_date_from, p.booking_date_to, p.travel_date_from, p.travel_date_to, p.early_bird_days, p.minimum_nights, p.enabled !== false, p.discount_amount || 0, p.discount_type || '%', p.valid_for_extra_beds || false, p.free_meals_abf || 0, p.free_meals_lunch || 0, p.free_meals_dinner || 0, p.description || '']
        );
      }
    }

    await db.query('DELETE FROM hotel_fees WHERE hotel_id = $1', [id]);
    if (fees) {
      await db.query(
        'INSERT INTO hotel_fees (hotel_id, early_checkin_fee, late_checkout_fee, late_checkout_21_fee, christmas_dinner_fee, new_year_dinner_fee) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, fees.early_checkin_fee || 0, fees.late_checkout_fee || 0, fees.late_checkout_21_fee || 0, fees.christmas_dinner_fee || 0, fees.new_year_dinner_fee || 0]
      );
    }

    await db.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error: ' + err.message });
  }
};

exports.deleteHotel = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const permissions = req.user.permissions || {};
    const canDelete = permissions.all || permissions.module_permissions?.cp_hotels?.delete;

    if (!isAdmin && !canDelete) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to delete hotels' });
    }
    await db.query('DELETE FROM hotels WHERE id = $1', [req.params.id]);
    res.json({ message: 'Hotel deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
