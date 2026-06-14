const nodemailer = require('nodemailer');
const db = require('../db');
require('dotenv').config();

exports.sendHotelBookingEmail = async (req, res) => {
  const { hotel_id, bookingData } = req.body;
  const itemId = bookingData.item_id; // Added item_id from front-end

  try {
    // 1. Fetch hotel contact email
    const contactResult = await db.query(
      'SELECT email FROM hotel_contacts WHERE hotel_id = $1 LIMIT 1',
      [hotel_id]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ message: 'No contact email found for this hotel. Please add a contact email in the Hotel Management page.' });
    }

    const hotelEmail = contactResult.rows[0].email;

    // 2. Setup nodemailer
    let transporter;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true' || true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      let testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    // Prepare Meal Details
    let mealsHtml = 'None';
    if (bookingData.meals) {
      const parts = [];
      if (bookingData.meals.hasAbf) parts.push(`ABF (${bookingData.meals.abfDays || 0} days)`);
      if (bookingData.meals.hasLunch) parts.push(`Lunch (${bookingData.meals.lunchDays || 0} days)`);
      if (bookingData.meals.hasDinner) parts.push(`Dinner (${bookingData.meals.dinnerDays || 0} days)`);
      if (bookingData.meals.hasAllInclusive) parts.push(`All-Inclusive (${bookingData.meals.allInclusiveDays || 0} days)`);
      mealsHtml = parts.join(', ') || 'None';
    }

    // Generate Smart Links
    const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const confirmUrl = itemId ? `${baseUrl}/api/v1/emails/confirm-hotel/${itemId}` : '#';
    const rejectUrl = itemId ? `${baseUrl}/api/v1/emails/reject-hotel/${itemId}` : '#';

    // 3. Create HTML template (Professional Design)
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: auto; border: 1px solid #e0e0e0; padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="background-color: #FF5E00; padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">BOOKING REQUEST</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Ref: ${bookingData.bookingRef || 'NEW'}</p>
        </div>
        
        <div style="padding: 30px; color: #444;">
          <p style="font-size: 16px;">Dear <strong>${bookingData.hotel_name} Reservation Team</strong>,</p>
          <p>We are pleased to request a reservation with the following details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 25px; border: 1px solid #f0f0f0;">
            <tr style="background-color: #fcfcfc;">
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #8F8071; width: 140px;">Check-in</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${bookingData.checkIn}</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #8F8071;">Check-out</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${bookingData.checkOut} (${bookingData.nights} Nights)</td>
            </tr>
            <tr style="background-color: #fcfcfc;">
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #8F8071;">Room Type</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${bookingData.roomType}</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #8F8071;">Promotion</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${bookingData.promotion || '-'}</td>
            </tr>
            <tr style="background-color: #fcfcfc;">
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #8F8071;">Meal Plan</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${mealsHtml}</td>
            </tr>
          </table>

          ${bookingData.notes ? `
          <div style="margin-top: 25px; padding: 15px; background-color: #fff9f5; border-left: 4px solid #FF5E00; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #FF5E00; font-size: 14px;">Special Requests:</p>
            <p style="margin: 5px 0 0 0; font-style: italic;">${bookingData.notes}</p>
          </div>
          ` : ''}

          <!-- CALL TO ACTION BUTTONS -->
          ${itemId ? `
          <div style="margin-top: 35px; text-align: center;">
            <a href="${confirmUrl}" style="display: inline-block; padding: 14px 28px; background-color: #28a745; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 15px; box-shadow: 0 4px 6px rgba(40,167,69,0.2);">CONFIRM BOOKING</a>
            <a href="${rejectUrl}" style="display: inline-block; padding: 14px 28px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 6px rgba(220,53,69,0.2);">NOT AVAILABLE</a>
          </div>
          <p style="text-align: center; font-size: 12px; color: #999; margin-top: 15px;">By clicking these buttons, the status will update in our system automatically.</p>
          ` : `
          <p style="margin-top: 30px;">Please reply to this email to confirm the availability. Thank you.</p>
          `}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #888;">
            <p style="margin: 0;">Kind Regards,</p>
            <p style="margin: 5px 0 0 0; font-weight: bold; color: #444; font-size: 15px;">Thailandia Operations Team</p>
          </div>
        </div>
      </div>
    `;

    // 4. Send email
    let info = await transporter.sendMail({
      from: `"Thailandia Booking" <${process.env.SMTP_FROM || 'booking@thailandia.com'}>`,
      to: hotelEmail,
      subject: `Booking Request [${bookingData.bookingRef || 'NEW'}] - ${bookingData.hotel_name}`,
      html: htmlContent,
    });

    res.json({
      message: 'Email sent successfully!',
      messageId: info.messageId,
      previewUrl: process.env.SMTP_USER ? null : nodemailer.getTestMessageUrl(info),
      recipient: hotelEmail
    });

  } catch (err) {
    console.error('Email sending error:', err);
    res.status(500).json({ message: 'Error sending email: ' + err.message });
  }
};

// --- NEW HANDLERS FOR CONFIRMATION/REJECTION ---

exports.confirmHotelBooking = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      "UPDATE hotel_trip_items SET booking_status = 'Confirmed', booking_remark = 'Hotel confirmed via email link' WHERE id::text = $1",
      [id]
    );
    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #28a745;">Booking Confirmed!</h1>
        <p>Thank you for confirming the reservation. Our team has been notified.</p>
        <p style="color: #666;">Thailandia Trading & Traveling</p>
      </div>
    `);
  } catch (err) {
    res.status(500).send('Error updating booking status.');
  }
};

exports.showRejectForm = async (req, res) => {
  const { id } = req.params;
  res.send(`
    <div style="font-family: sans-serif; max-width: 500px; margin: 100px auto; padding: 30px; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      <h2 style="color: #dc3545; margin-top: 0;">Report Unavailability</h2>
      <p>Please provide a reason why this booking cannot be confirmed:</p>
      <form action="/api/v1/emails/reject-hotel/${id}" method="POST">
        <textarea name="remark" style="width: 100%; height: 100px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" placeholder="e.g., Hotel is fully booked, maintenance, etc." required></textarea>
        <button type="submit" style="margin-top: 20px; width: 100%; padding: 12px; background-color: #dc3545; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">SUBMIT REJECTION</button>
      </form>
    </div>
  `);
};

exports.submitRejection = async (req, res) => {
  const { id } = req.params;
  const { remark } = req.body;
  try {
    await db.query(
      "UPDATE hotel_trip_items SET booking_status = 'Rejected', booking_remark = $1 WHERE id::text = $2",
      [remark, id]
    );
    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #dc3545;">Response Received</h1>
        <p>Thank you for your feedback. We will look for alternative options.</p>
        <p style="color: #666;">Thailandia Trading & Traveling</p>
      </div>
    `);
  } catch (err) {
    res.status(500).send('Error updating booking status.');
  }
};
exports.sendAgentBookingNotification = async (req, res) => {
  const { trip_id, agentEmail, status, ...trip } = req.body;

  // Map fields from DB snake_case to readable variables
  const clientName = trip.client_name || 'N/A';
  const tripStartDate = trip.trip_start_date ? new Date(trip.trip_start_date).toLocaleDateString() : 'N/A';
  const pax = trip.number_of_adults || 0;

  try {
    // 1. Setup nodemailer
    let transporter;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true' || true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      let testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    // 2. Prepare Detailed Content for ALL categories
    let itineraryHtml = '';

    // Hotels
    if (trip.hotels && trip.hotels.length > 0) {
      itineraryHtml += `<div style="margin-bottom: 20px;"><h3 style="color: #FF5E00; border-bottom: 1px solid #eee; padding-bottom: 5px;">🏨 Hotels</h3><table style="width: 100%; border-collapse: collapse;">`;
      trip.hotels.forEach(h => {
        itineraryHtml += `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0;"><strong>${h.hotel_name || 'Hotel'}</strong><br><small>${new Date(h.from_date).toLocaleDateString()} to ${new Date(h.to_date).toLocaleDateString()} (${h.nights} nights) - ${h.room_type || 'Standard'}</small></td></tr>`;
      });
      itineraryHtml += `</table></div>`;
    }

    // Transfers
    if (trip.transfers && trip.transfers.length > 0) {
      itineraryHtml += `<div style="margin-bottom: 20px;"><h3 style="color: #FF5E00; border-bottom: 1px solid #eee; padding-bottom: 5px;">🚗 Transfers</h3><table style="width: 100%; border-collapse: collapse;">`;
      trip.transfers.forEach(t => {
        itineraryHtml += `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0;"><strong>${t.transfer_type || 'Transfer'}</strong>: ${t.from_location} ➔ ${t.to_location}<br><small>Date: ${new Date(t.from_date).toLocaleDateString()} | Type: ${t.tot || 'PVT'}</small></td></tr>`;
      });
      itineraryHtml += `</table></div>`;
    }

    // Excursions
    if (trip.excursions && trip.excursions.length > 0) {
      itineraryHtml += `<div style="margin-bottom: 20px;"><h3 style="color: #FF5E00; border-bottom: 1px solid #eee; padding-bottom: 5px;">📸 Excursions</h3><table style="width: 100%; border-collapse: collapse;">`;
      trip.excursions.forEach(e => {
        itineraryHtml += `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0;"><strong>${e.excursion_name || 'Activity'}</strong> (${e.city})<br><small>Date: ${new Date(e.from_date).toLocaleDateString()} | Type: ${e.toe || 'PVT'}</small></td></tr>`;
      });
      itineraryHtml += `</table></div>`;
    }

    // Tours
    if (trip.tours && trip.tours.length > 0) {
      itineraryHtml += `<div style="margin-bottom: 20px;"><h3 style="color: #FF5E00; border-bottom: 1px solid #eee; padding-bottom: 5px;">🗺️ Tours</h3><table style="width: 100%; border-collapse: collapse;">`;
      trip.tours.forEach(t => {
        itineraryHtml += `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0;"><strong>${t.tour_name || 'Tour Package'}</strong><br><small>Date: ${new Date(t.from_date).toLocaleDateString()} | Route: ${t.from_location || '-'}</small></td></tr>`;
      });
      itineraryHtml += `</table></div>`;
    }

    // Flights
    if (trip.flights && trip.flights.length > 0) {
      itineraryHtml += `<div style="margin-bottom: 20px;"><h3 style="color: #FF5E00; border-bottom: 1px solid #eee; padding-bottom: 5px;">✈️ Flights</h3><table style="width: 100%; border-collapse: collapse;">`;
      trip.flights.forEach(f => {
        itineraryHtml += `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 8px 0;"><strong>Flight ${f.flight_number}</strong> (${f.in_or_out})<br><small>Date: ${new Date(f.from_date).toLocaleDateString()} | Route: ${f.route || '-'}</small></td></tr>`;
      });
      itineraryHtml += `</table></div>`;
    }

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #e0e0e0; padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="background-color: #FF5E00; padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">BOOKING CONFIRMATION</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Trip ID: ${trip_id}</p>
        </div>
        
        <div style="padding: 30px; color: #444;">
          <p style="font-size: 16px;">Dear <strong>Agent</strong>,</p>
          <p>We are pleased to confirm the booking for your client with the following details:</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF5E00;">
            <table style="width: 100%;">
              <tr><td style="padding: 4px 0; color: #666; width: 140px;">Client Name:</td><td style="font-weight: bold;">${clientName}</td></tr>
              <tr><td style="padding: 4px 0; color: #666;">Trip Start Date:</td><td style="font-weight: bold;">${tripStartDate}</td></tr>
              <tr><td style="padding: 4px 0; color: #666;">Number of Pax:</td><td style="font-weight: bold;">${pax} Adults</td></tr>
              ${trip.booking_reference ? `<tr><td style="padding: 4px 0; color: #666;">Booking Ref:</td><td style="font-weight: bold;">${trip.booking_reference}</td></tr>` : ''}
            </table>
          </div>

          <div style="margin-top: 30px;">
            ${itineraryHtml || '<p style="font-style: italic; color: #999;">No specific service items found for this booking.</p>'}
          </div>

          <div style="text-align: center; margin-top: 40px; padding: 30px; border-top: 1px solid #eee; background-color: #fcfcfc;">
            <div style="display: inline-block; padding: 15px 35px; background-color: #28a745; color: white; border-radius: 8px; font-weight: bold; font-size: 20px; box-shadow: 0 4px 10px rgba(40,167,69,0.2);">
              ${status === 'Confirm Booking' ? 'CONFIRM BOOKING' : status.toUpperCase()}
            </div>
            <p style="color: #28a745; font-weight: bold; font-size: 14px; margin-top: 15px;">This booking is now officially confirmed in our system.</p>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #888;">
            <p style="margin: 0;">Kind Regards,</p>
            <p style="margin: 5px 0 0 0; font-weight: bold; color: #444; font-size: 15px;">Thailandia Operations Team</p>
          </div>
        </div>
      </div>
    `;

    // 3. Send email
    await transporter.sendMail({
      from: `"Thailandia Booking" <${process.env.SMTP_FROM || 'booking@thailandia.com'}>`,
      to: agentEmail || process.env.SMTP_USER,
      subject: `Booking Confirmed: ${clientName} - Trip ID: ${trip_id}`,
      html: htmlContent,
    });

    res.json({ message: 'Notification email sent to Agent successfully!' });

  } catch (err) {
    console.error('Email sending error:', err);
    res.status(500).json({ message: 'Error sending email: ' + err.message });
  }
};
