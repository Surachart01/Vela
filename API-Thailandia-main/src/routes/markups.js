const express = require('express');
const router = express.Router();
const markupController = require('../controllers/markupController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_markups'), markupController.listMarkups);
router.get('/groups', authenticateToken, authorize(['admin', 'superadmin'], 'cp_markups'), markupController.getMarkupGroups);
router.get('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_markups'), markupController.getMarkup);
router.post('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_markups'), markupController.createMarkup);
router.put('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_markups'), markupController.updateMarkup);
router.delete('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_markups'), markupController.deleteMarkup);

module.exports = router;
