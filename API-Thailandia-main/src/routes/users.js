const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, authorize('superadmin'), userController.listUsers);
router.get('/:id', authenticateToken, authorize('superadmin'), userController.getUser);
router.post('/', authenticateToken, authorize('superadmin'), userController.createUser);
router.put('/:id', authenticateToken, authorize('superadmin'), userController.updateUser);
router.patch('/:id/role', authenticateToken, authorize('superadmin'), userController.updateRole);
router.patch('/:id/permissions', authenticateToken, authorize('superadmin'), userController.updatePermissions);
router.post('/migrate', authenticateToken, authorize('superadmin'), userController.migratePermissions);
router.delete('/:id', authenticateToken, authorize('superadmin'), userController.deleteUser);

module.exports = router;
