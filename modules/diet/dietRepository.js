import { sql, poolPromise } from '../../db/connection.js';

const createOrUpdateDietPlan = async (data) => {
  const pool = await poolPromise;

  const existing = await pool.request()
    .input('UserId', sql.Int, data.userId)
    .query(`SELECT 1 FROM UserDietPlans WHERE UserId = @UserId`);

  const request = pool.request()
    .input('UserId', sql.Int, data.userId)
    .input('GoalType', sql.NVarChar, data.goal_type)
    .input('TargetWeight', sql.Float, data.target_weight)
    .input('BMR', sql.Float, data.bmr)
    .input('MaintenanceCalories', sql.Float, data.maintenanceCalories)
    .input('TargetCalories', sql.Float, data.targetCalories)
    .input('ActivityLevel', sql.NVarChar, data.activity_level)
    .input('ProteinGrams', sql.Float, data.proteinGrams)
    .input('CarbsGrams', sql.Float, data.carbsGrams)
    .input('FatsGrams', sql.Float, data.fatsGrams);

  let result;

  if (existing.recordset.length > 0) {
    result = await request.query(`
      UPDATE UserDietPlans
      SET GoalType = @GoalType,
          TargetWeight = @TargetWeight,
          BMR = @BMR,
          MaintenanceCalories = @MaintenanceCalories,
          TargetCalories = @TargetCalories,
          ActivityLevel = @ActivityLevel,
          ProteinGrams = @ProteinGrams,
          CarbsGrams = @CarbsGrams,
          FatsGrams = @FatsGrams,
          UpdatedAt = GETDATE()
      OUTPUT inserted.*
      WHERE UserId = @UserId
    `);
  } else {
    result = await request.query(`
      INSERT INTO UserDietPlans
      (UserId, GoalType, TargetWeight, BMR, MaintenanceCalories, TargetCalories, ActivityLevel, ProteinGrams, CarbsGrams, FatsGrams, CreatedAt, UpdatedAt)
      OUTPUT inserted.*
      VALUES
      (@UserId, @GoalType, @TargetWeight, @BMR, @MaintenanceCalories, @TargetCalories, @ActivityLevel, @ProteinGrams, @CarbsGrams, @FatsGrams, GETDATE(), GETDATE())
    `);
  }

  return result.recordset[0];
};

const getDietPlan = async (userId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('UserId', sql.Int, userId)
    .query(`
      SELECT *
      FROM UserDietPlans
      WHERE UserId = @UserId
    `);

  return result.recordset[0];
};

const deleteDietPlan = async (userId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('UserId', sql.Int, userId)
    .query(`
      DELETE FROM UserDietPlans
      WHERE UserId = @UserId
    `);

  return result.rowsAffected[0];
};

export default {
  createOrUpdateDietPlan,
  getDietPlan,
  deleteDietPlan
};