const express = require('express');
const router = express.Router();
const otherChargeController = require('../controllers/otherChargeController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_other_charges'), otherChargeController.listOtherCharges);
router.get('/:id', otherChargeController.getOtherCharge);
router.post('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_other_charges'), otherChargeController.createOtherCharge);
router.put('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_other_charges'), otherChargeController.updateOtherCharge);
router.delete('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_other_charges'), otherChargeController.deleteOtherCharge);

module.exports = router;
