const db = require('../db');

exports.listTours = async (req, res) => {
  const { city, country, search, limit, page } = req.query;
  const pLimit = parseInt(limit) || 25;
  const pPage = parseInt(page) || 1;
  const offset = (pPage - 1) * pLimit;

  let query = `
    SELECT t.*, 
           (SELECT json_agg(tp.*) FROM tour_pricing tp WHERE tp.tour_id = t.id) as prices,
           COUNT(*) OVER() AS total_count 
    FROM tours t 
    WHERE 1=1
  `;
  let params = [];
  let paramIndex = 1;


  if (country) {
    query += ` AND country = $${paramIndex++}`;
    params.push(country);
  }
  if (search) {
    query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR route ILIKE $${paramIndex})`;
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

exports.getTour = async (req, res) => {
  const { id } = req.params;
  try {
    const tourResult = await db.query('SELECT * FROM tours WHERE id = $1', [id]);
    if (tourResult.rows.length === 0) return res.status(404).json({ message: 'Tour not found' });
    
    const tour = tourResult.rows[0];

    // Fetch pricing
    const pricing = await db.query('SELECT * FROM tour_pricing WHERE tour_id = $1 ORDER BY start_date ASC', [id]);
    tour.pricing = pricing.rows;

    // Fetch itinerary days
    const days = await db.query('SELECT * FROM tour_days WHERE tour_id = $1 ORDER BY day ASC', [id]);
    
    // Fetch itinerary services
    const services = await db.query('SELECT * FROM tour_services WHERE tour_id = $1 ORDER BY day ASC, id ASC', [id]);

    // Map services to days
    tour.itinerary = days.rows.map(day => {
      return {
        ...day,
        hotels: services.rows.filter(s => s.day === day.day && s.service_type === 'hotel'),
        excursions: services.rows.filter(s => s.day === day.day && s.service_type === 'excursion'),
        transfers: services.rows.filter(s => s.day === day.day && s.service_type === 'transfer')
      };
    });

    res.json(tour);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createTour = async (req, res) => {
  const client = await db.pool.connect();
  const { 
    name, code, category, description, duration, route, departures, city, valid_days,
    display_order, itinerary, pricing 
  } = req.body;

  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const permissions = req.user.permissions || {};
    const canAdd = permissions.all || permissions.module_permissions?.cp_tours?.add;

    if (!isAdmin && !canAdd) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to create tours' });
    }

    await client.query('BEGIN');

    // Normalize departures to accepted DB values ('PVT' | 'SIC')
    const normalizedDepartures = departures === 'Daily' ? 'SIC'
      : departures === 'Scheduled' ? 'PVT'
      : (departures === 'PVT' || departures === 'SIC') ? departures
      : 'SIC'; // fallback

    // 1. Insert into tours
    const tourResult = await client.query(
      `INSERT INTO tours (name, code, category, description, duration, route, departures, city, valid_days, user_id, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [name, code, category, description, duration, route, normalizedDepartures, city, JSON.stringify(valid_days), req.user.id, display_order || 0]
    );
    const tourId = tourResult.rows[0].id;

    // 2. Insert into tour_pricing
    if (pricing && Array.isArray(pricing)) {
      for (const p of pricing) {
        await client.query(
          `INSERT INTO tour_pricing (tour_id, start_date, end_date, single_room_price, double_room_price, triple_room_price, currency_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tourId, p.start_date, p.end_date, p.single_room_price, p.double_room_price, p.triple_room_price, p.currency_id || 4]
        );
      }
    }

    // 3. Insert into tour_days and tour_services
    if (itinerary && Array.isArray(itinerary)) {
      for (const day of itinerary) {
        await client.query(
          'INSERT INTO tour_days (tour_id, day, itinerary) VALUES ($1, $2, $3)',
          [tourId, day.dayNumber, day.description]
        );

        const allServices = [
          ...(day.hotels || []).map(s => ({ ...s, type: 'hotel' })),
          ...(day.excursions || []).map(s => ({ ...s, type: 'excursion' })),
          ...(day.transfers || []).map(s => ({ ...s, type: 'transfer' }))
        ];

        for (const s of allServices) {
          await client.query(
            `INSERT INTO tour_services (tour_id, day, city, service_type, service_name, from_time, to_time, room_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [tourId, day.dayNumber, s.city, s.type, s.item_id || s.service_name || null, s.from_time, s.to_time, s.room_type]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(tourResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.updateTour = async (req, res) => {
  const { id } = req.params;
  const client = await db.pool.connect();
  const { 
    name, code, category, description, duration, route, departures, city, valid_days,
    display_order, itinerary, pricing 
  } = req.body;

  try {
    await client.query('BEGIN');

    const tourRes = await client.query('SELECT user_id FROM tours WHERE id::text = $1', [id]);
    if (tourRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Tour not found' });
    }
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = tourRes.rows[0].user_id === req.user.id;
    const permissions = req.user.permissions || {};
    const canEdit = permissions.all || permissions.module_permissions?.cp_tours?.edit;

    if (!isAdmin && !isOwner && !canEdit) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied: You do not have permission to update tours' });
    }

    // Normalize departures to accepted DB values ('PVT' | 'SIC')
    const normalizedDepartures = departures === 'Daily' ? 'SIC'
      : departures === 'Scheduled' ? 'PVT'
      : (departures === 'PVT' || departures === 'SIC') ? departures
      : 'SIC'; // fallback

    // 1. Update tours
    const tourResult = await client.query(
      `UPDATE tours SET 
        name=$1, code=$2, category=$3, description=$4, duration=$5, route=$6, departures=$7, city=$8, valid_days=$9, 
        display_order=$10, updated_at=CURRENT_TIMESTAMP 
       WHERE id=$11 RETURNING *`,
      [name, code, category, description, duration, route, normalizedDepartures, city, JSON.stringify(valid_days), display_order || 0, id]
    );

    // 2. Refresh pricing
    await client.query('DELETE FROM tour_pricing WHERE tour_id = $1', [id]);
    if (pricing && Array.isArray(pricing)) {
      for (const p of pricing) {
        await client.query(
          `INSERT INTO tour_pricing (tour_id, start_date, end_date, single_room_price, double_room_price, triple_room_price, currency_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, p.start_date, p.end_date, p.single_room_price, p.double_room_price, p.triple_room_price, p.currency_id || 4]
        );
      }
    }

    // 3. Refresh itinerary (days and services)
    await client.query('DELETE FROM tour_services WHERE tour_id = $1', [id]);
    await client.query('DELETE FROM tour_days WHERE tour_id = $1', [id]);
    
    if (itinerary && Array.isArray(itinerary)) {
      for (const day of itinerary) {
        await client.query(
          'INSERT INTO tour_days (tour_id, day, itinerary) VALUES ($1, $2, $3)',
          [id, day.dayNumber, day.description]
        );

        const allServices = [
          ...(day.hotels || []).map(s => ({ ...s, type: 'hotel' })),
          ...(day.excursions || []).map(s => ({ ...s, type: 'excursion' })),
          ...(day.transfers || []).map(s => ({ ...s, type: 'transfer' }))
        ];

        for (const s of allServices) {
          await client.query(
            `INSERT INTO tour_services (tour_id, day, city, service_type, service_name, from_time, to_time, room_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, day.dayNumber, s.city, s.type, s.item_id || s.service_name || null, s.from_time, s.to_time, s.room_type]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json(tourResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.deleteTour = async (req, res) => {
  const { id } = req.params;
  try {
    // Check ownership
    const tourRes = await db.query('SELECT user_id FROM tours WHERE id::text = $1', [id]);
    if (tourRes.rows.length === 0) return res.status(404).json({ message: 'Tour not found' });
    
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = tourRes.rows[0].user_id === req.user.id;
    const permissions = req.user.permissions || {};
    const canDelete = permissions.all || permissions.module_permissions?.cp_tours?.delete;

    if (!isAdmin && !isOwner && !canDelete) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to delete tours' });
    }

    await db.query('DELETE FROM tours WHERE id::text = $1', [id]);
    res.json({ message: 'Tour deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
