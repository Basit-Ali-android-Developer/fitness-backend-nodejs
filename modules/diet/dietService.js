const Joi = require('joi');
const AppError = require('../../utils/AppError');
const dietRepository = require('./dietRepository');


// Activity multipliers
const activityMultipliers = {
  Sedentary: 1.2,
  Light: 1.375,
  Moderate: 1.55,
  Active: 1.725,
  "Very Active": 1.9
};





// validation schema
const dietPlanSchema = Joi.object({
  age: Joi.number().integer().positive().required(),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  height: Joi.number().positive().required(),
  weight: Joi.number().positive().required(),
  target_weight: Joi.number().positive().required(),
  goal_type: Joi.string().valid('Lose', 'Gain', 'Maintain').required(),
  activity_level: Joi.string().valid('Sedentary', 'Light', 'Moderate', 'Active', 'Very Active').required()
}).custom((value, helpers) => {

  const { weight, target_weight, goal_type } = value;

  if (goal_type === 'Lose' && target_weight >= weight) {
    return helpers.message("For 'Lose' goal, target_weight must be less than current weight");
  }

  if (goal_type === 'Gain' && target_weight <= weight) {
    return helpers.message("For 'Gain' goal, target_weight must be greater than current weight");
  }

  if (goal_type === 'Maintain' && target_weight !== weight) {
    return helpers.message("For 'Maintain' goal, target_weight must be equal to current weight");
  }

  return value;
});





// -------- CREATE OR UPDATE --------
const createOrUpdateDietPlan = async (userId, data) => {

  const { error, value } = dietPlanSchema.validate(data);

  if (error) {
    throw new AppError(error.details[0].message.replace(/"/g, ''), 400);
  }

  const { age, gender, height, weight, target_weight, goal_type, activity_level } = value;

  // -------- BMR --------
  let bmr;

  if (gender === 'Male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'Female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age;
  }

  // -------- CALORIES --------
  const maintenanceCalories = bmr * activityMultipliers[activity_level];

  let targetCalories = maintenanceCalories;

  if (goal_type === 'Lose') targetCalories -= 500;
  if (goal_type === 'Gain') targetCalories += 500;

  // -------- CORRECT MACROS (FIXED) --------

  let proteinPerKg;

  if (goal_type === 'Lose') {
    proteinPerKg = 2.0;
  } else if (goal_type === 'Gain') {
    proteinPerKg = 1.8;
  } else {
    proteinPerKg = 1.6;
  }

  const proteinGrams = weight * proteinPerKg;
  const proteinCalories = proteinGrams * 4;

  // fats = 25%
  const fatsCalories = targetCalories * 0.25;
  const fatsGrams = fatsCalories / 9;

  // carbs = remaining
  const remainingCalories = targetCalories - (proteinCalories + fatsCalories);
  const carbsGrams = remainingCalories / 4;

  // -------- FINAL --------
  const finalData = {
    userId,
    goal_type,
    target_weight,

    bmr: Math.round(bmr),
    maintenanceCalories: Math.round(maintenanceCalories),
    targetCalories: Math.round(targetCalories),

    activity_level,

    proteinGrams: Math.round(proteinGrams),
    carbsGrams: Math.round(carbsGrams),
    fatsGrams: Math.round(fatsGrams)
  };

  return await dietRepository.createOrUpdateDietPlan(finalData);
};






const getDietPlan = async (userId) => {

  const diet = await dietRepository.getDietPlan(userId);

  if (!diet) {
    throw new AppError("No diet plan found", 404);
  }

  return diet;
};







const deleteDietPlan = async (userId) => {

  const deleted = await dietRepository.deleteDietPlan(userId);

  if (deleted === 0) {
    throw new AppError("No diet plan found to delete", 404);
  }

  return { message: "Diet plan deleted successfully" };
};






module.exports = {
  createOrUpdateDietPlan,
  getDietPlan,
  deleteDietPlan
};