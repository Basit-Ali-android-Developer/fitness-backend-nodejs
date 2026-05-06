const Joi = require('joi');
const foodRepository = require('./foodRepository');
const AppError = require('../../utils/AppError');





const foodSchema = Joi.object({
  name: Joi.string().trim().min(2).required()
    .messages({
      "string.empty": "Food name is required",
      "string.min": "Food name must be at least 2 characters"
    }),

  calories: Joi.number().min(0).required()
    .messages({
      "number.base": "Calories must be a number",
      "number.min": "Calories cannot be negative"
    }),

  protein: Joi.number().min(0).required(),
  carbs: Joi.number().min(0).required(),
  fats: Joi.number().min(0).required(),

  unit: Joi.string().default("g")
});

// const getFoods = async () => {

//   return await foodRepository.getFoods();

// };

const getFoods = async (page) => {
  return await foodRepository.getFoods(page);
};






const addFood = async (data) => {

  const { error, value } = foodSchema.validate(data);

  if (error) {
    throw new AppError(error.details[0].message.replace(/"/g, ''), 400);
  }


  if (
    value.calories === 0 &&
    value.protein === 0 &&
    value.carbs === 0 &&
    value.fats === 0
  ) {
    throw new AppError("Food cannot have all zero nutritional values", 400);
  }

  // ❌ duplicate check
  const existing = await foodRepository.findByName(value.name);

  if (existing) {
    throw new AppError("Food already exists", 409);
  }

  return await foodRepository.createFood(value);
};






const updateFood = async (id, data) => {

  const foodId = parseInt(id);

  if (!foodId || isNaN(foodId)) {
    throw new AppError("Invalid food ID", 400);
  }

  const { error, value } = foodSchema.validate(data);

  if (error) {
    throw new AppError(error.details[0].message.replace(/"/g, ''), 400);
  }

  const existingFood = await foodRepository.getById(foodId);

  if (!existingFood) {
    throw new AppError("Food not found", 404);
  }

  // duplicate check (exclude self)
  const duplicate = await foodRepository.findByNameExcludeId(value.name, foodId);

  if (duplicate) {
    throw new AppError("Food already exists", 409);
  }

  return await foodRepository.updateFood(foodId, value);
};






const deleteFood = async (id) => {

  const foodId = parseInt(id);

  if (!foodId || isNaN(foodId)) {
    throw new AppError("Invalid food ID", 400);
  }

  const food = await foodRepository.getById(foodId);

  if (!food) {
    throw new AppError("Food not found", 404);
  }

  if (Number(food.IsActive) === 0) {
    throw new AppError("Food already inactive", 400);
  }

  await foodRepository.deleteFood(foodId);

  return { message: "Food deleted successfully" };
};





const activateFood = async (id) => {

  const foodId = parseInt(id);

  if (!foodId || isNaN(foodId)) {
    throw new AppError("Invalid food ID", 400);
  }

  const food = await foodRepository.getById(foodId);

  if (!food) {
    throw new AppError("Food not found", 404);
  }

  if (Number(food.IsActive) === 1) {
    throw new AppError("Food already active", 400);
  }

  await foodRepository.activateFood(foodId);

  return { message: "Food activated successfully" };
};






module.exports = {
  getFoods,
  addFood,
  updateFood,
  deleteFood,
  activateFood
};