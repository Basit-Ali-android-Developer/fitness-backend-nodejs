import { sql, poolPromise } from '../../db/connection.js';




const getActivePlanByUser = async (userId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT TOP 1 *
      FROM UserWorkoutPlans
      WHERE UserId = @UserId AND IsActive = 1
    `);

  return result.recordset[0];
};




const getLastWorkoutSession = async (userId, planId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("PlanId", sql.Int, planId)
    .query(`
      SELECT TOP 1 DayIndex
      FROM UserWorkoutSessions
      WHERE UserId = @UserId
      AND PlanId = @PlanId
      AND Status IN ('completed', 'skipped')
      ORDER BY EndTime DESC
    `);

  return result.recordset[0];
};




const getPlanDay = async (planId, dayIndex) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("PlanId", sql.Int, planId)
    .input("DayIndex", sql.Int, dayIndex)
    .query(`
      SELECT *
      FROM UserWorkoutPlanDays
      WHERE UserWorkoutPlanId = @PlanId
      AND DayIndex = @DayIndex
    `);

  return result.recordset[0];
};






const getDayExercisesWithNames = async (dayId) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("DayId", sql.Int, dayId)
    .query(`
      SELECT 
        e.ExerciseId,
        e.ExerciseName,
        e.Sets,
        e.Reps,
        e.OrderIndex
      FROM UserWorkoutPlanExercises e
      WHERE e.UserWorkoutPlanDayId = @DayId
      ORDER BY e.OrderIndex
    `);

  return result.recordset;
};

//  startWorkout




const getInProgressSession = async (userId, planId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("PlanId", sql.Int, planId)
    .query(`
      SELECT TOP 1 *
      FROM UserWorkoutSessions
      WHERE UserId = @UserId
      AND PlanId = @PlanId
      AND Status = 'in_progress'
      ORDER BY StartTime DESC
    `);

  return result.recordset[0];
};






const getLastCompletedSession = async (userId, planId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("PlanId", sql.Int, planId)
    .query(`
      SELECT TOP 1 DayIndex
      FROM UserWorkoutSessions
      WHERE UserId = @UserId
      AND PlanId = @PlanId
      AND Status IN ('completed', 'skipped')
      ORDER BY EndTime DESC
    `);

  return result.recordset[0];
};





const createWorkoutSession = async (userId, planId, dayIndex) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("PlanId", sql.Int, planId)
    .input("DayIndex", sql.Int, dayIndex)
    .query(`
      INSERT INTO UserWorkoutSessions
      (UserId, PlanId, DayIndex, Status, StartTime)
      VALUES
      (@UserId, @PlanId, @DayIndex, 'in_progress', GETDATE());

      SELECT SCOPE_IDENTITY() AS Id;
    `);

  return result.recordset[0].Id;
};



//     logSet



const getActiveSessionById = async (sessionId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("SessionId", sql.Int, sessionId)
    .query(`
      SELECT Id
      FROM UserWorkoutSessions
      WHERE Id = @SessionId AND Status = 'in_progress'
    `);

  return result.recordset[0];
};






const checkSetExists = async (sessionId, exerciseId, setNumber) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("SessionId", sql.Int, sessionId)
    .input("ExerciseId", sql.Int, exerciseId)
    .input("SetNumber", sql.Int, setNumber)
    .query(`
      SELECT Id
      FROM UserWorkoutSessionLogs
      WHERE SessionId = @SessionId
      AND ExerciseId = @ExerciseId
      AND SetNumber = @SetNumber
    `);

  return result.recordset[0];
};





const createSetLog = async (data) => {
  const pool = await poolPromise;

  await pool.request()
    .input("SessionId", sql.Int, data.sessionId)
    .input("ExerciseId", sql.Int, data.exerciseId)
    .input("SetNumber", sql.Int, data.setNumber)
    .input("Reps", sql.Int, data.reps)
    .input("Weight", sql.Float, data.weight)
    .query(`
      INSERT INTO UserWorkoutSessionLogs
      (SessionId, ExerciseId, SetNumber, Reps, Weight)
      VALUES
      (@SessionId, @ExerciseId, @SetNumber, @Reps, @Weight)
    `);
};



//   get logs during session


const getActiveSessionByUser = async (userId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT TOP 1 *
      FROM UserWorkoutSessions
      WHERE UserId = @UserId
      AND Status = 'in_progress'
      ORDER BY StartTime DESC
    `);

  return result.recordset[0];
};



const getSessionLogs = async (sessionId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("SessionId", sql.Int, sessionId)
    .query(`
      SELECT 
        l.ExerciseId,
        e.Name AS ExerciseName,
        l.SetNumber,
        l.Reps,
        l.Weight
      FROM UserWorkoutSessionLogs l
      INNER JOIN Exercises e ON e.Id = l.ExerciseId
      WHERE l.SessionId = @SessionId
      ORDER BY l.ExerciseId, l.SetNumber
    `);

  return result.recordset;
};


//   complete workout


const getSessionById = async (sessionId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("SessionId", sql.Int, sessionId)
    .query(`
      SELECT Id, Status
      FROM UserWorkoutSessions
      WHERE Id = @SessionId
    `);

  return result.recordset[0];
};



const completeSession = async (sessionId) => {
  const pool = await poolPromise;

  await pool.request()
    .input("SessionId", sql.Int, sessionId)
    .query(`
      UPDATE UserWorkoutSessions
      SET 
        Status = 'completed',
        EndTime = GETDATE()
      WHERE Id = @SessionId
    `);
};



//   skipp workout  


const getLastSession = async (userId, planId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("PlanId", sql.Int, planId)
    .query(`
      SELECT TOP 1 DayIndex
      FROM UserWorkoutSessions
      WHERE UserId = @UserId
      AND PlanId = @PlanId
      AND Status IN ('completed', 'skipped')
      ORDER BY EndTime DESC
    `);

  return result.recordset[0];
};



const createSkippedSession = async (userId, planId, dayIndex) => {
  const pool = await poolPromise;

  await pool.request()
    .input("UserId", sql.Int, userId)
    .input("PlanId", sql.Int, planId)
    .input("DayIndex", sql.Int, dayIndex)
    .query(`
      INSERT INTO UserWorkoutSessions
      (UserId, PlanId, DayIndex, Status, StartTime, EndTime)
      VALUES
      (@UserId, @PlanId, @DayIndex, 'skipped', GETDATE(), GETDATE())
    `);
};





const getWorkoutHistory = async (userId, page = 1) => {

  const pool = await poolPromise;

  const limit = 2;
  const offset = (page - 1) * limit;

  const sessionResult = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT Id
      FROM UserWorkoutSessions
      WHERE UserId = @UserId
        AND Status IN ('completed', 'skipped')
      ORDER BY StartTime DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

  const sessionIds = sessionResult.recordset.map(s => s.Id);

  if (!sessionIds.length) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false
      }
    };
  }


  const request = pool.request()
    .input("UserId", sql.Int, userId);

  const params = sessionIds.map((id, i) => {
    request.input(`id${i}`, sql.Int, id);
    return `@id${i}`;
  });

  const dataResult = await request.query(`
    SELECT 
      s.Id AS SessionId,
      s.Status,
      s.StartTime,
      s.EndTime,

      p.Name AS PlanName,

      d.DayIndex,
      d.Title AS DayTitle,

      l.SetNumber,
      l.Reps,
      l.Weight,

      ex.Id AS ExerciseId,
      ex.Name AS ExerciseName

    FROM UserWorkoutSessions s

    LEFT JOIN UserWorkoutPlans p 
      ON s.PlanId = p.Id

    LEFT JOIN UserWorkoutPlanDays d 
      ON d.UserWorkoutPlanId = s.PlanId
      AND d.DayIndex = s.DayIndex

    LEFT JOIN UserWorkoutSessionLogs l 
      ON l.SessionId = s.Id

    LEFT JOIN Exercises ex 
      ON ex.Id = l.ExerciseId

    WHERE s.Id IN (${params.join(",")})

    ORDER BY s.StartTime DESC, l.SetNumber
  `);


  const countResult = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT COUNT(*) AS total
      FROM UserWorkoutSessions
      WHERE UserId = @UserId
        AND Status IN ('completed', 'skipped')
    `);

  const total = countResult.recordset[0].total;
  const totalPages = Math.ceil(total / limit);

  return {
    rows: dataResult.recordset,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages
    }
  };
};




export default {
    getActivePlanByUser,
    getLastWorkoutSession,
    getPlanDay,
    getDayExercisesWithNames,


    getInProgressSession,
    getLastCompletedSession,
    createWorkoutSession,

    getActiveSessionById,
    checkSetExists,
    createSetLog,

    getActiveSessionByUser,
    getSessionLogs,

    getSessionById,
    completeSession,

    getLastSession,
    createSkippedSession,

    getWorkoutHistory
};