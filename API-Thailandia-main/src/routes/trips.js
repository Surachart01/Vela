const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, tripController.listTrips);
router.get('/:id', authenticateToken, tripController.getTrip);
router.post('/', authenticateToken, tripController.createTrip);
router.put('/:id', authenticateToken, tripController.updateTrip);
router.put('/:id/status', authenticateToken, tripController.updateTripStatus);
router.put('/:id/convert', authenticateToken, tripController.convertToBooking);
router.delete('/:id', authenticateToken, tripController.deleteTrip);

module.exports = router;
