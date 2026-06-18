import templateRepo from './workoutTemplateRepository.js';
import AppError from '../../utils/AppError.js';

const createFullWorkoutTemplateSplit = async (data) => {
  if (!data.name || !data.days || data.days.length === 0) {
    throw new AppError("Invalid workout template data", 400);
  }

  //  Create Template
  const templateId = await templateRepo.createTemplate(data);

  //  Loop Days
  for (const day of data.days) {
    const dayId = await templateRepo.createDay({
      templateId,
      dayNumber: day.dayNumber,
      title: day.title
    });

    //  Loop Exercises
    for (const ex of day.exercises) {
      await templateRepo.createExercise({
        dayId,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        reps: ex.reps,
        orderIndex: ex.orderIndex
      });
    }
  }

  return { templateId };
};

const getAllTemplates = async (page = 1) => {
  const { data: templates, pagination } = await templateRepo.getAllTemplatesFull(page);
  const result = [];

  for (const t of templates) {
    const days = await templateRepo.getDaysByTemplateId(t.Id);
    const fullDays = [];

    for (const d of days) {
      const exercises = await templateRepo.getExercisesByDayId(d.Id);

      fullDays.push({
        dayNumber: d.DayNumber,
        title: d.Title,
        exercises: exercises.map(ex => ({
          exerciseId: ex.ExerciseId,
          exerciseName: ex.ExerciseName,
          sets: ex.Sets,
          reps: ex.Reps,
          orderIndex: ex.OrderIndex
        }))
      });
    }

    result.push({
      id: t.Id,
      name: t.Name,
      goal: t.Goal,
      level: t.Level,
      daysCount: t.DaysCount,
      description: t.Description,
      days: fullDays
    });
  }

  return {
    data: result,
    pagination
  };
};

const getTemplateById = async (id) => {
  const t = await templateRepo.getTemplateById(id);

  if (!t) {
    throw new AppError("Workout template not found", 404);
  }

  const days = await templateRepo.getDaysByTemplateId(id);
  const fullDays = [];

  for (const d of days) {
    const exercises = await templateRepo.getExercisesByDayId(d.Id);

    fullDays.push({
      dayNumber: d.DayNumber,
      title: d.Title,
      exercises: exercises.map(ex => ({
        exerciseId: ex.ExerciseId,
        ExerciseName: ex.ExerciseName,
        sets: ex.Sets,
        reps: ex.Reps,
        orderIndex: ex.OrderIndex
      }))
    });
  }

  return {
    id: t.Id,
    name: t.Name,
    goal: t.Goal,
    level: t.Level,
    daysCount: t.DaysCount,
    description: t.Description,
    days: fullDays
  };
};

const updateWorkoutTemplateSplit = async (templateId, data) => {
  if (!data.name || !data.days || data.days.length === 0) {
    throw new AppError("Invalid workout template data", 400);
  }

  const exists = await templateRepo.getTemplateById(templateId);

  if (!exists) {
    throw new AppError("Workout template not found", 404);
  }

  await templateRepo.updateTemplate({
    templateId,
    ...data
  });

  const days = await templateRepo.getDaysByTemplateId(templateId);

  for (const d of days) {
    await templateRepo.deleteExercisesByDayId(d.Id);
  }

  await templateRepo.deleteDaysByTemplateId(templateId);

  for (const day of data.days) {
    const dayId = await templateRepo.createDay({
      templateId,
      dayNumber: day.dayNumber,
      title: day.title
    });

    for (const ex of day.exercises) {
      await templateRepo.createExercise({
        dayId,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        reps: ex.reps,
        orderIndex: ex.orderIndex
      });
    }
  }

  return { templateId };
};

const deleteWorkoutTemplate = async (templateId) => {
  const exists = await templateRepo.getTemplateById(templateId);

  if (!exists) {
    throw new AppError("Workout template not found", 404);
  }

  const days = await templateRepo.getDaysByTemplateId(templateId);

  for (const d of days) {
    await templateRepo.deleteExercisesByDayId(d.Id);
  }

  await templateRepo.deleteDaysByTemplateId(templateId);
  await templateRepo.deleteTemplate(templateId);

  return { templateId };
};

export default {
  createFullWorkoutTemplateSplit,
  getAllTemplates,
  getTemplateById,
  updateWorkoutTemplateSplit,
  deleteWorkoutTemplate
};