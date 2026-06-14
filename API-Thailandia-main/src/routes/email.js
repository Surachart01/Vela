const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

router.post('/send-hotel-booking', emailController.sendHotelBookingEmail);

router.post('/send-agent-notification', emailController.sendAgentBookingNotification);

// New public endpoints for hotel interaction
router.get('/confirm-hotel/:id', emailController.confirmHotelBooking);
router.get('/reject-hotel/:id', emailController.showRejectForm);
router.post('/reject-hotel/:id', emailController.submitRejection);

module.exports = router;
