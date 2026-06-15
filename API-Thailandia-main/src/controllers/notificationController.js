const db = require('../db');

exports.listNotifications = async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const user = req.user;

  try {
    let query = 'SELECT * FROM notifications';
    let params = [];
    let whereClause = [];

    // Filter by agent_id for agent users
    if (user && user.role === 'agent' && user.agent_id) {
      whereClause.push(`agent_id = $${whereClause.length + 1}`);
      params.push(user.agent_id);
    }

    if (whereClause.length > 0) {
      query += ' WHERE ' + whereClause.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    let countQuery = 'SELECT COUNT(*) FROM notifications';
    let countParams = [];
    if (whereClause.length > 0) {
      countQuery += ' WHERE ' + whereClause.join(' AND ');
      countParams = params.slice(0, whereClause.length);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      total,
      unread: result.rows.filter(n => !n.is_read).length
    });
  } catch (err) {
    console.error('Error listing notifications:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUnreadCount = async (req, res) => {
  const user = req.user;
  try {
    let query = 'SELECT COUNT(*) FROM notifications WHERE is_read = FALSE';
    let params = [];

    if (user && user.role === 'agent' && user.agent_id) {
      query += ' AND agent_id = $1';
      params.push(user.agent_id);
    }

    const result = await db.query(query, params);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Notification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.markAllAsRead = async (req, res) => {
  const user = req.user;
  try {
    let query = 'UPDATE notifications SET is_read = TRUE';
    let params = [];

    if (user && user.role === 'agent' && user.agent_id) {
      query += ' WHERE agent_id = $1';
      params.push(user.agent_id);
    }

    await db.query(query, params);
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteNotification = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM notifications WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
