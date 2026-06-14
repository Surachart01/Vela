const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_suppliers'), supplierController.listSuppliers);
router.get('/:id', supplierController.getSupplier);
router.post('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_suppliers'), supplierController.createSupplier);
router.put('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_suppliers'), supplierController.updateSupplier);
router.delete('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_suppliers'), supplierController.deleteSupplier);

module.exports = router;
