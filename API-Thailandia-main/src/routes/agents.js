const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_agents'), agentController.listAgents);
router.get('/my-markup', authenticateToken, agentController.getMyMarkup);
router.get('/:id/markup', authenticateToken, authorize(['admin', 'superadmin'], 'cp_agents'), agentController.getAgentMarkup);
router.post('/', authenticateToken, authorize(['admin', 'superadmin'], 'cp_agents'), agentController.createAgent);
router.put('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_agents'), agentController.updateAgent);
router.delete('/:id', authenticateToken, authorize(['admin', 'superadmin'], 'cp_agents'), agentController.deleteAgent);

module.exports = router;

