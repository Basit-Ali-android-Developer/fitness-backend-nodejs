import mealService from './mealService.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createMeal = asyncHandler(async (req, res) => {
  const result = await mealService.createMeal(req.user.Id, req.body);

  res.status(201).json({
    result: "success",
    message: "Meal created successfully",
    data: result
  });
});

const getUserMeals = asyncHandler(async (req, res) => {
  const result = await mealService.getUserMeals(req.user.Id);

  res.status(200).json({
    result: "success",
    message: result.length ? "Meals fetched successfully" : "No meals found",
    data: result
  });
});

const getMealById = asyncHandler(async (req, res) => {
  const mealId = parseInt(req.params.id);
  const result = await mealService.getMealById(req.user.Id, mealId);

  res.status(200).json({
    result: "success",
    message: "Meal fetched successfully",
    data: result
  });
});

const updateMeal = asyncHandler(async (req, res) => {
  const UserId = req.user.Id;
  const mealId = parseInt(req.params.id);

  console.log(" controller", UserId , mealId);

  const result = await mealService.updateMeal(UserId, mealId, req.body);

  res.status(200).json({
    result: "success",
    message: result.message,
    data: result.data
  });
});

const deleteMeal = asyncHandler(async (req, res) => {
  const UserId = req.user.Id;
  const mealId = parseInt(req.params.id);

  const result = await mealService.deleteMeal(UserId, mealId);

  return res.status(200).json({
    result: "success",
    message: result.message
  });
});

const getTodayMeals = asyncHandler(async (req, res) => {
  const result = await mealService.getTodayMeals(req.user.Id);

  res.status(200).json({
    result: "success",
    message: result.length ? "Meals fetched successfully" : "No meals found",
    data: result
  });
});

const markMealDone = asyncHandler(async (req, res) => {
  const UserId = req.user.Id;
  const trackingId = parseInt(req.params.id);

  const result = await mealService.markMealDone(UserId, trackingId);

  return res.status(200).json({
    result: "success",
    message: result.message
  });
});

const getMealHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const result = await mealService.getMealHistory(req.user.Id, page);

  res.status(200).json({
    result: "success",
    message: result.data.length
      ? "Meal history fetched successfully"
      : "No meal history found",
    data: result.data,
    pagination: result.pagination
  });
});

export {
  createMeal,
  getUserMeals,
  getMealById,
  updateMeal,
  deleteMeal,
  getTodayMeals,
  markMealDone,
  getMealHistory
};