const { sql, poolPromise } = require('../../db/connection');


// ======================================================
// TRANSACTION
// ======================================================
const createTransaction = async () => {
  const pool = await poolPromise;
  return new sql.Transaction(pool);
};



// ======================================================
// FOODS
// ======================================================
const getFoodsByIds = async (transaction, ids) => {

  const request = new sql.Request(transaction);

  const params = ids.map((id, i) => {
    request.input(`id${i}`, sql.Int, id);
    return `@id${i}`;
  });

  const result = await request.query(`
    SELECT * FROM Foods
    WHERE Id IN (${params.join(",")})
  `);

  return result.recordset;
};



// ======================================================
// MEAL CREATE
// ======================================================
const createMeal = async (transaction, data) => {

  const result = await new sql.Request(transaction)
    .input("UserId", sql.Int, data.userId)
    .input("Name", sql.NVarChar, data.name)
    .input("MealTime", sql.NVarChar, data.mealTime)
    .input("TotalCalories", sql.Float, data.totalCalories)
    .input("TotalProtein", sql.Float, data.totalProtein)
    .input("TotalCarbs", sql.Float, data.totalCarbs)
    .input("TotalFats", sql.Float, data.totalFats)
    .query(`
      INSERT INTO Meals (
        UserId, Name, MealTime,
        TotalCalories, TotalProtein, TotalCarbs, TotalFats
      )
      OUTPUT inserted.*
      VALUES (
        @UserId, @Name, @MealTime,
        @TotalCalories, @TotalProtein, @TotalCarbs, @TotalFats
      )
    `);

  return result.recordset[0];
};



// ======================================================
// MEAL TRACKING CREATE
// ======================================================
const createMealTracking = async (transaction, data) => {

  const result = await new sql.Request(transaction)
    .input("UserId", sql.Int, data.userId)
    .input("MealId", sql.Int, data.mealId)
    .input("Name", sql.NVarChar, data.name)
    .input("MealTime", sql.NVarChar, data.mealTime)
    .input("TotalCalories", sql.Float, data.totalCalories)
    .input("TotalProtein", sql.Float, data.totalProtein)
    .input("TotalCarbs", sql.Float, data.totalCarbs)
    .input("TotalFats", sql.Float, data.totalFats)
    .input("Date", sql.Date, new Date())
    .input("IsDone", sql.Bit, 0)
    .query(`
      INSERT INTO MealTracking (
        UserId, MealId, Name, MealTime,
        TotalCalories, TotalProtein, TotalCarbs, TotalFats,
        Date, IsDone
      )
      OUTPUT inserted.*
      VALUES (
        @UserId, @MealId, @Name, @MealTime,
        @TotalCalories, @TotalProtein, @TotalCarbs, @TotalFats,
        @Date, @IsDone
      )
    `);

  return result.recordset[0];
};



// ======================================================
// INGREDIENTS INSERT
// ======================================================
const insertMealIngredients = async (transaction, mealId, ingredients) => {

  for (const ing of ingredients) {

    await new sql.Request(transaction)
      .input("MealId", sql.Int, mealId)
      .input("FoodId", sql.Int, ing.foodId)
      .input("Name", sql.NVarChar, ing.name)
      .input("Quantity", sql.Float, ing.quantity)
      .input("Unit", sql.NVarChar, ing.unit)
      .input("Calories", sql.Float, ing.calories)
      .input("Protein", sql.Float, ing.protein)
      .input("Carbs", sql.Float, ing.carbs)
      .input("Fats", sql.Float, ing.fats)
      .query(`
        INSERT INTO MealIngredients (
          MealId, FoodId, Name,
          Quantity, Unit,
          Calories, Protein, Carbs, Fats
        )
        VALUES (
          @MealId, @FoodId, @Name,
          @Quantity, @Unit,
          @Calories, @Protein, @Carbs, @Fats
        )
      `);
  }
};



// ======================================================
// TRACKING INGREDIENTS
// ======================================================
const insertTrackingIngredients = async (transaction, trackingId, ingredients) => {

  for (const ing of ingredients) {

    await new sql.Request(transaction)
      .input("MealTrackingId", sql.Int, trackingId)
      .input("FoodId", sql.Int, ing.foodId)
      .input("Name", sql.NVarChar, ing.name)
      .input("Quantity", sql.Float, ing.quantity)
      .input("Unit", sql.NVarChar, ing.unit)
      .input("Calories", sql.Float, ing.calories)
      .input("Protein", sql.Float, ing.protein)
      .input("Carbs", sql.Float, ing.carbs)
      .input("Fats", sql.Float, ing.fats)
      .query(`
        INSERT INTO MealTrackingIngredients (
          MealTrackingId, FoodId, Name,
          Quantity, Unit,
          Calories, Protein, Carbs, Fats
        )
        VALUES (
          @MealTrackingId, @FoodId, @Name,
          @Quantity, @Unit,
          @Calories, @Protein, @Carbs, @Fats
        )
      `);
  }
};



// ======================================================
// CHECK DUPLICATES (CREATE)
// ======================================================
const checkMealNameExists = async (transaction, userId, name) => {

  const result = await new sql.Request(transaction)
    .input("UserId", sql.Int, userId)
    .input("Name", sql.NVarChar, name)
    .query(`
      SELECT 1 FROM Meals 
      WHERE UserId = @UserId AND Name = @Name
    `);

  return result.recordset.length > 0;
};



const checkMealTimeExists = async (transaction, userId, mealTime) => {

  const result = await new sql.Request(transaction)
    .input("UserId", sql.Int, userId)
    .input("MealTime", sql.NVarChar, mealTime)
    .query(`
      SELECT 1 FROM Meals 
      WHERE UserId = @UserId AND MealTime = @MealTime
    `);

  return result.recordset.length > 0;
};



// ======================================================
// GET USER MEALS
// ======================================================
const getUserMeals = async (userId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT * FROM Meals
      WHERE UserId = @UserId
      ORDER BY Id DESC
    `);

  return result.recordset;
};



// ======================================================
// GET INGREDIENTS
// ======================================================
const getMealIngredients = async (mealIds) => {

  if (!mealIds.length) return [];

  const pool = await poolPromise;
  const request = new sql.Request(pool);

  const params = mealIds.map((_, i) => `@id${i}`);

  mealIds.forEach((id, i) => {
    request.input(`id${i}`, sql.Int, id);
  });

  const result = await request.query(`
    SELECT * FROM MealIngredients
    WHERE MealId IN (${params.join(",")})
  `);

  return result.recordset;
};



const getMealIngredientsByMealId = async (mealId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("MealId", sql.Int, mealId)
    .query(`
      SELECT *
      FROM MealIngredients
      WHERE MealId = @MealId
    `);

  return result.recordset;
};



// ======================================================
// GET MEAL BY ID (FIXED — SINGLE VERSION ONLY)
// ======================================================
const getMealById = async (transaction, mealId, userId) => {

  const result = await new sql.Request(transaction)
    .input("MealId", sql.Int, mealId)
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT Id, Name, MealTime
      FROM Meals
      WHERE Id = @MealId AND UserId = @UserId
    `);

  return result.recordset[0];
};



const getMealByIdTx  = async (userId, mealId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("MealId", sql.Int, mealId)
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT *
      FROM Meals
      WHERE Id = @MealId AND UserId = @UserId
    `);

  return result.recordset[0];
};


// ======================================================
// UPDATE DUPLICATE CHECK (FIXED LOGIC)
// ======================================================
const checkDuplicateMeal = async (transaction, userId, mealId, name, mealTime) => {

  const result = await new sql.Request(transaction)
    .input("UserId", sql.Int, userId)
    .input("MealId", sql.Int, mealId)
    .input("Name", sql.NVarChar, name)
    .input("MealTime", sql.NVarChar, mealTime)
    .query(`
      SELECT 1 FROM Meals
      WHERE UserId = @UserId
        AND Id != @MealId
        AND (Name = @Name OR MealTime = @MealTime)
    `);

  return result.recordset.length > 0;
};



// ======================================================
// UPDATE MEAL
// ======================================================
const updateMeal = async (transaction, userId, mealId, data) => {

  return await new sql.Request(transaction)
    .input("UserId", sql.Int, userId)
    .input("MealId", sql.Int, mealId)
    .input("Name", sql.NVarChar, data.name)
    .input("MealTime", sql.NVarChar, data.mealTime)
    .input("Calories", sql.Float, data.calories)
    .input("Protein", sql.Float, data.protein)
    .input("Carbs", sql.Float, data.carbs)
    .input("Fats", sql.Float, data.fats)
    .query(`
      UPDATE Meals
      SET Name = @Name,
          MealTime = @MealTime,
          TotalCalories = @Calories,
          TotalProtein = @Protein,
          TotalCarbs = @Carbs,
          TotalFats = @Fats,
          UpdatedAt = GETDATE()
      WHERE Id = @MealId AND UserId = @UserId
    `);
};



// ======================================================
// DELETE INGREDIENTS
// ======================================================
const deleteMealIngredients = async (transaction, mealId) => {

  return await new sql.Request(transaction)
    .input("MealId", sql.Int, mealId)
    .query(`
      DELETE FROM MealIngredients
      WHERE MealId = @MealId
    `);
};



// ======================================================
// TRACKING SYNC
// ======================================================
const syncMealTracking = async (transaction, userId, mealId, data) => {

  return await new sql.Request(transaction)
    .input("UserId", sql.Int, userId)
    .input("MealId", sql.Int, mealId)
    .input("Name", sql.NVarChar, data.name)
    .input("MealTime", sql.NVarChar, data.mealTime)
    .input("Calories", sql.Float, data.calories)
    .input("Protein", sql.Float, data.protein)
    .input("Carbs", sql.Float, data.carbs)
    .input("Fats", sql.Float, data.fats)
    .query(`
      UPDATE MealTracking
      SET Name = @Name,
          MealTime = @MealTime,
          TotalCalories = @Calories,
          TotalProtein = @Protein,
          TotalCarbs = @Carbs,
          TotalFats = @Fats
      WHERE MealId = @MealId AND UserId = @UserId
    `);
};




const deleteTrackingIngredients = async (transaction, userId, mealId) => {

  await new sql.Request(transaction)
    .input("MealId", sql.Int, mealId)
    .input("UserId", sql.Int, userId)
    .query(`
      DELETE mti
      FROM MealTrackingIngredients mti
      JOIN MealTracking mt ON mt.Id = mti.MealTrackingId
      WHERE mt.MealId = @MealId
        AND mt.UserId = @UserId
    `);
};




const insertTrackingIngredientsFromMeal = async (transaction, userId, mealId) => {

  await new sql.Request(transaction)
    .input("MealId", sql.Int, mealId)
    .input("UserId", sql.Int, userId)
    .query(`
      INSERT INTO MealTrackingIngredients
      (MealTrackingId, FoodId, Name, Quantity, Unit, Calories, Protein, Carbs, Fats)
      SELECT 
        mt.Id,
        mi.FoodId,
        mi.Name,
        mi.Quantity,
        mi.Unit,
        mi.Calories,
        mi.Protein,
        mi.Carbs,
        mi.Fats
      FROM MealIngredients mi
      JOIN MealTracking mt ON mt.MealId = mi.MealId
      WHERE mt.MealId = @MealId
        AND mt.UserId = @UserId
    `);
};




const getMealTrackingStatus = async (transaction, userId, mealId) => {

  const result = await new sql.Request(transaction)
    .input("UserId", sql.Int, userId)
    .input("MealId", sql.Int, mealId)
    .query(`
      SELECT Id, IsDone
      FROM MealTracking
      WHERE UserId = @UserId AND MealId = @MealId
    `);

  return result.recordset[0]; // can be undefined
};





const getMealTracking = async (transaction, UserId, mealId) => {
  const result = await new sql.Request(transaction)
    .input("UserId", sql.Int, UserId)
    .input("MealId", sql.Int, mealId)
    .query(`
      SELECT Id, IsDone
      FROM MealTracking
      WHERE UserId = @UserId AND MealId = @MealId
    `);

  return result.recordset[0];
};




const deleteMealTracking = async (transaction, UserId, mealId) => {
  await new sql.Request(transaction)
    .input("UserId", sql.Int, UserId)
    .input("MealId", sql.Int, mealId)
    .query(`
      DELETE FROM MealTracking
      WHERE UserId = @UserId AND MealId = @MealId
    `);
};



const deleteMeal = async (transaction, mealId, UserId) => {
  await new sql.Request(transaction)
    .input("MealId", sql.Int, mealId)
    .input("UserId", sql.Int, UserId)
    .query(`
      DELETE FROM Meals
      WHERE Id = @MealId AND UserId = @UserId
    `);
};

// ======================================================
// Get meals from tracking table
// ======================================================



const getTodayMeals = async (UserId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, UserId)
    .query(`
      SELECT *
      FROM MealTracking
      WHERE UserId = @UserId
      ORDER BY MealTime ASC
    `);

  return result.recordset;
};






const getTodayMealIngredients = async (trackingIds) => {

  if (!trackingIds.length) return [];

  const pool = await poolPromise;
  const request = new sql.Request(pool);

  const params = trackingIds.map((_, i) => `@id${i}`);

  trackingIds.forEach((id, i) => {
    request.input(`id${i}`, sql.Int, id);
  });

  const result = await request.query(`
    SELECT *
    FROM MealTrackingIngredients
    WHERE MealTrackingId IN (${params.join(",")})
  `);

  return result.recordset;
};


// ======================================================
// mark as done meal
// ======================================================


const getMealTrackingById = async (UserId, trackingId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("Id", sql.Int, trackingId)
    .input("UserId", sql.Int, UserId)
    .query(`
      SELECT Id, IsDone
      FROM MealTracking
      WHERE Id = @Id
        AND UserId = @UserId
    `);

  return result.recordset[0];
};



const markMealDone = async (UserId, trackingId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("Id", sql.Int, trackingId)
    .input("UserId", sql.Int, UserId)
    .query(`
      UPDATE MealTracking
      SET IsDone = 1
      WHERE Id = @Id
        AND UserId = @UserId
    `);

  return result.rowsAffected[0];
};





const getMealHistory = async (userId, page = 1) => {

  const pool = await poolPromise;

  const limit = 10;
  const offset = (page - 1) * limit;

  const dataResult = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT 
        Id,
        MealId,
        Name,
        MealTime,
        TotalCalories,
        TotalProtein,
        TotalCarbs,
        TotalFats,
        Date,
        IsDone,
        CreatedAt
      FROM MealHistory
      WHERE UserId = @UserId
      ORDER BY Date DESC, CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `);

  const countResult = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT COUNT(*) AS total
      FROM MealHistory
      WHERE UserId = @UserId
    `);

  const total = countResult.recordset[0].total;
  const totalPages = Math.ceil(total / limit);

  return {
    data: dataResult.recordset,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages
    }
  };
};





const getMealHistoryIngredients = async (historyIds) => {

  if (!historyIds.length) return [];

  const pool = await poolPromise;
  const request = new sql.Request(pool);

  const params = historyIds.map((_, i) => `@id${i}`);

  historyIds.forEach((id, i) => {
    request.input(`id${i}`, sql.Int, id);
  });

  const result = await request.query(`
    SELECT *
    FROM MealHistoryIngredients
    WHERE MealHistoryId IN (${params.join(",")})
  `);

  return result.recordset;
};




module.exports = {
  createTransaction,

  createMeal,
  createMealTracking,

  insertMealIngredients,
  insertTrackingIngredients,

  checkMealNameExists,
  checkMealTimeExists,

  getUserMeals,
  getMealIngredients,
  getMealIngredientsByMealId,

  getFoodsByIds,

  getMealById,
  getMealByIdTx,

  checkDuplicateMeal,

  updateMeal,

  deleteMealIngredients,

  syncMealTracking,

  deleteTrackingIngredients ,

  insertTrackingIngredientsFromMeal ,

  getMealTrackingStatus,

  getMealTracking ,

  deleteMealTracking ,

  deleteMeal ,

  getTodayMeals,
  getTodayMealIngredients,

  getMealTrackingById ,
  markMealDone,

  getMealHistory,
  getMealHistoryIngredients

  

  
};