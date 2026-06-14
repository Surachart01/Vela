const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, notificationController.listNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);
router.patch('/read-all', authenticateToken, notificationController.markAllAsRead);
router.patch('/:id/read', authenticateToken, notificationController.markAsRead);
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

module.exports = router;
