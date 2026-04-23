const jwt = require('jsonwebtoken');
const userRepository = require('../modules/user/userRepository');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = async (req, res, next) => {
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

    // 🔥 DB check
    const user = await userRepository.getById(decoded.id);

    if (!user || user.IsDeleted) {
      return res.status(401).json({
        result: "error",
        message: "Account is deactivated",
        data: null
      });
    }

    // ✅ Attach both JWT + DB user
    req.user = {
      ...decoded,
      dbUser: user
    };

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