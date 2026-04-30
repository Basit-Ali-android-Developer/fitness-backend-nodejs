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






const getTodayMeals = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await new sql.Request(pool)
      .input("UserId", sql.Int, userId)
      .input("Date", sql.Date, today)
      .query(`
        SELECT m.*, mt.IsDone
        FROM MealTracking mt
        JOIN Meals m ON mt.MealId = m.Id
        WHERE mt.UserId = @UserId
        AND mt.Date = @Date
      `);

    return res.status(200).json({
      result: "success",
      message: "Meals get successfully",
      data: result.recordset
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};



const markMealDone = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    // 👉 NOW USING TRACKING ID
    const trackingId = parseInt(req.params.id);

    if (!trackingId) {
      return res.status(400).json({
        result: "error",
        message: "Invalid tracking id"
      });
    }

    // ======================================================
    // 1️⃣ CHECK IF RECORD EXISTS
    // ======================================================
    const check = await new sql.Request(pool)
      .input("Id", sql.Int, trackingId)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT Id, IsDone
        FROM MealTracking
        WHERE Id = @Id
          AND UserId = @UserId
      `);

    if (check.recordset.length === 0) {
      return res.status(404).json({
        result: "error",
        message: "Meal tracking not found"
      });
    }

    // ======================================================
    // 2️⃣ ALREADY DONE CHECK
    // ======================================================
    if (check.recordset[0].IsDone === 1) {
      return res.status(200).json({
        result: "success",
        message: "Meal already marked as done"
      });
    }

    // ======================================================
    // 3️⃣ UPDATE STATUS
    // ======================================================
    const update = await new sql.Request(pool)
      .input("Id", sql.Int, trackingId)
      .input("UserId", sql.Int, userId)
      .query(`
        UPDATE MealTracking
        SET IsDone = 1
        WHERE Id = @Id
          AND UserId = @UserId
      `);

    if (update.rowsAffected[0] === 0) {
      return res.status(500).json({
        result: "error",
        message: "Failed to update meal status"
      });
    }

    return res.status(200).json({
      result: "success",
      message: "Meal marked as done successfully"
    });

  } catch (err) {
    console.error("markMealDone error:", err);

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};




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


module.exports = { createMeal, getUserMeals, getMealById, updateMeal, deleteMeal, getTodayMeals, markMealDone, getMealHistory };