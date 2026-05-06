const Joi = require('joi');
const AppError = require('../../utils/AppError');
const mealRepository = require('./mealRepository');


// ==========================
// VALIDATION SCHEMA
// ==========================
const mealSchema = Joi.object({
  name: Joi.string().required(),
  mealTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .required(),
  foods: Joi.array().items(
    Joi.object({
      foodId: Joi.number().required(),
      quantity: Joi.number().positive().required()
    })
  ).min(1).required()
});


// ==========================
// CREATE MEAL
// ==========================
const createMeal = async (UserId, data) => {

  const { error, value } = mealSchema.validate(data);
  if (error) throw new AppError(error.details[0].message, 400);

  const { name, mealTime, foods } = value;

  const transaction = await mealRepository.createTransaction();

  try {
    await transaction.begin();

    //  CHECK DUPLICATES FIRST
    const nameExists = await mealRepository.checkMealNameExists(transaction, UserId, name);
    if (nameExists) {
      throw new AppError("Meal name already exists", 409);
    }

    const timeExists = await mealRepository.checkMealTimeExists(transaction, UserId, mealTime);
    if (timeExists) {
      throw new AppError("Meal time already exists", 409);
    }

    //  GET FOODS
    const foodIds = foods.map(f => f.foodId);
    const dbFoods = await mealRepository.getFoodsByIds(transaction, foodIds);

    if (dbFoods.length !== foods.length)
      throw new AppError("Some foods not found", 400);

    //  CALCULATE TOTALS
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    const mealIngredients = foods.map(f => {

      const food = dbFoods.find(d => d.Id === f.foodId);

      const item = {
        foodId: food.Id,
        name: food.Name,
        quantity: f.quantity,
        unit: food.Unit,
        calories: (food.Calories * f.quantity) / 100,
        protein: (food.Protein * f.quantity) / 100,
        carbs: (food.Carbs * f.quantity) / 100,
        fats: (food.Fats * f.quantity) / 100
      };

      totalCalories += item.calories;
      totalProtein += item.protein;
      totalCarbs += item.carbs;
      totalFats += item.fats;

      return item;
    });

    //  CREATE MEAL
    const meal = await mealRepository.createMeal(transaction, {
      userId: UserId,
      name,
      mealTime,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats
    });

    //  INGREDIENTS
    await mealRepository.insertMealIngredients(
      transaction,
      meal.Id,
      mealIngredients
    );

    //  TRACKING
    const tracking = await mealRepository.createMealTracking(transaction, {
      userId: UserId,
      mealId: meal.Id,
      name,
      mealTime,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats
    });

    await mealRepository.insertTrackingIngredients(
      transaction,
      tracking.Id,
      mealIngredients
    );

    await transaction.commit();

    return {
      meal: {
        id: meal.Id,
        name: meal.Name,
        mealTime: meal.MealTime,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFats,
        ingredients: mealIngredients
      }
    };

  } catch (err) {
    await transaction.rollback();

    // EXTRA SAFETY (if DB constraint still hits)
    if (err.number === 2627 || err.number === 2601) {
      throw new AppError("Meal name or time already exists", 409);
    }

    throw err;
  }
};


// ==========================
// GET ALL MEALS
// ==========================
const getUserMeals = async (UserId) => {

  const meals = await mealRepository.getUserMeals(UserId);

  if (!meals.length) return [];

  const mealIds = meals.map(m => m.Id);
  const ingredients = await mealRepository.getMealIngredients(mealIds);

  return meals.map(meal => ({
    id: meal.Id,
    name: meal.Name,
    mealTime: meal.MealTime,
    totalCalories: meal.TotalCalories,
    totalProtein: meal.TotalProtein,
    totalCarbs: meal.TotalCarbs,
    totalFats: meal.TotalFats,
    ingredients: ingredients
      .filter(i => i.MealId === meal.Id)
      .map(i => ({
        foodId: i.FoodId,
        name: i.Name,
        quantity: i.Quantity,
        unit: i.Unit,
        calories: i.Calories,
        protein: i.Protein,
        carbs: i.Carbs,
        fats: i.Fats
      }))
  }));
};


// ==========================
// GET SINGLE MEAL
// ==========================
const getMealById = async (UserId, mealId) => {

  if (!mealId) throw new AppError("Invalid meal id", 400);

 const meal = await mealRepository.getMealByIdTx(UserId, mealId);

  if (!meal) throw new AppError("Meal not found", 404);

  const ingredients =
    await mealRepository.getMealIngredientsByMealId(mealId);

  return {
    id: meal.Id,
    name: meal.Name,
    mealTime: meal.MealTime,
    totalCalories: meal.TotalCalories,
    totalProtein: meal.TotalProtein,
    totalCarbs: meal.TotalCarbs,
    totalFats: meal.TotalFats,
    ingredients: ingredients.map(i => ({
      foodId: i.FoodId,
      quantity: i.Quantity,
      unit: i.Unit,
      calories: i.Calories,
      protein: i.Protein,
      carbs: i.Carbs,
      fats: i.Fats
    }))
  };
};


// ==========================
// UPDATE MEAL
// ==========================
const updateMeal = async (UserId, mealId, data) => {

  const { error, value } = mealSchema.validate(data);
  if (error) throw new AppError(error.details[0].message, 400);

  const { name, mealTime, foods } = value;

  const transaction = await mealRepository.createTransaction();

  try {
    await transaction.begin();

    //  VERIFY MEAL
    const meal = await mealRepository.getMealById(
      transaction,
      mealId,
      UserId
    );

    if (!meal) throw new AppError("Meal not found", 404);

    //  DUPLICATE CHECK
    const duplicate = await mealRepository.checkDuplicateMeal(
      transaction,
      UserId,
      mealId,
      name,
      mealTime
    );

    if (duplicate)
      throw new AppError("Meal name or time already exists", 409);

    //  GET FOODS
    const foodIds = foods.map(f => f.foodId);
    const dbFoods = await mealRepository.getFoodsByIds(transaction, foodIds);

    if (dbFoods.length !== foods.length)
      throw new AppError("Some foods not found", 400);

    //  CALCULATE TOTALS
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    const mealIngredients = foods.map(f => {

      const food = dbFoods.find(d => d.Id === f.foodId);

      const item = {
        foodId: food.Id,
        name: food.Name,
        quantity: f.quantity,
        unit: food.Unit,
        calories: (food.Calories * f.quantity) / 100,
        protein: (food.Protein * f.quantity) / 100,
        carbs: (food.Carbs * f.quantity) / 100,
        fats: (food.Fats * f.quantity) / 100
      };

      totalCalories += item.calories;
      totalProtein += item.protein;
      totalCarbs += item.carbs;
      totalFats += item.fats;

      return item;
    });

    //  UPDATE MEAL
    await mealRepository.updateMeal(transaction, UserId, mealId, {
      name,
      mealTime,
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats
    });

    //  REPLACE INGREDIENTS
    await mealRepository.deleteMealIngredients(transaction, mealId);

    await mealRepository.insertMealIngredients(
      transaction,
      mealId,
      mealIngredients
    );


    //  CHECK TRACKING STATUS
const tracking = await mealRepository.getMealTrackingStatus(
  transaction,
  UserId,
  mealId
);

const canUpdateTracking = tracking && !tracking.IsDone;


if (canUpdateTracking) {

    //  SYNC TRACKING
    await mealRepository.syncMealTracking(transaction, UserId, mealId, {
      name,
      mealTime,
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats
    });


    await mealRepository.deleteTrackingIngredients(transaction, UserId, mealId);

await mealRepository.insertTrackingIngredientsFromMeal(
  transaction,
  UserId,
  mealId
);

}

    await transaction.commit();

    return {
      message: "Meal updated successfully",
      data: {
        mealId,
        name,
        mealTime,
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fats: totalFats,
        ingredients: mealIngredients
      }
    };

  } catch (err) {
    await transaction.rollback();

    if (err.number === 2627 || err.number === 2601) {
      throw new AppError("Meal name or time already exists", 409);
    }

    throw err;
  }
};






const deleteMeal = async (UserId, mealId) => {

  if (!mealId) throw new AppError("Invalid meal id", 400);

  const transaction = await mealRepository.createTransaction();

  try {
    await transaction.begin();

    //  VERIFY MEAL OWNERSHIP
    const meal = await mealRepository.getMealById(
      transaction,
      mealId,
      UserId
    );

    if (!meal) throw new AppError("Meal not found", 404);

    //  CHECK TRACKING
    const tracking = await mealRepository.getMealTracking(
      transaction,
      UserId,
      mealId
    );

    const canDeleteTracking = tracking && !tracking.IsDone;

    // DELETE TRACKING (ONLY IF NOT DONE)
    if (canDeleteTracking) {
      await mealRepository.deleteTrackingIngredients(transaction, UserId, mealId);
      await mealRepository.deleteMealTracking(transaction, UserId, mealId);
    }

    //  DELETE MEAL (CASCADE deletes MealIngredients automatically)
    await mealRepository.deleteMeal(transaction, mealId, UserId);

    await transaction.commit();

    return {
      message: canDeleteTracking
        ? "Meal and tracking deleted successfully"
        : "Meal deleted (tracking preserved as completed)"
    };

  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};





const getTodayMeals = async (UserId) => {

  const meals = await mealRepository.getTodayMeals(UserId);

  if (!meals.length) return [];

 
  const trackingIds = meals.map(m => m.Id);

  const ingredients = await mealRepository.getTodayMealIngredients(trackingIds);

  return meals.map(meal => ({
    id: meal.Id, 
    name: meal.Name,
    mealTime: meal.MealTime,
    totalCalories: meal.TotalCalories,
    totalProtein: meal.TotalProtein,
    totalCarbs: meal.TotalCarbs,
    totalFats: meal.TotalFats,
    date: meal.Date,
    isDone: meal.IsDone,

    ingredients: ingredients
      .filter(i => i.MealTrackingId === meal.Id) // FIXED
      .map(i => ({
        foodId: i.FoodId,
        name: i.Name,
        quantity: i.Quantity,
        unit: i.Unit,
        calories: i.Calories,
        protein: i.Protein,
        carbs: i.Carbs,
        fats: i.Fats
      }))
  }));
};



// ==========================
// done meal 
// ==========================


const markMealDone = async (UserId, trackingId) => {

  if (!trackingId) {
    throw new AppError("Invalid tracking id", 400);
  }

  const tracking = await mealRepository.getMealTrackingById(UserId, trackingId);

  if (!tracking) {
    throw new AppError("Meal tracking not found", 404);
  }

  if (tracking.IsDone) {
    return { message: "Meal already marked as done" };
  }

  const updated = await mealRepository.markMealDone(UserId, trackingId);

  if (!updated) {
    throw new AppError("Failed to update meal status", 500);
  }

  return { message: "Meal marked as done successfully" };
};


// ==========================
//  MEALs history 
// ==========================



const getMealHistory = async (userId, page) => {

  const result = await mealRepository.getMealHistory(userId, page);

  const historyIds = result.data.map(m => m.Id);

  const ingredients = await mealRepository.getMealHistoryIngredients(historyIds);

  const enrichedData = result.data.map(meal => ({
    id: meal.Id,
    mealId: meal.MealId,
    name: meal.Name,
    mealTime: meal.MealTime,
    totalCalories: meal.TotalCalories,
    totalProtein: meal.TotalProtein,
    totalCarbs: meal.TotalCarbs,
    totalFats: meal.TotalFats,
    date: meal.Date,
    isDone: meal.IsDone,
    createdAt: meal.CreatedAt,

    ingredients: ingredients
      .filter(i => i.MealHistoryId === meal.Id)
      .map(i => ({
        foodId: i.FoodId,
        name: i.Name,
        quantity: i.Quantity,
        unit: i.Unit,
        calories: i.Calories,
        protein: i.Protein,
        carbs: i.Carbs,
        fats: i.Fats
      }))
  }));

  return {
    data: enrichedData,
    pagination: result.pagination
  };
};




module.exports = {
  createMeal,
  getUserMeals,
  getMealById,
  updateMeal,
  deleteMeal,
  getTodayMeals,
  markMealDone,
  getMealHistory
};