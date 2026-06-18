import foodService from './foodService.js';
import asyncHandler from '../../utils/asyncHandler.js';

const getFoods = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const result = await foodService.getFoods(page);

  res.status(200).json({
    result: "success",
    message: result.data.length === 0 ? "No foods available" : "Foods fetched successfully",
    data: result.data,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage
    }
  });
});

const addFood = asyncHandler(async (req, res) => {
  await foodService.addFood(req.body);

  res.status(201).json({
    result: "success",
    message: "Food added successfully",
    data: null
  });
});

const updateFood = asyncHandler(async (req, res) => {
  const result = await foodService.updateFood(req.params.id, req.body);

  res.status(200).json({
    result: "success",
    message: "Food updated successfully",
    data: result
  });
});

const deleteFood = asyncHandler(async (req, res) => {
  const result = await foodService.deleteFood(req.params.id);

  res.status(200).json({
    result: "success",
    message: result.message,
    data: null
  });
});

const activateFood = asyncHandler(async (req, res) => {
  const result = await foodService.activateFood(req.params.id);

  res.status(200).json({
    result: "success",
    message: result.message,
    data: null
  });
});

export {
  getFoods,
  addFood,
  updateFood,
  deleteFood,
  activateFood
};