const foodService = require('./foodService');
const asyncHandler = require('../../utils/asyncHandler');





const getFoods = asyncHandler(async (req, res) => {

  const result = await foodService.getFoods();

  res.status(200).json({
    result: "success",
    message: result.length === 0 ? "No foods available" : "Foods fetched successfully",
    data: result
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







module.exports = {
  getFoods,
  addFood,
  updateFood,
  deleteFood,
  activateFood
};