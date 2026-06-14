const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, cityController.listCities);
router.post('/', authenticateToken, cityController.addCity);
router.put('/:id', authenticateToken, cityController.updateCity);
router.delete('/:id', authenticateToken, cityController.deleteCity);

module.exports = router;
