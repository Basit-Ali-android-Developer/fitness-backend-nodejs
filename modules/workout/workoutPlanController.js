const { sql, poolPromise } = require('../../db/connection');
const Joi = require('joi');


const createWorkoutPlan = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const {
      userId,
      name,
      goal,
      level,
      daysCount,
      days
    } = req.body;

    // 🔴 BASIC VALIDATION
    if (!days || days.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one workout day is required"
      });
    }

    // 🔴 Validate dayIndex range + collect indexes
    const dayIndexes = days.map(d => d.dayIndex);

    for (const day of days) {
      if (day.dayIndex < 1 || day.dayIndex > daysCount) {
        return res.status(400).json({
          success: false,
          message: `Invalid dayIndex ${day.dayIndex}`
        });
      }
    }

    // 🔴 Check duplicates
    const uniqueIndexes = new Set(dayIndexes);
    if (uniqueIndexes.size !== dayIndexes.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate dayIndex not allowed"
      });
    }

    // 🔴 Check sequential (VERY IMPORTANT)
    const sorted = [...uniqueIndexes].sort((a, b) => a - b);

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) {
        return res.status(400).json({
          success: false,
          message: "DayIndex must be sequential (1,2,3...)"
        });
      }
    }

    await transaction.begin();

    // 🔴 1️⃣ DEACTIVATE OLD PLANS
    await new sql.Request(transaction)
      .input("UserId", sql.Int, userId)
      .query(`
        UPDATE UserWorkoutPlans
        SET IsActive = 0
        WHERE UserId = @UserId
      `);

    // 🟢 2️⃣ INSERT NEW PLAN (ACTIVE + START FROM DAY 1)
    const planResult = await new sql.Request(transaction)
      .input("UserId", sql.Int, userId)
      .input("Name", sql.NVarChar, name)
      .input("Goal", sql.NVarChar, goal)
      .input("Level", sql.NVarChar, level)
      .input("DaysCount", sql.Int, daysCount)
      .input("CurrentDayIndex", sql.Int, 1)
      .query(`
        INSERT INTO UserWorkoutPlans
        (UserId, Name, Goal, Level, DaysCount, CurrentDayIndex, IsActive)
        VALUES
        (@UserId, @Name, @Goal, @Level, @DaysCount, @CurrentDayIndex, 1);

        SELECT SCOPE_IDENTITY() AS Id;
      `);

    const planId = planResult.recordset[0].Id;

    // 🟡 3️⃣ INSERT DAYS + EXERCISES
    for (const day of days) {

      const dayResult = await new sql.Request(transaction)
        .input("PlanId", sql.Int, planId)
        .input("DayIndex", sql.Int, day.dayIndex)
        .input("Title", sql.NVarChar, day.title)
        .query(`
          INSERT INTO UserWorkoutPlanDays
          (UserWorkoutPlanId, DayIndex, Title)
          VALUES
          (@PlanId, @DayIndex, @Title);

          SELECT SCOPE_IDENTITY() AS Id;
        `);

      const dayId = dayResult.recordset[0].Id;

      // 🔵 INSERT EXERCISES
      if (day.exercises && day.exercises.length > 0) {

        for (const ex of day.exercises) {

          if (!ex.exerciseId || !ex.sets || !ex.reps) {
            throw new Error("Invalid exercise data");
          }

          await new sql.Request(transaction)
            .input("DayId", sql.Int, dayId)
            .input("ExerciseId", sql.Int, ex.exerciseId)
            .input("Sets", sql.Int, ex.sets)
            .input("Reps", sql.Int, ex.reps)
            .input("OrderIndex", sql.Int, ex.orderIndex || 1)
            .query(`
              INSERT INTO UserWorkoutPlanExercises
              (UserWorkoutPlanDayId, ExerciseId, Sets, Reps, OrderIndex)
              VALUES
              (@DayId, @ExerciseId, @Sets, @Reps, @OrderIndex);
            `);
        }
      }
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Workout plan created and activated successfully",
      planId
    });

  } catch (error) {
    await transaction.rollback();

    console.error("Create workout plan error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};




const getUserWorkoutPlans = async (req, res) => {
  try {
    const pool = await poolPromise;

    const userId = req.user.id;

    const result = await pool.request()
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT 
            p.Id AS PlanId,
            p.Name,
            p.Goal,
            p.Level,
            p.DaysCount,
            p.CurrentDayIndex,
            p.IsActive,
            p.CreatedAt,

            d.Id AS DayId,
            d.DayIndex,
            d.Title AS DayTitle,

            e.ExerciseId,
            ex.Name AS ExerciseName,
            e.Sets,
            e.Reps,
            e.OrderIndex

        FROM UserWorkoutPlans p
        LEFT JOIN UserWorkoutPlanDays d 
            ON p.Id = d.UserWorkoutPlanId

        LEFT JOIN UserWorkoutPlanExercises e 
            ON d.Id = e.UserWorkoutPlanDayId

        LEFT JOIN Exercises ex 
            ON e.ExerciseId = ex.Id

        WHERE p.UserId = @UserId
        ORDER BY p.IsActive DESC, p.CreatedAt DESC, d.DayIndex ASC, e.OrderIndex ASC
      `);

    const rows = result.recordset;

    const plansMap = {};

    rows.forEach(row => {

      // 🟢 PLAN
      if (!plansMap[row.PlanId]) {
        plansMap[row.PlanId] = {
          id: row.PlanId,
          name: row.Name,
          goal: row.Goal,
          level: row.Level,
          daysCount: row.DaysCount,
          currentDayIndex: row.CurrentDayIndex, // 🔥 important
          isActive: row.IsActive,
          createdAt: row.CreatedAt,
          days: {}
        };
      }

      const plan = plansMap[row.PlanId];

      // 🟡 DAY
      if (row.DayId) {
        if (!plan.days[row.DayId]) {
          plan.days[row.DayId] = {
            dayIndex: row.DayIndex,
            title: row.DayTitle,
            exercises: []
          };
        }

        // 🔵 EXERCISE
        if (row.ExerciseId) {
          plan.days[row.DayId].exercises.push({
            exerciseId: row.ExerciseId,
            exerciseName: row.ExerciseName,
            sets: row.Sets,
            reps: row.Reps,
            orderIndex: row.OrderIndex
          });
        }
      }
    });

    // 🔁 FINAL CLEAN STRUCTURE
    const plans = Object.values(plansMap).map(plan => {

      const sortedDays = Object.values(plan.days)
        .sort((a, b) => a.dayIndex - b.dayIndex)
        .map(day => ({
          ...day,
          exercises: day.exercises.sort((a, b) => a.orderIndex - b.orderIndex)
        }));

      return {
        ...plan,
        days: sortedDays
      };
    });

    return res.status(200).json({
      success: true,
      message: "User workout plans fetched successfully",
      data: plans
    });

  } catch (error) {
    console.error("Get user plans error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};






const updateWorkoutPlan = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const planId = req.params.id;
    const userId = req.user.id;

    const { name, goal, level, daysCount, days } = req.body;

    // 🔴 1. BASIC VALIDATION
    if (!days || days.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one workout day is required"
      });
    }

    // 🔴 2. Validate duplicates + sequence
    const indexes = days.map(d => d.dayIndex);

    const unique = new Set(indexes);
    if (unique.size !== indexes.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate dayIndex not allowed"
      });
    }

    const sorted = [...unique].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) {
        return res.status(400).json({
          success: false,
          message: "DayIndex must be sequential (1,2,3...)"
        });
      }
    }

    await transaction.begin();

    // 🔥 3. CHECK OWNERSHIP
    const check = await new sql.Request(transaction)
      .input("Id", sql.Int, planId)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT Id, CurrentDayIndex
        FROM UserWorkoutPlans
        WHERE Id = @Id AND UserId = @UserId
      `);

    if (check.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Workout plan not found"
      });
    }

    let currentDayIndex = check.recordset[0].CurrentDayIndex;

    // 🔥 4. FIX INVALID CURRENT INDEX
    if (currentDayIndex > daysCount) {
      currentDayIndex = 1;
    }

    // 🟢 5. UPDATE PLAN
    await new sql.Request(transaction)
      .input("Id", sql.Int, planId)
      .input("Name", sql.NVarChar, name)
      .input("Goal", sql.NVarChar, goal)
      .input("Level", sql.NVarChar, level)
      .input("DaysCount", sql.Int, daysCount)
      .input("CurrentDayIndex", sql.Int, currentDayIndex)
      .query(`
        UPDATE UserWorkoutPlans
        SET 
          Name = @Name,
          Goal = @Goal,
          Level = @Level,
          DaysCount = @DaysCount,
          CurrentDayIndex = @CurrentDayIndex,
          UpdatedAt = GETDATE()
        WHERE Id = @Id
      `);

    // 🗑 6. DELETE OLD STRUCTURE
    await new sql.Request(transaction)
      .input("Id", sql.Int, planId)
      .query(`
        DELETE FROM UserWorkoutPlanDays
        WHERE UserWorkoutPlanId = @Id
      `);

    // 🟡 7. RECREATE DAYS + EXERCISES
    for (const day of days) {

      const dayResult = await new sql.Request(transaction)
        .input("PlanId", sql.Int, planId)
        .input("DayIndex", sql.Int, day.dayIndex)
        .input("Title", sql.NVarChar, day.title)
        .query(`
          INSERT INTO UserWorkoutPlanDays
          (UserWorkoutPlanId, DayIndex, Title)
          VALUES
          (@PlanId, @DayIndex, @Title);

          SELECT SCOPE_IDENTITY() AS Id;
        `);

      const dayId = dayResult.recordset[0].Id;

      for (const ex of (day.exercises || [])) {

        await new sql.Request(transaction)
          .input("DayId", sql.Int, dayId)
          .input("ExerciseId", sql.Int, ex.exerciseId)
          .input("Sets", sql.Int, ex.sets)
          .input("Reps", sql.Int, ex.reps)
          .input("OrderIndex", sql.Int, ex.orderIndex)
          .query(`
            INSERT INTO UserWorkoutPlanExercises
            (UserWorkoutPlanDayId, ExerciseId, Sets, Reps, OrderIndex)
            VALUES
            (@DayId, @ExerciseId, @Sets, @Reps, @OrderIndex);
          `);
      }
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Workout plan updated successfully"
    });

  } catch (error) {
    await transaction.rollback();

    console.error("Update workout plan error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};





const activateWorkoutPlan = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const userId = req.user.id;
    const planId = req.params.id;

    await transaction.begin();

    // 1️⃣ deactivate all user plans
    await new sql.Request(transaction)
      .input("UserId", sql.Int, userId)
      .query(`
        UPDATE UserWorkoutPlans
        SET IsActive = 0
        WHERE UserId = @UserId
      `);

    // 2️⃣ activate selected plan
    await new sql.Request(transaction)
      .input("PlanId", sql.Int, planId)
      .input("UserId", sql.Int, userId)
      .query(`
        UPDATE UserWorkoutPlans
        SET IsActive = 1
        WHERE Id = @PlanId AND UserId = @UserId
      `);

    await transaction.commit();

    return res.json({
      success: true,
      message: "Workout plan activated successfully"
    });

  } catch (error) {
    await transaction.rollback();

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};




const deleteWorkoutPlan = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const userId = req.user.id;
    const planId = req.params.id;

    await transaction.begin();

    // 1️⃣ CHECK PLAN + GET ACTIVE STATUS
    const check = await new sql.Request(transaction)
      .input("PlanId", sql.Int, planId)
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT Id, IsActive
        FROM UserWorkoutPlans
        WHERE Id = @PlanId AND UserId = @UserId
      `);

    if (check.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Workout plan not found"
      });
    }

    const isActive = check.recordset[0].IsActive;

    // 2️⃣ DELETE PLAN
    await new sql.Request(transaction)
      .input("PlanId", sql.Int, planId)
      .query(`
        DELETE FROM UserWorkoutPlans
        WHERE Id = @PlanId
      `);

    // 3️⃣ IF DELETED PLAN WAS ACTIVE → ACTIVATE NEW ONE
    if (isActive) {

      // get latest remaining plan
      const latest = await new sql.Request(transaction)
        .input("UserId", sql.Int, userId)
        .query(`
          SELECT TOP 1 Id
          FROM UserWorkoutPlans
          WHERE UserId = @UserId
          ORDER BY CreatedAt DESC
        `);

      if (latest.recordset.length > 0) {

        const newActiveId = latest.recordset[0].Id;

        await new sql.Request(transaction)
          .input("UserId", sql.Int, userId)
          .input("PlanId", sql.Int, newActiveId)
          .query(`
            UPDATE UserWorkoutPlans
            SET IsActive = 1
            WHERE Id = @PlanId AND UserId = @UserId
          `);
      }
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Workout plan deleted successfully"
    });

  } catch (error) {
    await transaction.rollback();

    console.error("Delete workout plan error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};





module.exports = {
  createWorkoutPlan,
  getUserWorkoutPlans,
  updateWorkoutPlan,
  activateWorkoutPlan,
  deleteWorkoutPlan
};