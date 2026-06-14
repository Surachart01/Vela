const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, authorize(['admin', 'superadmin', 'agent', 'user'], 'cp_tours'), tourController.listTours);
router.get('/:id', tourController.getTour);
router.post('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_tours'), tourController.createTour);
router.put('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_tours'), tourController.updateTour);
router.delete('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_tours'), tourController.deleteTour);

module.exports = router;
