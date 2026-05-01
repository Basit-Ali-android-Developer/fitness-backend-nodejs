const mealService = require('./mealService');
const asyncHandler = require('../../utils/asyncHandler');







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





// ----------------- Get Single Meal -----------------

const getMealById = asyncHandler(async (req, res) => {

  const mealId = parseInt(req.params.id);

  const result = await mealService.getMealById(req.user.Id, mealId);

  res.status(200).json({
    result: "success",
    message: "Meal fetched successfully",
    data: result
  });

});




// ----------------- update Meal -----------------

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




// ----------------- delete Meal -----------------



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




const getMealHistory = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    // ======================================================
    // 1️⃣ GET ALL HISTORY MEALS
    // ======================================================
    const historyResult = await new sql.Request(pool)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT 
          mh.Id,
          mh.UserId,
          mh.MealId,
          mh.Name,
          mh.MealTime,
          mh.TotalCalories,
          mh.TotalProtein,
          mh.TotalCarbs,
          mh.TotalFats,
          mh.Date,
          mh.IsDone,
          mh.CreatedAt
        FROM MealHistory mh
        WHERE mh.UserId = @UserId
        ORDER BY mh.Date DESC, mh.CreatedAt DESC
      `);

    const meals = historyResult.recordset;

    if (meals.length === 0) {
      return res.status(200).json({
        result: "success",
        message: "No meal history found",
        data: []
      });
    }

    // ======================================================
    // 2️⃣ GET ALL INGREDIENTS (BULK FETCH - FAST)
    // ======================================================
    const ingredientsResult = await new sql.Request(pool)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT 
          mhi.*
        FROM MealHistoryIngredients mhi
        INNER JOIN MealHistory mh 
          ON mh.Id = mhi.MealHistoryId
        WHERE mh.UserId = @UserId
      `);

    const ingredients = ingredientsResult.recordset;

    // ======================================================
    // 3️⃣ MAP INGREDIENTS TO MEALS
    // ======================================================
    const historyWithIngredients = meals.map(meal => {
      return {
        ...meal,
        ingredients: ingredients.filter(i => i.MealHistoryId === meal.Id)
      };
    });

    // ======================================================
    // 4️⃣ RESPONSE
    // ======================================================
    return res.status(200).json({
      result: "success",
      message: "Meal history fetched successfully",
      data: historyWithIngredients
    });

  } catch (err) {
    console.error("getMealHistory error:", err);

    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};








module.exports = { createMeal,
   getUserMeals,
  getMealById,
  updateMeal, 
  deleteMeal, 
  getTodayMeals, 
  markMealDone, 
  getMealHistory, 
  getTodayMeals
};