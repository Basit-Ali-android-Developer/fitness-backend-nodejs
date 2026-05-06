const { sql, poolPromise } = require('../../db/connection');







const deactivateUserPlans = async (userId) => {

  const pool = await poolPromise;

  await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      UPDATE UserWorkoutPlans
      SET IsActive = 0
      WHERE UserId = @UserId
    `);
};




const createPlan = async (userId, data) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Name", sql.NVarChar, data.name)
    .input("Goal", sql.NVarChar, data.goal)
    .input("Level", sql.NVarChar, data.level)
    .input("DaysCount", sql.Int, data.daysCount)
    .input("CurrentDayIndex", sql.Int, 1)
    .input("Description", sql.NVarChar, data.description)
    .query(`
      INSERT INTO UserWorkoutPlans
      (UserId, Name, Goal, Level, DaysCount, CurrentDayIndex, IsActive, Description)
      VALUES
      (@UserId, @Name, @Goal, @Level, @DaysCount, @CurrentDayIndex, 1, @Description);

      SELECT SCOPE_IDENTITY() AS Id;
    `);

  return result.recordset[0].Id;
};




const createDay = async ({ planId, dayIndex, title }) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("PlanId", sql.Int, planId)
    .input("DayIndex", sql.Int, dayIndex)
    .input("Title", sql.NVarChar, title)
    .query(`
      INSERT INTO UserWorkoutPlanDays
      (UserWorkoutPlanId, DayIndex, Title)
      VALUES
      (@PlanId, @DayIndex, @Title);

      SELECT SCOPE_IDENTITY() AS Id;
    `);

  return result.recordset[0].Id;
};





const createExercise = async (data) => {

  const pool = await poolPromise;

  await pool.request()
    .input("DayId", sql.Int, data.dayId)
    .input("ExerciseId", sql.Int, data.exerciseId)
    .input("Sets", sql.Int, data.sets)
    .input("Reps", sql.Int, data.reps)
    .input("OrderIndex", sql.Int, data.orderIndex)
    .input("ExerciseName", sql.NVarChar, data.exerciseName)
    .query(`
      INSERT INTO UserWorkoutPlanExercises
      (UserWorkoutPlanDayId, ExerciseId, Sets, Reps, OrderIndex, ExerciseName)
      VALUES
      (@DayId, @ExerciseId, @Sets, @Reps, @OrderIndex, @ExerciseName)
    `);
};


//   get worksout for user


const getUserPlans = async (userId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT 
        Id,
        Name,
        Goal,
        Level,
        DaysCount,
        CurrentDayIndex,
        IsActive,
        Description
      FROM UserWorkoutPlans
      WHERE UserId = @UserId
      ORDER BY CreatedAt DESC
    `);

  return result.recordset;
};



const getPlanDays = async (planId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("PlanId", sql.Int, planId)
    .query(`
      SELECT 
        Id,
        DayIndex,
        Title
      FROM UserWorkoutPlanDays
      WHERE UserWorkoutPlanId = @PlanId
      ORDER BY DayIndex
    `);

  return result.recordset;
};



const getDayExercises = async (dayId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("DayId", sql.Int, dayId)
    .query(`
      SELECT 
        Id,
        ExerciseId,
        ExerciseName,
        Sets,
        Reps,
        OrderIndex
      FROM UserWorkoutPlanExercises
      WHERE UserWorkoutPlanDayId = @DayId
      ORDER BY OrderIndex
    `);

  return result.recordset;
};



const getUserPlansAll = async (userId, page = 1) => {

  const pool = await poolPromise;

  const limit = 5;
  const offset = (page - 1) * limit;


  const dataResult = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT 
        Id,
        Name,
        Goal,
        Level,
        DaysCount,
        CurrentDayIndex,
        IsActive,
        Description
      FROM UserWorkoutPlans
      WHERE UserId = @UserId
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `);

  
  const countResult = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT COUNT(*) AS total
      FROM UserWorkoutPlans
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

//  update plan




const getPlanById = async (planId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("Id", sql.Int, planId)
    .query(`
      SELECT Id, UserId, IsActive
      FROM UserWorkoutPlans
      WHERE Id = @Id
    `);

  return result.recordset[0];
};





const updatePlan = async (data) => {

  const pool = await poolPromise;

  await pool.request()
    .input("Id", sql.Int, data.planId)
    .input("Name", sql.NVarChar, data.name)
    .input("Goal", sql.NVarChar, data.goal)
    .input("Level", sql.NVarChar, data.level)
    .input("DaysCount", sql.Int, data.daysCount)
    .input("Description", sql.NVarChar, data.description)
    .query(`
      UPDATE UserWorkoutPlans
      SET 
        Name = @Name,
        Goal = @Goal,
        Level = @Level,
        DaysCount = @DaysCount,
        Description = @Description,
        UpdatedAt = GETDATE()
      WHERE Id = @Id
    `);
};



const deletePlanDays = async (planId) => {

  const pool = await poolPromise;

  await pool.request()
    .input("PlanId", sql.Int, planId)
    .query(`
      DELETE FROM UserWorkoutPlanDays
      WHERE UserWorkoutPlanId = @PlanId
    `);
};



const getActivePlanByUser = async (userId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT 
        Id,
        Name,
        Goal,
        Level,
        DaysCount,
        CurrentDayIndex,
        IsActive,
        Description
      FROM UserWorkoutPlans
      WHERE UserId = @UserId AND IsActive = 1
    `);

  return result.recordset[0]; 
};



//  activate



const activatePlanForUser = async (userId, planId) => {

  const pool = await poolPromise;

  try {
    await pool.request()
      .input("UserId", sql.Int, userId)
      .input("PlanId", sql.Int, planId)
      .query(`
        UPDATE UserWorkoutPlans
        SET 
          IsActive = CASE WHEN Id = @PlanId THEN 1 ELSE 0 END,
          CurrentDayIndex = CASE 
                              WHEN Id = @PlanId AND IsActive = 0 THEN 1 
                              ELSE CurrentDayIndex 
                            END,
          UpdatedAt = GETDATE()
        WHERE UserId = @UserId
      `);

  } catch (err) {
    if (err.number === 2601 || err.number === 2627) {
      throw new AppError("Only one active plan is allowed", 400);
    }
    throw err;
  }
};




//  delete api 


const deletePlanExercises = async (planId) => {

  const pool = await poolPromise;

  await pool.request()
    .input("PlanId", sql.Int, planId)
    .query(`
      DELETE E
      FROM UserWorkoutPlanExercises E
      INNER JOIN UserWorkoutPlanDays D
        ON E.UserWorkoutPlanDayId = D.Id
      WHERE D.UserWorkoutPlanId = @PlanId
    `);
};


const deletePlan = async (planId) => {

  const pool = await poolPromise;

  await pool.request()
    .input("PlanId", sql.Int, planId)
    .query(`
      DELETE FROM UserWorkoutPlans
      WHERE Id = @PlanId
    `);
};



const getAnotherUserPlan = async (userId, excludePlanId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("ExcludeId", sql.Int, excludePlanId)
    .query(`
      SELECT TOP 1 Id
      FROM UserWorkoutPlans
      WHERE UserId = @UserId AND Id != @ExcludeId
      ORDER BY CreatedAt DESC
    `);

  return result.recordset[0];
};








module.exports = {
  deactivateUserPlans,
  createPlan,
  createDay,
  createExercise,

  getUserPlans,
  getPlanDays,
  getDayExercises,

  getPlanById,
  updatePlan,
  deletePlanDays,

 getActivePlanByUser,


  activatePlanForUser,
  
  deletePlanExercises,
  deletePlan,
  getAnotherUserPlan,

  getUserPlansAll



};