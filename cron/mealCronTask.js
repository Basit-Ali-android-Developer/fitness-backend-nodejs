const { sql, poolPromise } = require("../db/connection");

async function runMealCron() {
  console.log(" CRON STARTED:", new Date().toString());

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    await transaction.begin();

    // ======================================================
    //  1. MOVE MealTracking → MealHistory
    // ======================================================
    await new sql.Request(transaction).query(`
      INSERT INTO MealHistory (
        UserId,
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
      )
      SELECT 
        UserId,
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
      FROM MealTracking;
    `);

    // ======================================================
    //  2. MOVE Ingredients → HistoryIngredients
    // ======================================================
    await new sql.Request(transaction).query(`
      INSERT INTO MealHistoryIngredients (
        MealHistoryId,
        FoodId,
        Name,
        Quantity,
        Unit,
        Calories,
        Protein,
        Carbs,
        Fats,
        CreatedAt
      )
      SELECT 
        mhi.Id,
        mti.FoodId,
        mti.Name,
        mti.Quantity,
        mti.Unit,
        mti.Calories,
        mti.Protein,
        mti.Carbs,
        mti.Fats,
        mti.CreatedAt
      FROM MealTrackingIngredients mti
      INNER JOIN MealTracking mt 
        ON mt.Id = mti.MealTrackingId
      INNER JOIN MealHistory mhi 
        ON mhi.UserId = mt.UserId 
        AND mhi.MealId = mt.MealId 
        AND mhi.Date = mt.Date;
    `);

    // ======================================================
    //  3. CLEAR MealTracking (cascade deletes ingredients)
    // ======================================================
    await new sql.Request(transaction).query(`
      DELETE FROM MealTracking;
    `);

    // ======================================================
    //  4. CREATE TODAY TRACKING FROM Meals
    // ======================================================
    await new sql.Request(transaction)
      .input("Today", sql.Date, today)
      .query(`
        INSERT INTO MealTracking (
          UserId,
          MealId,
          Name,
          MealTime,
          TotalCalories,
          TotalProtein,
          TotalCarbs,
          TotalFats,
          Date,
          IsDone
        )
        SELECT 
          m.UserId,
          m.Id,
          m.Name,
          m.MealTime,
          m.TotalCalories,
          m.TotalProtein,
          m.TotalCarbs,
          m.TotalFats,
          @Today,
          0
        FROM Meals m;
      `);

    // ======================================================
    //  5. COPY INGREDIENTS → MealTrackingIngredients
    // ======================================================
    await new sql.Request(transaction)
      .input("Today", sql.Date, today)
      .query(`
        INSERT INTO MealTrackingIngredients (
          MealTrackingId,
          FoodId,
          Name,
          Quantity,
          Unit,
          Calories,
          Protein,
          Carbs,
          Fats
        )
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
        FROM MealTracking mt
        INNER JOIN MealIngredients mi 
          ON mi.MealId = mt.MealId
        WHERE mt.Date = @Today;
      `);

    // ======================================================
    //  6. COMMIT
    // ======================================================
    await transaction.commit();

    console.log(" FULL DAILY SYSTEM COMPLETED SUCCESSFULLY");

  } catch (err) {
    console.error(" CRON ERROR:", err);
    try {
      await transaction.rollback();
    } catch (rollbackErr) {
      console.error(" ROLLBACK ERROR:", rollbackErr);
    }
  }
}

module.exports = { runMealCron };
