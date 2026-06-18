import 'dotenv/config';
import jwt from 'jsonwebtoken';
import userRepository from '../modules/user/userRepository.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  console.log(" user MIDDLEWARE START");

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError("Unauthorized: Token missing", 401);
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    throw new AppError("Unauthorized: Token missing", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new AppError("Unauthorized: Invalid or expired token", 401);
  }

  if (!decoded.id) {
    throw new AppError("Unauthorized: Invalid token payload", 401);
  }

  const user = await userRepository.getFullUserById(decoded.id);

  console.log(" USER FROM DB:", user);

  if (!user) {
    throw new AppError("Unauthorized: User not found", 401);
  }

  if (Number(user.IsDeleted) === 1) {
    throw new AppError("Account is deactivated", 401);
  }

  req.user = user;
  next();
});

export default authMiddleware;