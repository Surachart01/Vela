const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, authorize(['admin', 'superadmin', 'agent', 'user'], 'cp_hotels'), hotelController.listHotels);
router.get('/cities', authenticateToken, hotelController.listCities);
router.get('/:id', hotelController.getHotel);
router.post('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_hotels'), hotelController.createHotel);
router.put('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_hotels'), hotelController.updateHotel);
router.delete('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_hotels'), hotelController.deleteHotel);

module.exports = router;
