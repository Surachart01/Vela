const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const { Pool } = require('pg');
const axios = require('axios');

// Initialize Express
const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.json({ limit: '500mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

const PORT = process.env.PORT || 4300;
const httpServer = http.createServer(app);

// Initialize Socket.io
const io = require('socket.io')(httpServer, {
  cors: { origin: '*' }
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  socket.on('join', (data) => {
    if (data.role === 'admin' || data.role === 'superadmin') {
      socket.join('admins');
      console.log(`[Socket] ${socket.id} joined admins room`);
    } else if (data.role === 'agent' && data.agent_id) {
      socket.join(`agent_${data.agent_id}`);
      console.log(`[Socket] ${socket.id} joined agent_${data.agent_id} room`);
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

// Initialize PostgreSQL Pool
const { pool } = require('./src/db');

// Import shared logic/configs (if needed by other files)
// const google_api = require("./src/google_api.js");
// const login = require("./src/setting.js");


// Import Routes
const authRoutes = require('./src/routes/auth');
const hotelRoutes = require('./src/routes/hotels');
const agentRoutes = require('./src/routes/agents');
const tourRoutes = require('./src/routes/tours');
const transferRoutes = require('./src/routes/transfers');
const excursionRoutes = require('./src/routes/excursions');
const tripRoutes = require('./src/routes/trips');
const supplierRoutes = require('./src/routes/suppliers');
const userRoutes = require('./src/routes/users');
const markupRoutes = require('./src/routes/markups');
const otherChargeRoutes = require('./src/routes/other-charges');
const paymentRoutes = require('./src/routes/payments');
const emailRoutes = require('./src/routes/email');
const notificationRoutes = require('./src/routes/notifications');
const analyticsRoutes = require('./src/routes/analytics');
const countryRoutes = require('./src/routes/countryRoutes');
const cityRoutes = require('./src/routes/cityRoutes');
const userController = require('./src/controllers/userController');

// Use Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/hotels', hotelRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/tours', tourRoutes);
app.use('/api/v1/transfers', transferRoutes);
app.use('/api/v1/excursions', excursionRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/markups', markupRoutes);
app.use('/api/v1/other-charges', otherChargeRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/emails', emailRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/countries', countryRoutes);
app.use('/api/v1/cities', cityRoutes);

// Start Server
httpServer.listen(PORT, async () => {
  console.log(`API Server running on port ${PORT}`);
  
  // Optional: Run migration on startup to ensure permissions are consistent
  try {
    const db = require('./src/db');
    const result = await db.query('SELECT id, permissions FROM users');
    let updatedCount = 0;
    for (const user of result.rows) {
      let perms = user.permissions;
      if (perms && perms.pages && perms.pages.includes('add-quotation')) {
        let pages = perms.pages.filter(p => p !== 'add-quotation');
        if (!pages.includes('quotation')) pages.push('quotation');
        perms.pages = Array.from(new Set(pages));
        await db.query('UPDATE users SET permissions = $1 WHERE id = $2', [JSON.stringify(perms), user.id]);
        updatedCount++;
      }
    }
    if (updatedCount > 0) console.log(`[Migration] Updated permissions for ${updatedCount} users.`);
  } catch (err) {
    console.error('[Migration] Failed:', err);
  }
});

module.exports = { app, io, pool }; 
