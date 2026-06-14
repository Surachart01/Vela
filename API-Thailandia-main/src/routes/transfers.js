const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, authorize(['admin', 'superadmin', 'agent', 'user'], 'cp_transfers'), transferController.listTransfers);
router.get('/:id', transferController.getTransfer);
router.post('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_transfers'), transferController.createTransfer);
router.put('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_transfers'), transferController.updateTransfer);
router.delete('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_transfers'), transferController.deleteTransfer);

module.exports = router;
