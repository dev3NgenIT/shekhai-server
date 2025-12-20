const jwt = require('jsonwebtoken');

// Auth middleware - checks JWT and sets req.user
exports.auth = (req, res, next) => {
  try {
    const h = req.headers.authorization;
    if (!h) return res.status(401).json({ msg: 'No token' });

    const token = h.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Invalid token' });
  }
};

// Permit middleware - role-based authorization
exports.permit = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'Forbidden: Access denied' });
    }
    next();
  };
};
