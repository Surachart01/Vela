const db = require('../db');
const { randomUUID } = require('crypto');
const mapToT = (val) => {
  if (!val) return 'PVT';
  const v = val.toString().toLowerCase();
  if (v === 'private' || v === 'pvt') return 'PVT';
  if (v === 'join' || v === 'sic' || v === 'sharing') return 'SIC';
  return 'PVT'; // Default safe value
};


exports.listTrips = async (req, res) => {
  const { status } = req.query;
  const user = req.user;
  
  let query = `
    SELECT t.*, u.username as user_name, u.email as user_email, a.name as agent_name 
    FROM trips t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN agents a ON t.agent_id = a.id
  `;
  let params = [];
  let whereClauses = [];

  // 1. Role-based filtering
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    // UPDATED: Anyone who is not an admin/superadmin sees ONLY their own created trips (user-level ownership)
    whereClauses.push(`t.user_id = $${params.length + 1}`);
    params.push(user.id);
  }

  // 2. Status filtering
  if (status) {
    whereClauses.push(`t.approved = $${params.length + 1}`);
    params.push(status === 'approved');
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY t.approved DESC, t.created_at DESC';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTrip = async (req, res) => {
  const { id } = req.params;
  try {
    const tripResult = await db.query(`
      SELECT t.*, u.username as user_name, u.email as user_email, a.name as agent_name 
      FROM trips t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN agents a ON t.agent_id = a.id
      WHERE t.id::text = $1 OR t.uuid::text = $1
    `, [id]);
    if (tripResult.rows.length === 0) return res.status(404).json({ message: 'Trip not found' });
    
    const trip = tripResult.rows[0];

    // Ownership Enforcement: Non-admins can only get their own trips
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && trip.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You do not own this trip' });
    }
    const hotelItems = await db.query('SELECT * FROM hotel_trip_items WHERE trip_item_id = $1', [trip.id]);
    const transferItems = await db.query('SELECT * FROM transfer_trip_items WHERE trip_item_id = $1', [trip.id]);
    const excursionItems = await db.query(`
      SELECT eti.*, e.name as excursion_name 
      FROM excursion_trip_items eti
      JOIN excursions e ON eti.excursion_id = e.id
      WHERE eti.trip_item_id = $1
    `, [trip.id]);
    const tourItems = await db.query(`
      SELECT tti.*, t.name as tour_name 
      FROM tour_trip_items tti
      JOIN tours t ON tti.tour_id = t.id
      WHERE tti.trip_item_id = $1
    `, [trip.id]);
    const flightItems = await db.query('SELECT * FROM flight_trip_items WHERE trip_item_id = $1', [trip.id]);
    const otherItems = await db.query(`
      SELECT oti.*, o.description, o.amount as price 
      FROM other_trip_items oti
      JOIN others o ON oti.other_id = o.id
      WHERE oti.trip_item_id = $1
    `, [trip.id]);

    trip.hotels = hotelItems.rows;
    trip.transfers = transferItems.rows;
    trip.excursions = excursionItems.rows;
    trip.tours = tourItems.rows;
    trip.flights = flightItems.rows;
    trip.other = otherItems.rows;

    res.json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createTrip = async (req, res) => {
  const { 
    agent_id, client_name, client_phone, client_email, booking_reference, number_of_adults, number_of_kids, remarks,
    hotels, transfers, excursions, tours, flights, other, trip_start_date
  } = req.body;
  const uuid = randomUUID();

  try {
    await db.query('BEGIN');
    
    // Status: Only 'Declined' is a special state. Everything else is InProgress (approved=false, declined=false).
    const approved = false; // Approved status removed — no longer used
    const declined = req.body.status === 'Declined';

    // Enforcement: If the user is an agent, lock the agent_id to their own ID.
    // This prevents data from 'disappearing' from their list due to null/mismatched agent_id.
    let finalAgentId = agent_id;
    if (req.user && req.user.role === 'agent') {
      finalAgentId = req.user.agent_id;
    }

    const tripResult = await db.query(
      'INSERT INTO trips (uuid, agent_id, user_id, client_name, client_phone, client_email, booking_reference, number_of_adults, number_of_kids, remarks, total_amount, final_amount, trip_start_date, approved, declined) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
      [uuid, finalAgentId || null, req.user.id, client_name || 'N/A', client_phone || '', client_email || '', booking_reference || '', number_of_adults || 0, number_of_kids || 0, remarks || '', req.body.total_amount || 0, req.body.final_amount || 0, trip_start_date || null, approved, declined]
    );
    const trip = tripResult.rows[0];

    // 1. Hotels
    trip.hotels = [];
    if (hotels && hotels.length > 0) {
      for (const item of hotels) {
        const res = await db.query(
          `INSERT INTO hotel_trip_items (
            trip_item_id, hotel_id, from_date, to_date, city, hotel_name, nights, 
            single_price, double_price, room_type, promotion, meals, room_types_json, 
            early_check_in, late_check_out, flight_in, flight_out, flight_info, discount, notes, promotion_id, total_price, display_order, extra_adult_bed_count, extra_child_bed_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25) RETURNING *`,
          [
            trip.id, item.hotel_id || null, item.checkIn || null, item.checkOut || null, item.city || '', item.hotel || '', item.nights || 0, 
            item.singleRoom || 0, item.doubleRoom || 0, item.roomType || '', item.promotion || '',
            item.meals ? JSON.stringify(item.meals) : null,
            item.roomTypes ? JSON.stringify(item.roomTypes) : null,
            !!item.earlyCheckIn, !!item.lateCheckOut,
            item.flightIn || '', item.flightOut || '', item.flightInfo || '',
            item.discount || 0, item.notes || '', item.promotion_id || null,
            item.price || 0, item.display_order || 0,
            item.extraAdultBedCount || 0, item.extraChildBedCount || 0
          ]
        );
        trip.hotels.push(res.rows[0]);
      }
    }

    // 2. Transfers
    trip.transfers = [];
    if (transfers && transfers.length > 0) {
      for (const item of transfers) {
        const res = await db.query(
          'INSERT INTO transfer_trip_items (trip_item_id, transfer_id, from_location, to_location, from_date, to_date, tot, price, remarks, city, transfer_description, pickup_time, flight_number, flight_time, type_of_transfer) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
          [trip.id, item.transfer_id || null, item.from || '', item.to || '', item.date || null, item.date || null, mapToT(item.tot), item.price || 0, item.remarks || '', item.city || '', item.description || '', item.pickup || '', item.flight || '', item.flightTime || '', item.typeOfTransfer || item.type_of_transfer || '']
        );
        trip.transfers.push(res.rows[0]);
      }
    }

    // 3. Excursions
    trip.excursions = [];
    if (excursions && excursions.length > 0) {
      for (const item of excursions) {
        const res = await db.query(
          'INSERT INTO excursion_trip_items (trip_item_id, excursion_id, city, toe, from_date, to_date, hotel, price, remarks, pickup_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
          [trip.id, item.excursion_id || null, item.city || '', item.toe || '', item.date || null, item.date || null, item.hotel || '', item.price || 0, item.remarks || '', item.pickup || '']
        );
        trip.excursions.push(res.rows[0]);
      }
    }

    // 4. Tours
    trip.tours = [];
    if (tours && tours.length > 0) {
      for (const item of tours) {
        const res = await db.query(
          'INSERT INTO tour_trip_items (trip_item_id, tour_id, tot, from_location, from_date, to_date, number_of_adults, price, remarks, route, pax) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
          [trip.id, item.tour_id || null, mapToT(item.tot), item.city || '', item.date || null, item.date || null, number_of_adults || 0, item.price || 0, item.remarks || '', item.route || '', item.pax || 0]
        );
        trip.tours.push(res.rows[0]);
      }
    }

    // 5. Flights
    trip.flights = [];
    if (flights && flights.length > 0) {
      for (const item of flights) {
        const res = await db.query(
          'INSERT INTO flight_trip_items (trip_item_id, from_date, to_date, flight_number, in_or_out, route, price, remarks, edt, eat, flight_airline, issued_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
          [trip.id, item.date || null, item.date || null, item.number || '', item.inOut || '', item.route || '', item.cost || 0, item.remarks || '', item.edt || '', item.eat || '', item.flight || '', item.issued || '']
        );
        trip.flights.push(res.rows[0]);
      }
    }

    trip.other = [];
    if (other && other.length > 0) {
      for (const item of other) {
        let otherId = item.other_id;
        if (!otherId && item.description) {
           const oRes = await db.query("INSERT INTO others (description, amount, chargetype) VALUES ($1, $2, 'per unit') RETURNING id", [item.description, item.totalPrice || item.price || 0]);
           otherId = oRes.rows[0].id;
        }
        if (otherId) {
          const res = await db.query(
            'INSERT INTO other_trip_items (trip_item_id, other_id, from_date, to_date) VALUES ($1, $2, $3, $4) RETURNING *',
            [trip.id, otherId, item.date || null, item.date || null]
          );
          trip.other.push(res.rows[0]);
        }
      }
    }

    await db.query('COMMIT');

    // Real-time Notification
    const io = req.app.get('io');
    const isBooking = req.body.status === 'Approved' || approved;
    const type = isBooking ? 'Booking' : 'Quotation';
    const agentName = req.body.agent_name || 'Thailandia Agent';
    const title = `New ${type}`;
    const message = `New ${type} from ${agentName}: ${trip.client_name}`;

    // Save to Database for history
    // IMPORTANT: For 'New Trip', we set agent_id to NULL so it ONLY shows for Admins/SuperAdmins.
    // Per user rule: Agents ONLY receive 'StatusUpdate' notifications.
    let notificationId = Date.now(); 
    try {
      const notifResult = await db.query(
        'INSERT INTO notifications (type, title, message, link_id, agent_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [type, title, message, trip.uuid || trip.id, null]
      );
      notificationId = notifResult.rows[0].id;
    } catch (dbErr) {
      console.error('Error saving notification to DB:', dbErr);
    }

    if (io) {
      // TARGETING: New trips only go to Admins.
      io.to('admins').emit('notification:new_trip', {
        id: notificationId,
        uuid: trip.uuid,
        client_name: trip.client_name,
        type: type,
        agent: agentName,
        agent_id: finalAgentId,
        message: message,
        timestamp: new Date()
      });
    }

    res.status(201).json(trip);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  const { 
    agent_id, client_name, client_phone, client_email, booking_reference, number_of_adults, number_of_kids, remarks,
    hotels, transfers, excursions, tours, flights, other, total_amount, final_amount, trip_start_date
  } = req.body;

  try {
    await db.query('BEGIN');
    
    const result = await db.query(
      'UPDATE trips SET agent_id=$1, client_name=$2, client_phone=$3, client_email=$4, booking_reference=$5, number_of_adults=$6, number_of_kids=$7, remarks=$8, total_amount=$9, final_amount=$10, trip_start_date=$11, updated_at=CURRENT_TIMESTAMP WHERE id::text=$12 OR uuid::text=$12 RETURNING *',
      [agent_id || null, client_name || 'N/A', client_phone || '', client_email || '', booking_reference || '', number_of_adults || 0, number_of_kids || 0, remarks || '', total_amount || 0, final_amount || 0, trip_start_date || null, id]
    );

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Trip not found' });
    }
    const trip = result.rows[0];

    // Ownership Enforcement: Agents can only update their own trips
    if (req.user.role === 'agent' && trip.user_id !== req.user.id) {
      await db.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied: You do not own this trip' });
    }

    // Delete old items
    await db.query('DELETE FROM hotel_trip_items WHERE trip_item_id = $1', [trip.id]);
    await db.query('DELETE FROM transfer_trip_items WHERE trip_item_id = $1', [trip.id]);
    await db.query('DELETE FROM excursion_trip_items WHERE trip_item_id = $1', [trip.id]);
    await db.query('DELETE FROM tour_trip_items WHERE trip_item_id = $1', [trip.id]);
    await db.query('DELETE FROM flight_trip_items WHERE trip_item_id = $1', [trip.id]);
    await db.query('DELETE FROM other_trip_items WHERE trip_item_id = $1', [trip.id]);

    // Insert new items
    trip.hotels = [];
    if (hotels) {
      for (const item of hotels) {
        const res = await db.query(
          `INSERT INTO hotel_trip_items (
            trip_item_id, hotel_id, from_date, to_date, city, hotel_name, nights, 
            single_price, double_price, room_type, promotion, meals, room_types_json, 
            early_check_in, late_check_out, flight_in, flight_out, flight_info, discount, notes, promotion_id, total_price, display_order, extra_adult_bed_count, extra_child_bed_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25) RETURNING *`,
          [
            trip.id, item.hotel_id || null, item.checkIn || null, item.checkOut || null, item.city || '', item.hotel || '', item.nights || 0, 
            item.singleRoom || 0, item.doubleRoom || 0, item.roomType || '', item.promotion || '',
            item.meals ? JSON.stringify(item.meals) : null,
            item.roomTypes ? JSON.stringify(item.roomTypes) : null,
            !!item.earlyCheckIn, !!item.lateCheckOut,
            item.flightIn || '', item.flightOut || '', item.flightInfo || '',
            item.discount || 0, item.notes || '', item.promotion_id || null,
            item.price || 0, item.display_order || 0,
            item.extraAdultBedCount || 0, item.extraChildBedCount || 0
          ]
        );
        trip.hotels.push(res.rows[0]);
      }
    }
    trip.transfers = [];
    if (transfers) {
      for (const item of transfers) {
        const res = await db.query('INSERT INTO transfer_trip_items (trip_item_id, transfer_id, from_location, to_location, from_date, to_date, tot, price, remarks, city, transfer_description, pickup_time, flight_number, flight_time, type_of_transfer) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *',
          [trip.id, item.transfer_id || null, item.from || '', item.to || '', item.date || null, item.date || null, mapToT(item.tot), item.price || 0, item.remarks || '', item.city || '', item.description || '', item.pickup || '', item.flight || '', item.flightTime || '', item.typeOfTransfer || item.type_of_transfer || '']);
        trip.transfers.push(res.rows[0]);
      }
    }
    trip.excursions = [];
    if (excursions) {
      for (const item of excursions) {
        const res = await db.query('INSERT INTO excursion_trip_items (trip_item_id, excursion_id, city, toe, from_date, to_date, hotel, price, remarks, pickup_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
          [trip.id, item.excursion_id || null, item.city || '', item.toe || '', item.date || null, item.date || null, item.hotel || '', item.price || 0, item.remarks || '', item.pickup || '']);
        trip.excursions.push(res.rows[0]);
      }
    }
    trip.tours = [];
    if (tours) {
      for (const item of tours) {
        const res = await db.query('INSERT INTO tour_trip_items (trip_item_id, tour_id, tot, from_location, from_date, to_date, number_of_adults, price, remarks, route, pax) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
          [trip.id, item.tour_id || null, mapToT(item.tot), item.city || '', item.date || null, item.date || null, number_of_adults || 0, item.price || 0, item.remarks || '', item.route || '', item.pax || 0]);
        trip.tours.push(res.rows[0]);
      }
    }
    trip.flights = [];
    if (flights) {
      for (const item of flights) {
        const res = await db.query('INSERT INTO flight_trip_items (trip_item_id, from_date, to_date, flight_number, in_or_out, route, price, remarks, edt, eat, flight_airline, issued_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
          [trip.id, item.date || null, item.date || null, item.number || '', item.inOut || '', item.route || '', item.cost || 0, item.remarks || '', item.edt || '', item.eat || '', item.flight || '', item.issued || '']);
        trip.flights.push(res.rows[0]);
      }
    }
    trip.other = [];
    if (other && other.length > 0) {
      for (const item of other) {
        let otherId = item.other_id;
        if (!otherId && item.description) {
           const oRes = await db.query("INSERT INTO others (description, amount, chargetype) VALUES ($1, $2, 'per unit') RETURNING id", [item.description, item.totalPrice || item.price || 0]);
           otherId = oRes.rows[0].id;
        }
        if (otherId) {
          const res = await db.query(
            'INSERT INTO other_trip_items (trip_item_id, other_id, from_date, to_date) VALUES ($1, $2, $3, $4) RETURNING *',
            [trip.id, otherId, item.date || null, item.date || null]
          );
          trip.other.push(res.rows[0]);
        }
      }
    }

    await db.query('COMMIT');
    res.json(trip);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateTripStatus = async (req, res) => {
  const { status } = req.body; // e.g., 'InProgress', 'Declined', 'Confirm Booking'
  try {
    const declined = status === 'Declined';
    const result = await db.query(
      'UPDATE trips SET status=$1, declined=$2, updated_at=CURRENT_TIMESTAMP WHERE id::text=$3 RETURNING *',
      [status, declined, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Trip not found' });
    const trip = result.rows[0];

    // Real-time Notification for Status Update
    const io = req.app.get('io');
    const title = 'Status Updated';
    const message = `Booking for ${trip.client_name} updated to: ${status}`;

    // Save to Database for history
    let notificationId = Date.now();
    try {
      const notifResult = await db.query(
        'INSERT INTO notifications (type, title, message, link_id, agent_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['StatusUpdate', title, message, trip.uuid || trip.id, trip.agent_id || null]
      );
      notificationId = notifResult.rows[0].id;
    } catch (dbErr) {
      console.error('Error saving notification update to DB:', dbErr);
    }

    if (io) {
      // TARGETING: Status updates go to Admins and the SPECIFIC Agent.
      io.to('admins').emit('notification:status_update', {
        id: notificationId,
        uuid: trip.uuid,
        client_name: trip.client_name,
        status: status,
        agent_id: trip.agent_id,
        message: message,
        timestamp: new Date()
      });
      
      // Target the SPECIFIC Agent ONLY if an Admin is performing the update.
      // Rule: Agents only get notified of updates FROM Admins.
      if (req.user.role !== 'agent' && trip.agent_id) {
        io.to(`agent_${trip.agent_id}`).emit('notification:status_update', {
          id: notificationId,
          uuid: trip.uuid,
          client_name: trip.client_name,
          status: status,
          agent_id: trip.agent_id,
          message: message,
          timestamp: new Date()
        });
      }
    }

    res.json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteTrip = async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  try {
    await db.query('BEGIN');
    
    // Check ownership first
    const tripRes = await db.query('SELECT user_id FROM trips WHERE id::text = $1 OR uuid::text = $1', [id]);
    if (tripRes.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Trip not found' });
    }
    
    const trip = tripRes.rows[0];
    if (user.role === 'agent' && trip.user_id !== user.id) {
      await db.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied: You do not own this trip' });
    }

    // Attempt to delete by id or uuid. 
    // The database's ON DELETE CASCADE will automatically handle all child tables.
    const result = await db.query(
      'DELETE FROM trips WHERE id::text = $1 OR uuid::text = $1 RETURNING id',
      [id]
    );

    await db.query('COMMIT');
    res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error in deleteTrip:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.convertToBooking = async (req, res) => {
  const { id } = req.params;
  try {
    // Guard: check if already converted
    const existing = await db.query(
      'SELECT is_booking FROM trips WHERE id::text = $1 OR uuid::text = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (existing.rows[0].is_booking === true) {
      return res.status(409).json({ message: 'This trip has already been converted to a booking.' });
    }

    const result = await db.query(
      'UPDATE trips SET is_booking = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id::text = $1 OR uuid::text = $1 RETURNING *',
      [id]
    );
    const trip = result.rows[0];

    // Notification
    const io = req.app.get('io');
    const title = 'Converted to Booking';
    const message = `Quotation for ${trip.client_name} (Ref: ${trip.booking_reference || 'N/A'}) has been converted to a Booking!`;

    let notificationId = Date.now();
    try {
      const notifResult = await db.query(
        'INSERT INTO notifications (type, title, message, link_id, agent_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['BookingConverted', title, message, trip.uuid || trip.id, trip.agent_id || null]
      );
      notificationId = notifResult.rows[0].id;
    } catch (dbErr) {
      console.error('Error saving convert notification:', dbErr);
    }

    if (io) {
      const payload = {
        id: notificationId,
        uuid: trip.uuid,
        client_name: trip.client_name,
        type: 'BookingConverted',
        message: message,
        timestamp: new Date()
      };
      
      // Target admins
      io.to('admins').emit('notification:booking_converted', payload);
      
      // Target specific agent if exists
      if (trip.agent_id) {
        io.to(`agent_${trip.agent_id}`).emit('notification:booking_converted', payload);
      }
    }

    res.json({ message: 'Successfully converted to booking', trip });
  } catch (err) {
    console.error('Error in convertToBooking:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

