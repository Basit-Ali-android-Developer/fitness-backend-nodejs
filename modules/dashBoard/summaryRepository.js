import { sql, poolPromise } from '../../db/connection.js';

const getUserDiet = async (userId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT TargetCalories, MaintenanceCalories
      FROM UserDietPlans
      WHERE UserId = @UserId
    `);

  return result.recordset[0];
};

const getTodayConsumedTotals = async (userId, date) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Date", sql.Date, date)
    .query(`
      SELECT 
        SUM(TotalCalories) AS TotalCalories,
        SUM(TotalProtein) AS TotalProtein,
        SUM(TotalCarbs) AS TotalCarbs,
        SUM(TotalFats) AS TotalFats
      FROM MealTracking
      WHERE UserId = @UserId
        AND Date = @Date
        AND IsDone = 1
    `);

  return result.recordset[0];
};

const getTodaySummary = async (userId, date) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Date", sql.Date, date)
    .query(`
      SELECT 
        SUM(TotalCalories) AS Calories,
        SUM(TotalProtein) AS Protein,
        SUM(TotalCarbs) AS Carbs,
        SUM(TotalFats) AS Fats
      FROM MealTracking
      WHERE UserId = @UserId
        AND Date = @Date
        AND IsDone = 1
    `);

  return result.recordset[0];
};

const getTodayMeals = async (userId, date) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Date", sql.Date, date)
    .query(`
      SELECT Name, IsDone
      FROM MealTracking
      WHERE UserId = @UserId
        AND Date = @Date
    `);

  return result.recordset;
};

const getWeeklySummary = async (userId, start, end) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Start", sql.Date, start)
    .input("End", sql.Date, end)
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

  return result.recordset;
};

const getMonthlySummary = async (userId, start, end) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Start", sql.Date, start)
    .input("End", sql.Date, end)
    .query(`
      SELECT 
        SUM(TotalCalories) AS TotalCalories,
        COUNT(DISTINCT Date) AS ActiveDays
      FROM MealHistory
      WHERE UserId = @UserId
        AND Date BETWEEN @Start AND @End
        AND IsDone = 1
    `);

  return result.recordset[0];
};

export default {
  getUserDiet,
  getTodayConsumedTotals,
  getTodaySummary,
  getTodayMeals,
  getWeeklySummary,
  getMonthlySummary
};