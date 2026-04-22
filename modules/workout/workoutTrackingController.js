const { sql, poolPromise } = require('../../db/connection');
const Joi = require('joi');





const getNextWorkout = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    // 🟢 1. Get active plan
    const planResult = await pool.request()
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT TOP 1 *
        FROM UserWorkoutPlans
        WHERE UserId = @UserId AND IsActive = 1
      `);

    if (planResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active workout plan found"
      });
    }

    const plan = planResult.recordset[0];

    // 🟡 2. Get last completed session day
    const lastSession = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("PlanId", sql.Int, plan.Id)
      .query(`
        SELECT TOP 1 DayIndex
        FROM UserWorkoutSessions
        WHERE UserId = @UserId
        AND PlanId = @PlanId
        AND Status IN ('completed', 'skipped')
        ORDER BY EndTime DESC
      `);

    let nextDayIndex = 1;

    if (lastSession.recordset.length > 0) {
      nextDayIndex = lastSession.recordset[0].DayIndex + 1;
    }

    // 🔵 3. Loop if exceeds plan
    if (nextDayIndex > plan.DaysCount) {
      nextDayIndex = 1;
    }

    // 🔴 4. Get workout day from plan
    const dayResult = await pool.request()
      .input("PlanId", sql.Int, plan.Id)
      .input("DayIndex", sql.Int, nextDayIndex)
      .query(`
        SELECT *
        FROM UserWorkoutPlanDays
        WHERE UserWorkoutPlanId = @PlanId
        AND DayIndex = @DayIndex
      `);

    if (dayResult.recordset.length === 0) {
      return res.json({
        success: true,
        message: "No workout found for next day",
        data: null
      });
    }

    const day = dayResult.recordset[0];

    // 🟣 5. Get exercises
    const exResult = await pool.request()
      .input("DayId", sql.Int, day.Id)
      .query(`
        SELECT 
          e.ExerciseId,
          ex.Name AS ExerciseName,
          e.Sets,
          e.Reps,
          e.OrderIndex
        FROM UserWorkoutPlanExercises e
        INNER JOIN Exercises ex ON ex.Id = e.ExerciseId
        WHERE e.UserWorkoutPlanDayId = @DayId
        ORDER BY e.OrderIndex
      `);

    return res.json({
      success: true,
      data: {
        plan: {
          id: plan.Id,
          name: plan.Name
        },
        nextWorkout: {
          dayIndex: nextDayIndex,
          title: day.Title,
          exercises: exResult.recordset
        }
      }
    });

  } catch (error) {
    console.error("Next workout error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};




const startWorkout = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    // 🟢 1. Get active plan
    const planResult = await pool.request()
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT TOP 1 *
        FROM UserWorkoutPlans
        WHERE UserId = @UserId AND IsActive = 1
      `);

    if (planResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active workout plan found"
      });
    }

    const plan = planResult.recordset[0];

    // 🔴 2. Check existing in-progress session
    const existingSession = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("PlanId", sql.Int, plan.Id)
      .query(`
        SELECT TOP 1 *
        FROM UserWorkoutSessions
        WHERE UserId = @UserId
        AND PlanId = @PlanId
        AND Status = 'in_progress'
        ORDER BY StartTime DESC
      `);

    if (existingSession.recordset.length > 0) {
      return res.json({
        success: true,
        message: "Resuming existing workout",
        sessionId: existingSession.recordset[0].Id,
        dayIndex: existingSession.recordset[0].DayIndex
      });
    }

    // 🟡 3. Get last completed OR skipped
    const lastSession = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("PlanId", sql.Int, plan.Id)
      .query(`
        SELECT TOP 1 DayIndex
        FROM UserWorkoutSessions
        WHERE UserId = @UserId
        AND PlanId = @PlanId
        AND Status IN ('completed', 'skipped')
        ORDER BY EndTime DESC
      `);

    let nextDayIndex = 1;

    if (lastSession.recordset.length > 0) {
      nextDayIndex = lastSession.recordset[0].DayIndex + 1;
    }

    if (nextDayIndex > plan.DaysCount) {
      nextDayIndex = 1;
    }

    // 🔵 4. Validate day exists
    const dayCheck = await pool.request()
      .input("PlanId", sql.Int, plan.Id)
      .input("DayIndex", sql.Int, nextDayIndex)
      .query(`
        SELECT Id, Title
        FROM UserWorkoutPlanDays
        WHERE UserWorkoutPlanId = @PlanId
        AND DayIndex = @DayIndex
      `);

    if (dayCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No workout defined for this day"
      });
    }

    const day = dayCheck.recordset[0];

    // 🟣 5. Create new session
    const sessionResult = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("PlanId", sql.Int, plan.Id)
      .input("DayIndex", sql.Int, nextDayIndex)
      .query(`
        INSERT INTO UserWorkoutSessions
        (UserId, PlanId, DayIndex, Status, StartTime)
        VALUES
        (@UserId, @PlanId, @DayIndex, 'in_progress', GETDATE());

        SELECT SCOPE_IDENTITY() AS Id;
      `);

    const sessionId = sessionResult.recordset[0].Id;

    return res.status(201).json({
      success: true,
      message: "Workout started successfully",
      data: {
        sessionId,
        plan: {
          id: plan.Id,
          name: plan.Name
        },
        workout: {
          dayIndex: nextDayIndex,
          title: day.Title
        }
      }
    });

  } catch (error) {
    console.error("Start workout error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



const logSet = async (req, res) => {
  try {
    const pool = await poolPromise;

    const {
      sessionId,
      exerciseId,
      setNumber,
      reps,
      weight
    } = req.body;

    // 🔍 1. Validate session exists
    const sessionCheck = await pool.request()
      .input("SessionId", sql.Int, sessionId)
      .query(`
        SELECT Id FROM UserWorkoutSessions
        WHERE Id = @SessionId AND Status = 'in_progress'
      `);

    if (sessionCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive session"
      });
    }

    // 💾 2. Insert set log
    await pool.request()
      .input("SessionId", sql.Int, sessionId)
      .input("ExerciseId", sql.Int, exerciseId)
      .input("SetNumber", sql.Int, setNumber)
      .input("Reps", sql.Int, reps)
      .input("Weight", sql.Float, weight)
      .query(`
        INSERT INTO UserWorkoutSessionLogs
        (SessionId, ExerciseId, SetNumber, Reps, Weight)
        VALUES
        (@SessionId, @ExerciseId, @SetNumber, @Reps, @Weight)
      `);

    return res.json({
      success: true,
      message: "Set logged successfully"
    });

  } catch (error) {
    console.error("Log set error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};




const completeWorkout = async (req, res) => {
  try {
    const pool = await poolPromise;

    const { sessionId } = req.body;

    // 1. Validate session
    const sessionRes = await pool.request()
      .input("SessionId", sql.Int, sessionId)
      .query(`
        SELECT * 
        FROM UserWorkoutSessions
        WHERE Id = @SessionId AND Status = 'in_progress'
      `);

    if (sessionRes.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid session"
      });
    }

    // 2. Mark completed
    await pool.request()
      .input("SessionId", sql.Int, sessionId)
      .query(`
        UPDATE UserWorkoutSessions
        SET 
          Status = 'completed',
          EndTime = GETDATE()
        WHERE Id = @SessionId
      `);

    return res.json({
      success: true,
      message: "Workout completed successfully 🎉"
    });

  } catch (error) {
    console.error("Complete workout error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};





const skipWorkout = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    // 🟢 1. Get active plan
    const planResult = await pool.request()
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT TOP 1 *
        FROM UserWorkoutPlans
        WHERE UserId = @UserId AND IsActive = 1
      `);

    if (planResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active plan"
      });
    }

    const plan = planResult.recordset[0];

    // 🔴 2. Prevent skip if workout in progress
    const inProgress = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("PlanId", sql.Int, plan.Id)
      .query(`
        SELECT TOP 1 Id
        FROM UserWorkoutSessions
        WHERE UserId = @UserId
        AND PlanId = @PlanId
        AND Status = 'in_progress'
      `);

    if (inProgress.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot skip while workout is in progress"
      });
    }

    // 🟡 3. Get last done (completed OR skipped)
    const lastSession = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("PlanId", sql.Int, plan.Id)
      .query(`
        SELECT TOP 1 DayIndex
        FROM UserWorkoutSessions
        WHERE UserId = @UserId
        AND PlanId = @PlanId
        AND Status IN ('completed', 'skipped')
        ORDER BY EndTime DESC
      `);

    let nextDayIndex = 1;

    if (lastSession.recordset.length > 0) {
      nextDayIndex = lastSession.recordset[0].DayIndex + 1;
    }

    if (nextDayIndex > plan.DaysCount) {
      nextDayIndex = 1;
    }

    // 🔵 4. Validate day exists
    const dayCheck = await pool.request()
      .input("PlanId", sql.Int, plan.Id)
      .input("DayIndex", sql.Int, nextDayIndex)
      .query(`
        SELECT Id
        FROM UserWorkoutPlanDays
        WHERE UserWorkoutPlanId = @PlanId
        AND DayIndex = @DayIndex
      `);

    if (dayCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No workout defined for next day"
      });
    }

    // 🟣 5. Insert skip
    await pool.request()
      .input("UserId", sql.Int, userId)
      .input("PlanId", sql.Int, plan.Id)
      .input("DayIndex", sql.Int, nextDayIndex)
      .query(`
        INSERT INTO UserWorkoutSessions
        (UserId, PlanId, DayIndex, Status, StartTime, EndTime)
        VALUES
        (@UserId, @PlanId, @DayIndex, 'skipped', GETDATE(), GETDATE())
      `);

    return res.json({
      success: true,
      message: "Workout skipped successfully",
      skippedDayIndex: nextDayIndex
    });

  } catch (error) {
    console.error("Skip workout error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};





const getWorkoutHistory = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    const result = await pool.request()
      .input("UserId", sql.Int, userId)
      .query(`
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

        WHERE s.UserId = @UserId
        AND s.Status IN ('completed', 'skipped')

        ORDER BY s.StartTime DESC, l.SetNumber
      `);

    const rows = result.recordset;

    const sessionsMap = {};

    rows.forEach(row => {

      // 🟢 SESSION LEVEL
      if (!sessionsMap[row.SessionId]) {
        sessionsMap[row.SessionId] = {
          sessionId: row.SessionId,
          status: row.Status,
          startTime: row.StartTime,
          endTime: row.EndTime,
          planName: row.PlanName,
          day: {
            dayIndex: row.DayIndex,
            title: row.DayTitle
          },
          exercises: {}
        };
      }

      const session = sessionsMap[row.SessionId];

      // 🟡 EXERCISE LEVEL
      if (row.ExerciseId) {
        if (!session.exercises[row.ExerciseId]) {
          session.exercises[row.ExerciseId] = {
            exerciseId: row.ExerciseId,
            exerciseName: row.ExerciseName,
            sets: []
          };
        }

        // 🔵 SET LEVEL
        if (row.SetNumber) {
          session.exercises[row.ExerciseId].sets.push({
            setNumber: row.SetNumber,
            reps: row.Reps,
            weight: row.Weight
          });
        }
      }
    });

    // convert to array
    const history = Object.values(sessionsMap).map(session => ({
      ...session,
      exercises: Object.values(session.exercises)
    }));

    return res.status(200).json({
      success: true,
      message: "Workout history fetched successfully",
      data: history
    });

  } catch (error) {
    console.error("Workout history error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};





module.exports = {
  getNextWorkout,
  startWorkout,
  logSet,
  completeWorkout,
  skipWorkout,
  getWorkoutHistory
};