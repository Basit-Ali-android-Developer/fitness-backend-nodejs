const adminMiddleware = (req, res, next) => {
  try {
    if (req.user.userType !== 'Admin') {
      return res.status(403).json({
        result: "error",
        message: "Access denied. Admin only.",
        data: null
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};

module.exports = adminMiddleware;