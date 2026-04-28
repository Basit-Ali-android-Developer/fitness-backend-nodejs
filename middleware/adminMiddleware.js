const jwt = require('jsonwebtoken');
const userRepository = require('../modules/user/userRepository');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const JWT_SECRET = process.env.JWT_SECRET;

const adminMiddleware = asyncHandler(async (req, res, next) => {

  console.log("ADMIN MIDDLEWARE START");

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError("Unauthorized: Token missing", 401);
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new AppError("Unauthorized: Invalid or expired token", 401);
  }

  const user = await userRepository.getFullUserById(decoded.id);

  if (!user) {
    throw new AppError("Account not found", 401);
  }

  console.log(" USER FROM DB:", user);


  if (user.UserType !== 'Admin') {
    throw new AppError("Access denied. Admin only", 403);
  }


  if (Number(user.IsDeleted) === 1) {
    throw new AppError("Admin Account is deactivated", 401);
  }

  req.user = user;

  next();
});


module.exports = adminMiddleware;