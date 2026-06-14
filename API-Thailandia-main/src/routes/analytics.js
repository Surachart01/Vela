const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, authorize } = require('../middleware/auth');

// All analytics routes require authentication
router.use(authenticateToken);

// Metrics and trends can be accessed by everyone (Agents see their own, Admins see all)
router.get('/metrics', analyticsController.getDashboardMetrics);
router.get('/trends', analyticsController.getMonthlyTrends);

module.exports = router;
