const jwt = require('jsonwebtoken');
const JWT_SECRET = "YOUR_SECRET_KEY_HERE";

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        result: "error",
        message: "Unauthorized: Token missing",
        data: null
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ attach user info to request
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      result: "error",
      message: "Unauthorized: Invalid token",
      data: null
    });
  }
};

module.exports = authMiddleware;