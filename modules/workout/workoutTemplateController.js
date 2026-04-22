const { sql, poolPromise } = require('../../db/connection');
const Joi = require('joi');


const getAllTemplateWorkoutSplits = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        Id,
        Name,
        Goal,
        Level,
        DaysCount,
        Description
      FROM WorkoutTemplates
      ORDER BY DaysCount
    `);

    res.status(200).json({
      success: true,
      message: "Workout splits fetched successfully",
      data: result.recordset
    });

  } catch (error) {
    console.error("Error fetching splits:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};






const getWorkoutTemplateSplitById = async (req, res) => {
  try {
    const pool = await poolPromise;
    const templateId = req.params.id;

    const result = await pool.request()
      .input("TemplateId", sql.Int, templateId)
      .query(`
        SELECT 
            t.Id AS TemplateId,
            t.Name,
            t.Goal,
            t.Level,
            t.DaysCount,
            t.Description,

            d.Id AS DayId,
            d.DayNumber,
            d.Title AS DayTitle,

            e.ExerciseId,
            ex.Name AS ExerciseName,
            e.Sets,
            e.Reps,
            e.OrderIndex

        FROM WorkoutTemplates t
        INNER JOIN WorkoutTemplateDays d ON t.Id = d.TemplateId
        INNER JOIN WorkoutTemplateExercises e ON d.Id = e.TemplateDayId
        INNER JOIN Exercises ex ON e.ExerciseId = ex.Id

        WHERE t.Id = @TemplateId
        ORDER BY d.DayNumber, e.OrderIndex;
      `);

    const rows = result.recordset;

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Workout split not found"
      });
    }

    // 🧠 Transform into nested structure
    const template = {
      id: rows[0].TemplateId,
      name: rows[0].Name,
      goal: rows[0].Goal,
      level: rows[0].Level,
      daysCount: rows[0].DaysCount,
      description: rows[0].Description
    };

    const daysMap = {};

    rows.forEach(row => {
      if (!daysMap[row.DayId]) {
        daysMap[row.DayId] = {
          dayNumber: row.DayNumber,
          title: row.DayTitle,
          exercises: []
        };
      }

      daysMap[row.DayId].exercises.push({
        exerciseId: row.ExerciseId,
        exerciseName: row.ExerciseName,
        sets: row.Sets,
        reps: row.Reps,
        orderIndex: row.OrderIndex
      });
    });

    const days = Object.values(daysMap);

    res.status(200).json({
      success: true,
      data: {
        template,
        days
      }
    });

  } catch (error) {
    console.error("Error fetching split:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};




const createFullWorkoutTemplateSplit = async (req, res) => {
const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const {
      name,
      goal,
      level,
      daysCount,
      description,
      days
    } = req.body;

    // 1️⃣ INSERT TEMPLATE
    const templateResult = await new sql.Request(transaction)
      .input("Name", sql.NVarChar, name)
      .input("Goal", sql.NVarChar, goal)
      .input("Level", sql.NVarChar, level)
      .input("DaysCount", sql.Int, daysCount)
      .input("Description", sql.NVarChar, description)
      .query(`
        INSERT INTO WorkoutTemplates (Name, Goal, Level, DaysCount, Description)
        VALUES (@Name, @Goal, @Level, @DaysCount, @Description);

        SELECT SCOPE_IDENTITY() AS Id;
      `);

    const templateId = templateResult.recordset[0].Id;

    // 2️⃣ LOOP DAYS
    for (const day of days) {

      const dayResult = await new sql.Request(transaction)
        .input("TemplateId", sql.Int, templateId)
        .input("DayNumber", sql.Int, day.dayNumber)
        .input("Title", sql.NVarChar, day.title)
        .query(`
          INSERT INTO WorkoutTemplateDays (TemplateId, DayNumber, Title)
          VALUES (@TemplateId, @DayNumber, @Title);

          SELECT SCOPE_IDENTITY() AS Id;
        `);

      const dayId = dayResult.recordset[0].Id;

      // 3️⃣ INSERT EXERCISES
      for (const ex of day.exercises) {

        await new sql.Request(transaction)
          .input("TemplateDayId", sql.Int, dayId)
          .input("ExerciseId", sql.Int, ex.exerciseId)
          .input("Sets", sql.Int, ex.sets)
          .input("Reps", sql.Int, ex.reps)
          .input("OrderIndex", sql.Int, ex.orderIndex)
          .query(`
            INSERT INTO WorkoutTemplateExercises
            (TemplateDayId, ExerciseId, Sets, Reps, OrderIndex)
            VALUES
            (@TemplateDayId, @ExerciseId, @Sets, @Reps, @OrderIndex);
          `);
      }
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Full workout split created successfully",
      templateId
    });

  } catch (error) {
    await transaction.rollback();

    console.error("Full create error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};







const updateWorkoutTemplateSplit = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const templateId = req.params.id;

    const {
      name,
      goal,
      level,
      daysCount,
      description,
      days
    } = req.body;

    // 🔍 1. CHECK IF EXISTS (BEFORE TRANSACTION)
    const check = await pool.request()
      .input("Id", sql.Int, templateId)
      .query(`
        SELECT Id FROM WorkoutTemplates WHERE Id = @Id
      `);

    if (check.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Workout template not found"
      });
    }

    // 🔄 2. START TRANSACTION
    await transaction.begin();

    // 3️⃣ UPDATE TEMPLATE
    await new sql.Request(transaction)
      .input("Id", sql.Int, templateId)
      .input("Name", sql.NVarChar, name)
      .input("Goal", sql.NVarChar, goal)
      .input("Level", sql.NVarChar, level)
      .input("DaysCount", sql.Int, daysCount)
      .input("Description", sql.NVarChar, description)
      .query(`
        UPDATE WorkoutTemplates
        SET 
          Name = @Name,
          Goal = @Goal,
          Level = @Level,
          DaysCount = @DaysCount,
          Description = @Description
        WHERE Id = @Id;
      `);

    // 4️⃣ DELETE OLD DAYS
    await new sql.Request(transaction)
      .input("Id", sql.Int, templateId)
      .query(`
        DELETE FROM WorkoutTemplateDays
        WHERE TemplateId = @Id;
      `);

    // 5️⃣ RECREATE DAYS + EXERCISES
    for (const day of days) {

      const dayResult = await new sql.Request(transaction)
        .input("TemplateId", sql.Int, templateId)
        .input("DayNumber", sql.Int, day.dayNumber)
        .input("Title", sql.NVarChar, day.title)
        .query(`
          INSERT INTO WorkoutTemplateDays (TemplateId, DayNumber, Title)
          VALUES (@TemplateId, @DayNumber, @Title);

          SELECT SCOPE_IDENTITY() AS Id;
        `);

      const dayId = dayResult.recordset[0].Id;

      for (const ex of day.exercises) {

        await new sql.Request(transaction)
          .input("TemplateDayId", sql.Int, dayId)
          .input("ExerciseId", sql.Int, ex.exerciseId)
          .input("Sets", sql.Int, ex.sets)
          .input("Reps", sql.Int, ex.reps)
          .input("OrderIndex", sql.Int, ex.orderIndex)
          .query(`
            INSERT INTO WorkoutTemplateExercises
            (TemplateDayId, ExerciseId, Sets, Reps, OrderIndex)
            VALUES
            (@TemplateDayId, @ExerciseId, @Sets, @Reps, @OrderIndex);
          `);
      }
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Workout split updated successfully"
    });

  } catch (error) {
    await transaction.rollback();

    console.error("Update full split error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};







const deleteWorkoutSplitTemplate = async (req, res) => {
  try {
    const pool = await poolPromise;
    const templateId = req.params.id;

    // 🔍 1. CHECK IF EXISTS
    const check = await pool.request()
      .input("Id", sql.Int, templateId)
      .query(`
        SELECT Id FROM WorkoutTemplates WHERE Id = @Id
      `);

    if (check.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Workout template not found"
      });
    }

    // 🗑 2. DELETE TEMPLATE (CASCADE WILL HANDLE EVERYTHING)
    await pool.request()
      .input("Id", sql.Int, templateId)
      .query(`
        DELETE FROM WorkoutTemplates
        WHERE Id = @Id
      `);

    return res.status(200).json({
      success: true,
      message: "Workout split deleted successfully"
    });

  } catch (error) {
    console.error("Delete workout split error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};







module.exports = {getAllTemplateWorkoutSplits,
                  getWorkoutTemplateSplitById,
                  createFullWorkoutTemplateSplit,
                  updateWorkoutTemplateSplit,
                  deleteWorkoutSplitTemplate
                  };