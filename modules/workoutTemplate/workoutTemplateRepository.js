const { sql, poolPromise } = require('../../db/connection');




const createTemplate = async (data) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("Name", sql.NVarChar, data.name)
    .input("Goal", sql.NVarChar, data.goal)
    .input("Level", sql.NVarChar, data.level)
    .input("DaysCount", sql.Int, data.days.length)
    .input("Description", sql.NVarChar, data.description || null)
    .query(`
      INSERT INTO WorkoutTemplates (Name, Goal, Level, DaysCount, Description)
      VALUES (@Name, @Goal, @Level, @DaysCount, @Description);

      SELECT SCOPE_IDENTITY() AS Id;
    `);

  return result.recordset[0].Id;
};





const createDay = async ({ templateId, dayNumber, title }) => {

  const pool = await poolPromise;

  const result = await pool.request()
    .input("TemplateId", sql.Int, templateId)
    .input("DayNumber", sql.Int, dayNumber)
    .input("Title", sql.NVarChar, title)
    .query(`
      INSERT INTO WorkoutTemplateDays (TemplateId, DayNumber, Title)
      VALUES (@TemplateId, @DayNumber, @Title);

      SELECT SCOPE_IDENTITY() AS Id;
    `);

  return result.recordset[0].Id;
};




const createExercise = async (data) => {

  const pool = await poolPromise;

  await pool.request()
    .input("TemplateDayId", sql.Int, data.dayId)
    .input("ExerciseId", sql.Int, data.exerciseId)
    .input("ExerciseName", sql.NVarChar, data.exerciseName)
    .input("Sets", sql.Int, data.sets)
    .input("Reps", sql.Int, data.reps)
    .input("OrderIndex", sql.Int, data.orderIndex)
    .query(`
      INSERT INTO WorkoutTemplateExercises
      (TemplateDayId, ExerciseId, ExerciseName, Sets, Reps, OrderIndex)
      VALUES (@TemplateDayId, @ExerciseId, @ExerciseName, @Sets, @Reps, @OrderIndex)
    `);
};


//    get templates 



const getAllTemplates = async () => {

  const pool = await poolPromise;

  const templates = await pool.request().query(`
    SELECT * 
    FROM WorkoutTemplates
    ORDER BY Id DESC
  `);

  return templates.recordset;
};





const getTemplateById = async (id) => {

  const pool = await poolPromise;

  const template = await pool.request()
    .input("Id", sql.Int, id)
    .query(`
      SELECT * 
      FROM WorkoutTemplates
      WHERE Id = @Id
    `);

  return template.recordset[0];
};




const getDaysByTemplateId = async (templateId) => {

  const pool = await poolPromise;

  const days = await pool.request()
    .input("TemplateId", sql.Int, templateId)
    .query(`
      SELECT * 
      FROM WorkoutTemplateDays
      WHERE TemplateId = @TemplateId
      ORDER BY DayNumber
    `);

  return days.recordset;
};







const getExercisesByDayId = async (dayId) => {

  const pool = await poolPromise;

  const exercises = await pool.request()
    .input("DayId", sql.Int, dayId)
    .query(`
      SELECT *
      FROM WorkoutTemplateExercises
      WHERE TemplateDayId = @DayId
      ORDER BY OrderIndex
    `);

  return exercises.recordset;
};


//    update template 




const updateTemplate = async (data) => {

  const pool = await poolPromise;

  await pool.request()
    .input("Id", sql.Int, data.templateId)
    .input("Name", sql.NVarChar, data.name)
    .input("Goal", sql.NVarChar, data.goal)
    .input("Level", sql.NVarChar, data.level)
    .input("DaysCount", sql.Int, data.days.length)
    .input("Description", sql.NVarChar, data.description || null)
    .query(`
      UPDATE WorkoutTemplates
      SET 
        Name = @Name,
        Goal = @Goal,
        Level = @Level,
        DaysCount = @DaysCount,
        Description = @Description
      WHERE Id = @Id
    `);
};








const deleteExercisesByDayId = async (dayId) => {

  const pool = await poolPromise;

  await pool.request()
    .input("DayId", sql.Int, dayId)
    .query(`
      DELETE FROM WorkoutTemplateExercises
      WHERE TemplateDayId = @DayId
    `);
};



const deleteDaysByTemplateId = async (templateId) => {

  const pool = await poolPromise;

  await pool.request()
    .input("TemplateId", sql.Int, templateId)
    .query(`
      DELETE FROM WorkoutTemplateDays
      WHERE TemplateId = @TemplateId
    `);
};




//   delete workout 



const deleteTemplate = async (templateId) => {

  const pool = await poolPromise;

  await pool.request()
    .input("Id", sql.Int, templateId)
    .query(`
      DELETE FROM WorkoutTemplates
      WHERE Id = @Id
    `);
};


module.exports = {
  createTemplate,
  createDay,
  createExercise,
  getAllTemplates,
  getTemplateById,
  getDaysByTemplateId,
  getExercisesByDayId,

  updateTemplate,

  deleteExercisesByDayId,
  deleteDaysByTemplateId,

  deleteTemplate
};