import userService from './userService.js';
import asyncHandler from '../../utils/asyncHandler.js';

const signup = asyncHandler(async (req, res) => {
  console.log("userController.signup: req.body =", req.body);
  await userService.signup(req.body);

  res.status(201).json({
    result: "success",
    message: "Account created successfully",
    data: null
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await userService.login(req.body);

  res.status(200).json({
    result: "success",
    message: "Login successful",
    data: result
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await userService.updateProfile(req.user, req.body);

  res.status(200).json({
    result: "success",
    message: "Profile updated successfully",
    data: result
  });
});

const getProfileById = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const result = await userService.getProfileById(userId);

  return res.status(200).json({
    result: "success",
    message: "Profile fetched successfully",
    data: result
  });
});

const getUserProfileWithDiet = asyncHandler(async (req, res) => {
  const userId = req.user.Id;
  const result = await userService.getUserProfileWithDiet(userId);

  return res.status(200).json({
    result: "success",
    message: "User profile fetched successfully",
    data: result
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.user.Id; 
  const result = await userService.deleteUser(userId);

  return res.status(200).json({
    result: "success",
    message: result.message,
    data: null
  });
});

const deleteUserByAdmin = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const result = await userService.deleteUserByAdmin(userId);

  return res.status(200).json({
    result: "success",
    message: result.message,
    data: null
  });
});

const ActivateUserByAdmin = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const result = await userService.ActivateUserByAdmin(userId);

  return res.status(200).json({
    result: "success",
    message: result.message,
    data: null
  });
});

const getUsersWithDiet = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const result = await userService.getUsersWithDiet(page);

  return res.status(200).json({
    result: "success",
    message: "Users with diet fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
});

export {
  signup,
  login,
  updateProfile,
  getProfileById,
  getUserProfileWithDiet,
  deleteUser,
  deleteUserByAdmin,
  ActivateUserByAdmin,
  getUsersWithDiet
};