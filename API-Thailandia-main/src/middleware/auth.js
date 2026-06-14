const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const authorize = (roles = [], pageId = null) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    // 1. SuperAdmin bypass
    if (user.role === 'superadmin') return next();

    // 2. Role check
    const hasRole = roles.length === 0 || roles.includes(user.role);

    // 3. Granular Page Permission check
    const hasPageAccess = pageId && user.permissions && user.permissions.pages && user.permissions.pages.includes(pageId);

    if (hasRole || hasPageAccess) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden' });
  };
};

module.exports = { authenticateToken, authorize };
