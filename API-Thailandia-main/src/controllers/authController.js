const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, agent_id: user.agent_id, permissions: user.permissions },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        agent_id: user.agent_id,
        permissions: user.permissions
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid old password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
