const express = require('express');
const router = express.Router();
const excursionController = require('../controllers/excursionController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, authorize(['admin', 'superadmin', 'agent', 'user'], 'cp_excursions'), excursionController.listExcursions);
router.get('/:id', excursionController.getExcursion);
router.post('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_excursions'), excursionController.createExcursion);
router.put('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_excursions'), excursionController.updateExcursion);
router.delete('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_excursions'), excursionController.deleteExcursion);

module.exports = router;
