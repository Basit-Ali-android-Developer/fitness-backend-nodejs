const { sql, poolPromise } = require('../../db/connection');
const Joi = require('joi');

// ----------------- Create Meal -----------------



const createMeal = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const userId = req.user.id;

    // ======================================================
    // 1️⃣ VALIDATION
    // ======================================================
    const schema = Joi.object({
      name: Joi.string().required(),
      mealTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .required(),
      foods: Joi.array()
        .items(
          Joi.object({
            foodId: Joi.number().required(),
            quantity: Joi.number().positive().required()
          })
        )
        .min(1)
        .required()
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        result: "error",
        message: error.details[0].message,
        data: null
      });
    }

    const { name, mealTime, foods } = req.body;
    const timeOnly = mealTime;

    await transaction.begin();

    // ======================================================
    // 2️⃣ FETCH FOODS
    // ======================================================
    const foodRequest = new sql.Request(transaction);

    const foodParams = foods.map((f, i) => {
      foodRequest.input(`foodId${i}`, sql.Int, f.foodId);
      return `@foodId${i}`;
    });

    const foodResult = await foodRequest.query(`
      SELECT * FROM Foods WHERE Id IN (${foodParams.join(",")})
    `);

    const dbFoods = foodResult.recordset;

    if (dbFoods.length !== foods.length) {
      await transaction.rollback();
      return res.status(400).json({
        result: "error",
        message: "Some foods not found",
        data: null
      });
    }

    // ======================================================
    // 3️⃣ CALCULATE NUTRITION
    // ======================================================
    let totalCalories = 0,
        totalProtein = 0,
        totalCarbs = 0,
        totalFats = 0;

    const mealIngredients = foods.map(f => {
      const dbFood = dbFoods.find(d => d.Id === f.foodId);

      const calories = (dbFood.Calories * f.quantity) / 100;
      const protein  = (dbFood.Protein * f.quantity) / 100;
      const carbs    = (dbFood.Carbs * f.quantity) / 100;
      const fats     = (dbFood.Fats * f.quantity) / 100;

      totalCalories += calories;
      totalProtein += protein;
      totalCarbs += carbs;
      totalFats += fats;

      return {
        FoodId: f.foodId,
        Name: dbFood.Name,
        Quantity: f.quantity,
        Unit: dbFood.Unit,
        Calories: calories,
        Protein: protein,
        Carbs: carbs,
        Fats: fats
      };
    });

    // ======================================================
    // 4️⃣ INSERT INTO Meals
    // ======================================================
    const mealRequest = new sql.Request(transaction);

    const mealInsert = await mealRequest
      .input("UserId", sql.Int, userId)
      .input("Name", sql.NVarChar, name)
      .input("MealTime", sql.NVarChar, timeOnly)
      .input("TotalCalories", sql.Float, totalCalories)
      .input("TotalProtein", sql.Float, totalProtein)
      .input("TotalCarbs", sql.Float, totalCarbs)
      .input("TotalFats", sql.Float, totalFats)
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

    const meal = mealInsert.recordset[0];

    // ======================================================
    // 5️⃣ INSERT INGREDIENTS (MEALS)
    // ======================================================
    for (const ing of mealIngredients) {
      await new sql.Request(transaction)
        .input("MealId", sql.Int, meal.Id)
        .input("FoodId", sql.Int, ing.FoodId)
        .input("Quantity", sql.Float, ing.Quantity)
        .input("Unit", sql.NVarChar, ing.Unit)
        .input("Calories", sql.Float, ing.Calories)
        .input("Protein", sql.Float, ing.Protein)
        .input("Carbs", sql.Float, ing.Carbs)
        .input("Fats", sql.Float, ing.Fats)
        .input("Name", sql.NVarChar, ing.Name)
        .query(`
          INSERT INTO MealIngredients (
            MealId, FoodId, Quantity, Unit,
            Calories, Protein, Carbs, Fats, Name
          )
          VALUES (
            @MealId, @FoodId, @Quantity, @Unit,
            @Calories, @Protein, @Carbs, @Fats, @Name
          )
        `);
    }

    // ======================================================
    // 6️⃣ INSERT INTO MEAL TRACKING (TODAY)
    // ======================================================
    const trackingInsert = await new sql.Request(transaction)
      .input("UserId", sql.Int, userId)
      .input("MealId", sql.Int, meal.Id)
      .input("Name", sql.NVarChar, name)
      .input("MealTime", sql.NVarChar, timeOnly)
      .input("TotalCalories", sql.Float, totalCalories)
      .input("TotalProtein", sql.Float, totalProtein)
      .input("TotalCarbs", sql.Float, totalCarbs)
      .input("TotalFats", sql.Float, totalFats)
      .input("Date", sql.Date, new Date())
      .input("IsDone", sql.Bit, 0)
      .query(`
        INSERT INTO MealTracking (
          UserId, MealId, Name, MealTime,
          TotalCalories, TotalProtein, TotalCarbs, TotalFats,
          Date, IsDone
        )
        OUTPUT inserted.Id
        VALUES (
          @UserId, @MealId, @Name, @MealTime,
          @TotalCalories, @TotalProtein, @TotalCarbs, @TotalFats,
          @Date, @IsDone
        )
      `);

    const trackingId = trackingInsert.recordset[0].Id;

    // ======================================================
    // 7️⃣ INSERT TRACKING INGREDIENTS
    // ======================================================
    for (const ing of mealIngredients) {
      await new sql.Request(transaction)
        .input("MealTrackingId", sql.Int, trackingId)
        .input("FoodId", sql.Int, ing.FoodId)
        .input("Name", sql.NVarChar, ing.Name)
        .input("Quantity", sql.Float, ing.Quantity)
        .input("Unit", sql.NVarChar, ing.Unit)
        .input("Calories", sql.Float, ing.Calories)
        .input("Protein", sql.Float, ing.Protein)
        .input("Carbs", sql.Float, ing.Carbs)
        .input("Fats", sql.Float, ing.Fats)
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

    // ======================================================
    // 8️⃣ COMMIT
    // ======================================================
    await transaction.commit();

    // ======================================================
    // 9️⃣ SUCCESS RESPONSE
    // ======================================================
    return res.status(201).json({
      result: "success",
      message: "Meal created successfully",
      data: {
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
      }
    });

  } catch (err) {
    console.error(err);

    try {
      await transaction.rollback();
    } catch (_) {}

    // ======================================================
    // 🚨 DUPLICATE MEAL ERROR HANDLING
    // ======================================================
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({
        result: "error",
        message: "Meal name or time already exists for today",
        data: null
      });
    }

    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};




// ----------------- Get User Meals -----------------

const getUserMeals = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    const request = new sql.Request(pool);

    // 1️⃣ Get meals
    const mealsResult = await request
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT *
        FROM Meals
        WHERE UserId = @UserId
        ORDER BY Id DESC
      `);

    const meals = mealsResult.recordset;

    if (meals.length === 0) {
      return res.status(200).json({
        result: "success",
        message: "No meals found",
        data: []
      });
    }

    // 2️⃣ Get all meal ids
    const mealIds = meals.map(m => m.Id);

    const ingRequest = new sql.Request(pool);

    const placeholders = mealIds.map((_, i) => `@id${i}`);

    mealIds.forEach((id, i) => {
      ingRequest.input(`id${i}`, sql.Int, id);
    });

    const ingredientsResult = await ingRequest.query(`
      SELECT *
      FROM MealIngredients
      WHERE MealId IN (${placeholders.join(",")})
    `);

    const ingredients = ingredientsResult.recordset;

    // 3️⃣ Map ingredients to meals
    const formattedMeals = meals.map(meal => {
      const mealIngredients = ingredients.filter(
        ing => ing.MealId === meal.Id
      );

      return {
        id: meal.Id,
        name: meal.Name,
        mealTime: meal.MealTime, // already string (NVARCHAR)
        totalCalories: meal.TotalCalories,
        totalProtein: meal.TotalProtein,
        totalCarbs: meal.TotalCarbs,
        totalFats: meal.TotalFats,
        ingredients: mealIngredients.map(i => ({
          foodId: i.FoodId,
          quantity: i.Quantity,
          unit: i.Unit,
          calories: i.Calories,
          protein: i.Protein,
          carbs: i.Carbs,
          fats: i.Fats
        }))
      };
    });

    return res.status(200).json({
      result: "success",
      message: "Meals fetched successfully",
      data: formattedMeals
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};




// ----------------- Get Single Meal -----------------

const getMealById = async (req, res) => {
  try {
    const pool = await poolPromise;

    const userId = req.user.id;
    const mealId = parseInt(req.params.id);

    if (!mealId) {
      return res.status(400).json({
        result: "error",
        message: "Invalid meal id",
        data: null
      });
    }

    // 1️⃣ Get meal (ensure it belongs to user)
    const mealRequest = new sql.Request(pool);

    const mealResult = await mealRequest
      .input("MealId", sql.Int, mealId)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT *
        FROM Meals
        WHERE Id = @MealId AND UserId = @UserId
      `);

    const meal = mealResult.recordset[0];

    if (!meal) {
      return res.status(404).json({
        result: "error",
        message: "Meal not found",
        data: null
      });
    }

    // 2️⃣ Get ingredients
    const ingRequest = new sql.Request(pool);

    const ingResult = await ingRequest
      .input("MealId", sql.Int, mealId)
      .query(`
        SELECT *
        FROM MealIngredients
        WHERE MealId = @MealId
      `);

    const ingredients = ingResult.recordset;

    // 3️⃣ Format response
    const response = {
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

    return res.status(200).json({
      result: "success",
      message: "Meal fetched successfully",
      data: response
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};




// ----------------- update Meal -----------------

const updateMeal = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const userId = req.user.id;
    const mealId = parseInt(req.params.id);
    const { name, mealTime, foods } = req.body;

    await transaction.begin();

    // ======================================================
    // 1️⃣ VERIFY MEAL OWNERSHIP
    // ======================================================
    const mealCheck = await new sql.Request(transaction)
      .input("MealId", sql.Int, mealId)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT Id 
        FROM Meals
        WHERE Id = @MealId AND UserId = @UserId
      `);

    if (!mealCheck.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({
        result: "error",
        message: "Meal not found"
      });
    }

    // ======================================================
    // 2️⃣ CHECK UNIQUE (NAME + TIME)
    // ======================================================
    const duplicateCheck = await new sql.Request(transaction)
      .input("Name", sql.NVarChar, name)
      .input("MealTime", sql.NVarChar, mealTime)
      .input("UserId", sql.Int, userId)
      .input("MealId", sql.Int, mealId)
      .query(`
        SELECT Id 
        FROM Meals
        WHERE Name = @Name
          AND MealTime = @MealTime
          AND UserId = @UserId
          AND Id != @MealId
      `);

    if (duplicateCheck.recordset.length) {
      await transaction.rollback();
      return res.status(400).json({
        result: "error",
        message: `Meal "${name}" at "${mealTime}" already exists`
      });
    }

    // ======================================================
    // 3️⃣ GET TRACKING
    // ======================================================
    const trackingRes = await new sql.Request(transaction)
      .input("MealId", sql.Int, mealId)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT Id, IsDone
        FROM MealTracking
        WHERE MealId = @MealId
          AND UserId = @UserId
      `);

    const trackingRow = trackingRes.recordset[0];
    const canUpdateTracking = trackingRow && !trackingRow.IsDone;

    // ======================================================
    // 4️⃣ VALIDATE FOODS
    // ======================================================
    if (!foods || !foods.length) {
      await transaction.rollback();
      return res.status(400).json({
        result: "error",
        message: "Foods are required"
      });
    }

    // ======================================================
    // 5️⃣ FETCH FOODS
    // ======================================================
    const foodReq = new sql.Request(transaction);

    const foodParams = foods.map((f, i) => {
      foodReq.input(`id${i}`, sql.Int, f.foodId);
      return `@id${i}`;
    });

    const foodResult = await foodReq.query(`
      SELECT * FROM Foods
      WHERE Id IN (${foodParams.join(",")})
    `);

    const dbFoods = foodResult.recordset;

    // ======================================================
    // 6️⃣ CALCULATE TOTALS
    // ======================================================
    let totalCalories = 0,
        totalProtein = 0,
        totalCarbs = 0,
        totalFats = 0;

    for (const f of foods) {
      const food = dbFoods.find(d => d.Id === f.foodId);
      if (!food) continue;

      totalCalories += (food.Calories * f.quantity) / 100;
      totalProtein  += (food.Protein * f.quantity) / 100;
      totalCarbs    += (food.Carbs * f.quantity) / 100;
      totalFats     += (food.Fats * f.quantity) / 100;
    }

    // ======================================================
    // 7️⃣ UPDATE MAIN MEAL
    // ======================================================
    await new sql.Request(transaction)
      .input("MealId", sql.Int, mealId)
      .input("Name", sql.NVarChar, name)
      .input("MealTime", sql.NVarChar, mealTime)
      .input("Calories", sql.Float, totalCalories)
      .input("Protein", sql.Float, totalProtein)
      .input("Carbs", sql.Float, totalCarbs)
      .input("Fats", sql.Float, totalFats)
      .query(`
        UPDATE Meals
        SET Name = @Name,
            MealTime = @MealTime,
            TotalCalories = @Calories,
            TotalProtein = @Protein,
            TotalCarbs = @Carbs,
            TotalFats = @Fats,
            UpdatedAt = GETDATE()
        WHERE Id = @MealId
      `);

    // ======================================================
    // 8️⃣ REPLACE MEAL INGREDIENTS
    // ======================================================
    await new sql.Request(transaction)
      .input("MealId", sql.Int, mealId)
      .query(`
        DELETE FROM MealIngredients
        WHERE MealId = @MealId
      `);

    for (const f of foods) {
      const food = dbFoods.find(d => d.Id === f.foodId);
      if (!food) continue;

      await new sql.Request(transaction)
        .input("MealId", sql.Int, mealId)
        .input("FoodId", sql.Int, f.foodId)
        .input("Name", sql.NVarChar, food.Name)
        .input("Quantity", sql.Float, f.quantity)
        .input("Unit", sql.NVarChar, food.Unit)
        .input("Calories", sql.Float, (food.Calories * f.quantity) / 100)
        .input("Protein", sql.Float, (food.Protein * f.quantity) / 100)
        .input("Carbs", sql.Float, (food.Carbs * f.quantity) / 100)
        .input("Fats", sql.Float, (food.Fats * f.quantity) / 100)
        .query(`
          INSERT INTO MealIngredients
          (MealId, FoodId, Name, Quantity, Unit, Calories, Protein, Carbs, Fats)
          VALUES
          (@MealId, @FoodId, @Name, @Quantity, @Unit, @Calories, @Protein, @Carbs, @Fats)
        `);
    }

    // ======================================================
    // 9️⃣ UPDATE TRACKING (ONLY IF NOT DONE)
    // ======================================================
    if (canUpdateTracking) {

      await new sql.Request(transaction)
        .input("MealId", sql.Int, mealId)
        .input("UserId", sql.Int, userId)
        .input("Name", sql.NVarChar, name)
        .input("MealTime", sql.NVarChar, mealTime)
        .input("Calories", sql.Float, totalCalories)
        .input("Protein", sql.Float, totalProtein)
        .input("Carbs", sql.Float, totalCarbs)
        .input("Fats", sql.Float, totalFats)
        .query(`
          UPDATE MealTracking
          SET Name = @Name,
              MealTime = @MealTime,
              TotalCalories = @Calories,
              TotalProtein = @Protein,
              TotalCarbs = @Carbs,
              TotalFats = @Fats
          WHERE MealId = @MealId
            AND UserId = @UserId
        `);

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
    }

    // ======================================================
    // 🔟 COMMIT
    // ======================================================
    await transaction.commit();

    return res.status(200).json({
      result: "success",
      message: canUpdateTracking
        ? "Meal updated successfully (tracking synced)"
        : "Meal updated successfully (tracking locked or not found)"
    });

  } catch (err) {
    console.error("UPDATE MEAL ERROR:", err);

    try { await transaction.rollback(); } catch {}

    // ✅ HANDLE UNIQUE CONSTRAINT ERROR
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({
        result: "error",
        message: "Meal with this name and time already exists"
      });
    }

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};




// ----------------- delete Meal -----------------

const deleteMeal = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const userId = req.user.id;
    const mealId = parseInt(req.params.id);

    await transaction.begin();

    // ======================================================
    // 1️⃣ VERIFY MEAL OWNERSHIP
    // ======================================================
    const mealCheck = await new sql.Request(transaction)
      .input("MealId", sql.Int, mealId)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT Id 
        FROM Meals
        WHERE Id = @MealId AND UserId = @UserId
      `);

    if (!mealCheck.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({
        result: "error",
        message: "Meal not found"
      });
    }

    // ======================================================
    // 2️⃣ GET TRACKING
    // ======================================================
    const trackingRes = await new sql.Request(transaction)
      .input("MealId", sql.Int, mealId)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT Id, IsDone
        FROM MealTracking
        WHERE MealId = @MealId
          AND UserId = @UserId
      `);

    const trackingRow = trackingRes.recordset[0];

    // handle BIT safely
    const canDeleteTracking = trackingRow && !trackingRow.IsDone;

    // ======================================================
    // 3️⃣ DELETE FROM TRACKING (ONLY IF NOT DONE)
    // ======================================================
    if (canDeleteTracking) {

      // delete tracking ingredients first
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

      // delete tracking
      await new sql.Request(transaction)
        .input("MealId", sql.Int, mealId)
        .input("UserId", sql.Int, userId)
        .query(`
          DELETE FROM MealTracking
          WHERE MealId = @MealId
            AND UserId = @UserId
        `);
    }

    // ======================================================
    // 4️⃣ DELETE MAIN MEAL INGREDIENTS
    // ======================================================
    await new sql.Request(transaction)
      .input("MealId", sql.Int, mealId)
      .query(`
        DELETE FROM MealIngredients
        WHERE MealId = @MealId
      `);

    // ======================================================
    // 5️⃣ DELETE MEAL
    // ======================================================
    await new sql.Request(transaction)
      .input("MealId", sql.Int, mealId)
      .query(`
        DELETE FROM Meals
        WHERE Id = @MealId
      `);

    // ======================================================
    // 6️⃣ COMMIT
    // ======================================================
    await transaction.commit();

    return res.status(200).json({
      result: "success",
      message: canDeleteTracking
        ? "Meal and tracking deleted successfully"
        : "Meal deleted (tracking preserved as completed)"
    });

  } catch (err) {
    console.error("DELETE MEAL ERROR:", err);

    try { await transaction.rollback(); } catch {}

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};




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