const { sql, poolPromise } = require('../../db/connection');
const Joi = require('joi');


const getTodaySummary = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    // ======================================================
    // 1️⃣ GET USER DIET PLAN
    // ======================================================
    const dietResult = await new sql.Request(pool)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT TargetCalories, MaintenanceCalories
        FROM UserDietPlans
        WHERE UserId = @UserId
      `);

    if (dietResult.recordset.length === 0) {
      return res.status(404).json({
        result: "error",
        message: "Diet plan not found"
      });
    }

    const diet = dietResult.recordset[0];

    // ======================================================
    // 2️⃣ TODAY DATE
    // ======================================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ======================================================
    // 3️⃣ GET ONLY CONSUMED MEALS (IsDone = 1)
    // ======================================================
    const trackingResult = await new sql.Request(pool)
      .input("UserId", sql.Int, userId)
      .input("Date", sql.Date, today)
      .query(`
        SELECT 
          TotalCalories,
          TotalProtein,
          TotalCarbs,
          TotalFats
        FROM MealTracking
        WHERE UserId = @UserId
          AND Date = @Date
          AND IsDone = 1
      `);

    const meals = trackingResult.recordset;

    // ======================================================
    // 4️⃣ SUM ALL VALUES
    // ======================================================
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;

    for (const m of meals) {
      calories += m.TotalCalories;
      protein += m.TotalProtein;
      carbs += m.TotalCarbs;
      fats += m.TotalFats;
    }

    // ======================================================
    // 5️⃣ CALCULATIONS
    // ======================================================
    const target = diet.TargetCalories;

    const remaining = target - calories;

    const progress = target > 0
      ? Math.round((calories / target) * 100)
      : 0;

    // ======================================================
    // 6️⃣ RESPONSE
    // ======================================================
    return res.status(200).json({
      result: "success",
      message: "Today summary fetched successfully",
      data: {
        calories: {
          consumed: calories,
          target: target,
          remaining: remaining,
          progress: progress
        },
        macros: {
          protein,
          carbs,
          fats
        }
      }
    });

  } catch (err) {
    console.error("today-summary error:", err);

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};



const getDashboardStats = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    // ======================================================
    // 1️⃣ DATES SETUP
    // ======================================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // ======================================================
    // 2️⃣ USER DIET PLAN
    // ======================================================
    const dietResult = await new sql.Request(pool)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT TargetCalories
        FROM UserDietPlans
        WHERE UserId = @UserId
      `);

    if (dietResult.recordset.length === 0) {
      return res.status(404).json({
        result: "error",
        message: "Diet plan not found"
      });
    }

    const targetCalories = dietResult.recordset[0].TargetCalories;

    // ======================================================
    // 3️⃣ TODAY SUMMARY (ONLY DONE)
    // ======================================================
    const todayResult = await new sql.Request(pool)
      .input("UserId", sql.Int, userId)
      .input("Date", sql.Date, today)
      .query(`
        SELECT 
          SUM(CASE WHEN IsDone = 1 THEN TotalCalories ELSE 0 END) AS Calories,
          SUM(CASE WHEN IsDone = 1 THEN TotalProtein ELSE 0 END) AS Protein,
          SUM(CASE WHEN IsDone = 1 THEN TotalCarbs ELSE 0 END) AS Carbs,
          SUM(CASE WHEN IsDone = 1 THEN TotalFats ELSE 0 END) AS Fats
        FROM MealTracking
        WHERE UserId = @UserId
          AND Date = @Date
      `);

    const todayData = todayResult.recordset[0];

    const consumedCalories = todayData.Calories || 0;
    const protein = todayData.Protein || 0;
    const carbs = todayData.Carbs || 0;
    const fats = todayData.Fats || 0;

    const remaining = targetCalories - consumedCalories;
    const progress = targetCalories > 0
      ? Math.round((consumedCalories / targetCalories) * 100)
      : 0;

    // ======================================================
    // 4️⃣ MEAL PROGRESS
    // ======================================================
    const mealProgressResult = await new sql.Request(pool)
      .input("UserId", sql.Int, userId)
      .input("Date", sql.Date, today)
      .query(`
        SELECT 
          Name,
          IsDone
        FROM MealTracking
        WHERE UserId = @UserId
          AND Date = @Date
      `);

    const meals = mealProgressResult.recordset;

    const totalMeals = meals.length;
    const completedMeals = meals.filter(m => m.IsDone).length;

    // ======================================================
    // 5️⃣ WEEKLY SUMMARY
    // ======================================================
    const weeklyResult = await new sql.Request(pool)
      .input("UserId", sql.Int, userId)
      .input("Start", sql.Date, weekStart)
      .input("End", sql.Date, today)
      .query(`
        SELECT 
          Date,
          SUM(TotalCalories) AS Calories
        FROM MealHistory
        WHERE UserId = @UserId
          AND Date BETWEEN @Start AND @End
          AND IsDone = 1
        GROUP BY Date
        ORDER BY Date
      `);

    const weeklyData = weeklyResult.recordset;

    let avgCalories = 0;
    let bestDay = null;
    let maxCalories = 0;

    if (weeklyData.length > 0) {
      const total = weeklyData.reduce((sum, d) => sum + d.Calories, 0);
      avgCalories = Math.round(total / weeklyData.length);

      weeklyData.forEach(d => {
        if (d.Calories > maxCalories) {
          maxCalories = d.Calories;
          bestDay = d.Date;
        }
      });
    }

    // ======================================================
    // 6️⃣ MONTHLY SUMMARY
    // ======================================================
    const monthlyResult = await new sql.Request(pool)
      .input("UserId", sql.Int, userId)
      .input("Start", sql.Date, monthStart)
      .input("End", sql.Date, today)
      .query(`
        SELECT 
          SUM(TotalCalories) AS TotalCalories,
          COUNT(DISTINCT Date) AS ActiveDays
        FROM MealHistory
        WHERE UserId = @UserId
          AND Date BETWEEN @Start AND @End
          AND IsDone = 1
      `);

    const monthlyData = monthlyResult.recordset[0];

    const totalCaloriesMonth = monthlyData.TotalCalories || 0;
    const activeDays = monthlyData.ActiveDays || 0;

    const avgPerDay = activeDays > 0
      ? Math.round(totalCaloriesMonth / activeDays)
      : 0;

    const consistency = Math.round((activeDays / new Date().getDate()) * 100);

    // ======================================================
    // 7️⃣ ALERTS (SMART LOGIC)
    // ======================================================
    const alerts = [];

    if (consumedCalories < targetCalories * 0.5) {
      alerts.push({
        type: "warning",
        message: "You are below your calorie goal today"
      });
    }

    if (consumedCalories > targetCalories) {
      alerts.push({
        type: "danger",
        message: "You exceeded your calorie goal"
      });
    }

    if (completedMeals === totalMeals && totalMeals > 0) {
      alerts.push({
        type: "success",
        message: "All meals completed today 🎉"
      });
    }

    // ======================================================
    // 8️⃣ FINAL RESPONSE
    // ======================================================
    return res.status(200).json({
      result: "success",
      message: "Dashboard fetched successfully",
      data: {
        today: {
          calories: {
            consumed: consumedCalories,
            target: targetCalories,
            remaining,
            progress
          },
          macros: { protein, carbs, fats }
        },

        mealProgress: {
          total: totalMeals,
          completed: completedMeals,
          meals
        },

        weekly: {
          averageCalories: avgCalories,
          bestDay,
          days: weeklyData
        },

        monthly: {
          totalCalories: totalCaloriesMonth,
          avgPerDay,
          consistency
        },

        alerts
      }
    });

  } catch (err) {
    console.error("dashboard error:", err);

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};


module.exports = { getTodaySummary, getDashboardStats };