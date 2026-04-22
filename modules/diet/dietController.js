const { sql, poolPromise } = require('../../db/connection');
const Joi = require('joi');

// Activity multipliers
const activityMultipliers = {
  Sedentary: 1.2,
  Light: 1.375,
  Moderate: 1.55,
  Active: 1.725,
  "Very Active": 1.9
};

// Validation schema
const dietPlanSchema = Joi.object({
  age: Joi.number().integer().positive().required(),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  height: Joi.number().positive().required(),
  weight: Joi.number().positive().required(),
  target_weight: Joi.number().positive().required(),
  goal_type: Joi.string().valid('Lose', 'Gain', 'Maintain').required(),
  activity_level: Joi.string().valid('Sedentary', 'Light', 'Moderate', 'Active', 'Very Active').required()
}).custom((value, helpers) => {
  const { weight, target_weight, goal_type } = value;

  if (goal_type === 'Lose' && target_weight >= weight) {
    return helpers.message("For 'Lose' goal, target_weight must be less than current weight");
  }
  if (goal_type === 'Gain' && target_weight <= weight) {
    return helpers.message("For 'Gain' goal, target_weight must be greater than current weight");
  }
  if (goal_type === 'Maintain' && target_weight !== weight) {
    return helpers.message("For 'Maintain' goal, target_weight must be equal to current weight");
  }

  return value;
});




// ----------- CREATE / UPDATE DIET PLAN -----------
const createOrUpdateDietPlan = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ from middleware

    // Validate body
    const { error, value } = dietPlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        result: "error",
        message: error.details[0].message,
        data: null
      });
    }

    const { age, gender, height, weight, target_weight, goal_type, activity_level } = value;

    // Calculate BMR
    let bmr;
    if (gender === 'Male') bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    else if (gender === 'Female') bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    else bmr = 10 * weight + 6.25 * height - 5 * age;

    // Maintenance Calories
    const maintenanceCalories = bmr * activityMultipliers[activity_level];

    // Target Calories
    let targetCalories = maintenanceCalories;
    if (goal_type === 'Lose') targetCalories -= 500;
    else if (goal_type === 'Gain') targetCalories += 500;

    const pool = await poolPromise;

    const existingPlan = await pool.request()
      .input('UserId', sql.Int, userId)
      .query('SELECT * FROM UserDietPlans WHERE UserId = @UserId');

    let result;

    if (existingPlan.recordset.length > 0) {
      // UPDATE
      result = await pool.request()
        .input('UserId', sql.Int, userId)
        .input('GoalType', sql.NVarChar, goal_type)
        .input('TargetWeight', sql.Float, target_weight)
        .input('BMR', sql.Float, bmr)
        .input('MaintenanceCalories', sql.Float, maintenanceCalories)
        .input('TargetCalories', sql.Float, targetCalories)
        .input('ActivityLevel', sql.NVarChar, activity_level)
        .query(`
          UPDATE UserDietPlans
          SET GoalType = @GoalType,
              TargetWeight = @TargetWeight,
              BMR = @BMR,
              MaintenanceCalories = @MaintenanceCalories,
              TargetCalories = @TargetCalories,
              ActivityLevel = @ActivityLevel,
              UpdatedAt = GETDATE()
          OUTPUT inserted.*
          WHERE UserId = @UserId
        `);
    } else {
      // INSERT
      result = await pool.request()
        .input('UserId', sql.Int, userId)
        .input('GoalType', sql.NVarChar, goal_type)
        .input('TargetWeight', sql.Float, target_weight)
        .input('BMR', sql.Float, bmr)
        .input('MaintenanceCalories', sql.Float, maintenanceCalories)
        .input('TargetCalories', sql.Float, targetCalories)
        .input('ActivityLevel', sql.NVarChar, activity_level)
        .query(`
          INSERT INTO UserDietPlans 
          (UserId, GoalType, TargetWeight, BMR, MaintenanceCalories, TargetCalories, ActivityLevel, CreatedAt, UpdatedAt)
          OUTPUT inserted.*
          VALUES 
          (@UserId, @GoalType, @TargetWeight, @BMR, @MaintenanceCalories, @TargetCalories, @ActivityLevel, GETDATE(), GETDATE())
        `);
    }

    return res.status(200).json({
      result: "success",
      message: "Diet plan saved successfully",
      data: result.recordset[0]
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





// ----------- GET DIET PLAN -----------
const getDietPlan = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ from middleware

    const pool = await poolPromise;

    const result = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT *
        FROM UserDietPlans
        WHERE UserId = @UserId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        result: "error",
        message: "No diet plan found",
        data: null
      });
    }

    return res.status(200).json({
      result: "success",
      message: "Diet plan fetched successfully",
      data: result.recordset[0]
    });

  } catch (err) {
    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};




// ----------- DELETE DIET PLAN -----------
const deleteDietPlan = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ from middleware

    const pool = await poolPromise;

    const result = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(`
        DELETE FROM UserDietPlans
        WHERE UserId = @UserId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        result: "error",
        message: "No diet plan found to delete",
        data: null
      });
    }

    return res.status(200).json({
      result: "success",
      message: "Diet plan deleted successfully",
      data: null
    });

  } catch (err) {
    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};










module.exports = { createOrUpdateDietPlan, getDietPlan, deleteDietPlan };