const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, paymentController.listPayments);
router.put('/:id', authenticateToken, authorize('admin'), paymentController.updatePayment);
router.get('/:id/invoice', authenticateToken, paymentController.generateInvoice);
router.get('/:id/tax-invoice', authenticateToken, paymentController.generateTaxInvoice);

module.exports = router;
