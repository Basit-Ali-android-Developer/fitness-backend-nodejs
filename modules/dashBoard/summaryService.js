import Joi from 'joi';
import AppError from '../../utils/AppError.js';
import summaryRepository from './summaryRepository.js';

const getTodaySummary = async (userId) => {
  //  GET DIET
  const diet = await summaryRepository.getUserDiet(userId);

  if (!diet) {
    throw new AppError("Diet plan not found", 404);
  }

  //  GET TODAY DATE
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  //  GET TOTAL CONSUMED (ALREADY SUMMED)
  const totals = await summaryRepository.getTodayConsumedTotals(userId, today);

  const calories = totals.TotalCalories || 0;
  const protein = totals.TotalProtein || 0;
  const carbs = totals.TotalCarbs || 0;
  const fats = totals.TotalFats || 0;

  //  CALCULATIONS
  const target = diet.TargetCalories;
  const remaining = target - calories;
  const progress = target > 0
    ? Math.round((calories / target) * 100)
    : 0;

  return {
    calories: {
      consumed: calories,
      target: target,
      remaining: remaining,
      progress
    },
    macros: {
      protein,
      carbs,
      fats
    }
  };
};

const getDashboardStats = async (userId) => {
  // ======================================================
  //  DATES SETUP
  // ======================================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // ======================================================
  //  DIET PLAN
  // ======================================================
  const diet = await summaryRepository.getUserDiet(userId);

  if (!diet) {
    throw new AppError("Diet plan not found", 404);
  }

  const targetCalories = diet.TargetCalories;

  // ======================================================
  //  TODAY SUMMARY
  // ======================================================
  const todayData = await summaryRepository.getTodaySummary(userId, today);

  const consumedCalories = todayData.Calories || 0;
  const protein = todayData.Protein || 0;
  const carbs = todayData.Carbs || 0;
  const fats = todayData.Fats || 0;

  const remaining = targetCalories - consumedCalories;
  const progress = targetCalories > 0
    ? Math.round((consumedCalories / targetCalories) * 100)
    : 0;

  // ======================================================
  //  MEAL PROGRESS
  // ======================================================
  const meals = await summaryRepository.getTodayMeals(userId, today);

  const totalMeals = meals.length;
  const completedMeals = meals.filter(m => m.IsDone).length;

  // ======================================================
  //  WEEKLY SUMMARY
  // ======================================================
  const weeklyData = await summaryRepository.getWeeklySummary(userId, weekStart, today);

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
  //  MONTHLY SUMMARY
  // ======================================================
  const monthly = await summaryRepository.getMonthlySummary(userId, monthStart, today);

  const totalCaloriesMonth = monthly.TotalCalories || 0;
  const activeDays = monthly.ActiveDays || 0;

  const avgPerDay = activeDays > 0
    ? Math.round(totalCaloriesMonth / activeDays)
    : 0;

  const consistency = Math.round((activeDays / today.getDate()) * 100);

  // ======================================================
  //  ALERTS
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
      message: "All meals completed today "
    });
  }

  // ======================================================
  // FINAL RESPONSE
  // ======================================================
  return {
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
  };
};

export default { getTodaySummary, getDashboardStats };