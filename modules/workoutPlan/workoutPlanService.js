import workoutPlanRepo from './workoutPlanRepository.js';
import AppError from '../../utils/AppError.js';

const createWorkoutPlan = async (userId, data) => {
  const { name, goal, level, daysCount, description, days } = data;

  if (!name || typeof name !== "string") {
    throw new AppError("Plan name is required", 400);
  }

  if (!goal || typeof goal !== "string") {
    throw new AppError("Goal is required", 400);
  }

  if (!level || typeof level !== "string") {
    throw new AppError("Level is required", 400);
  }

  if (!daysCount || typeof daysCount !== "number" || daysCount <= 0) {
    throw new AppError("Valid daysCount is required", 400);
  }

  if (!Array.isArray(days) || days.length === 0) {
    throw new AppError("At least one workout day is required", 400);
  }

  if (days.length !== daysCount) {
    throw new AppError("daysCount must match number of days", 400);
  }

  const dayIndexes = days.map(d => d.dayIndex);

  for (const day of days) {
    if (!day.dayIndex || typeof day.dayIndex !== "number") {
      throw new AppError("Each day must have valid dayIndex", 400);
    }

    if (day.dayIndex < 1 || day.dayIndex > daysCount) {
      throw new AppError(`Invalid dayIndex ${day.dayIndex}`, 400);
    }

    if (!day.title || typeof day.title !== "string") {
      throw new AppError(`Day ${day.dayIndex} must have a title`, 400);
    }

    if (!Array.isArray(day.exercises) || day.exercises.length === 0) {
      throw new AppError(`Day ${day.dayIndex} must have exercises`, 400);
    }
  }

  const uniqueIndexes = new Set(dayIndexes);
  if (uniqueIndexes.size !== dayIndexes.length) {
    throw new AppError("Duplicate dayIndex not allowed", 400);
  }

  const sorted = [...uniqueIndexes].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      throw new AppError("DayIndex must be sequential (1,2,3...)", 400);
    }
  }

  for (const day of days) {
    const orderIndexes = [];

    for (const ex of day.exercises) {
      if (!ex.exerciseId || typeof ex.exerciseId !== "number") {
        throw new AppError(`Invalid exerciseId in day ${day.dayIndex}`, 400);
      }

      if (!ex.sets || ex.sets <= 0) {
        throw new AppError(`Invalid sets in day ${day.dayIndex}`, 400);
      }

      if (!ex.reps || ex.reps <= 0) {
        throw new AppError(`Invalid reps in day ${day.dayIndex}`, 400);
      }

      if (!ex.exerciseName || typeof ex.exerciseName !== "string") {
        throw new AppError(`Exercise name required in day ${day.dayIndex}`, 400);
      }

      const order = ex.orderIndex || 1;

      if (orderIndexes.includes(order)) {
        throw new AppError(`Duplicate orderIndex in day ${day.dayIndex}`, 400);
      }

      orderIndexes.push(order);
    }
  }

  await workoutPlanRepo.deactivateUserPlans(userId);
  const planId = await workoutPlanRepo.createPlan(userId, data);

  for (const day of days) {
    const dayId = await workoutPlanRepo.createDay({
      planId,
      dayIndex: day.dayIndex,
      title: day.title
    });

    for (const ex of day.exercises) {
      await workoutPlanRepo.createExercise({
        dayId,
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        orderIndex: ex.orderIndex || 1,
        exerciseName: ex.exerciseName
      });
    }
  }

  return { planId };
};

const getUserWorkoutPlans = async (userId, page = 1) => {
  const { data: plans, pagination } = await workoutPlanRepo.getUserPlansAll(userId, page);

  for (const plan of plans) {
    const days = await workoutPlanRepo.getPlanDays(plan.Id);

    for (const day of days) {
      const exercises = await workoutPlanRepo.getDayExercises(day.Id);
      day.exercises = exercises;
    }

    plan.days = days;
  }

  return {
    data: plans,
    pagination
  };
};

const updateWorkoutPlan = async (userId, planId, data) => {
  const { name, goal, level, daysCount, description, days } = data;
  const plan = await workoutPlanRepo.getPlanById(planId);

  if (!plan || plan.UserId !== userId) {
    throw new AppError("Workout plan not found", 404);
  }

  if (!name || typeof name !== "string") {
    throw new AppError("Plan name is required", 400);
  }

  if (!goal || typeof goal !== "string") {
    throw new AppError("Goal is required", 400);
  }

  if (!level || typeof level !== "string") {
    throw new AppError("Level is required", 400);
  }

  if (!daysCount || typeof daysCount !== "number" || daysCount <= 0) {
    throw new AppError("Valid daysCount is required", 400);
  }

  if (!Array.isArray(days) || days.length === 0) {
    throw new AppError("At least one workout day is required", 400);
  }

  if (days.length !== daysCount) {
    throw new AppError("daysCount must match number of days", 400);
  }

  const dayIndexes = days.map(d => d.dayIndex);

  for (const day of days) {
    if (!day.dayIndex || typeof day.dayIndex !== "number") {
      throw new AppError("Each day must have valid dayIndex", 400);
    }

    if (day.dayIndex < 1 || day.dayIndex > daysCount) {
      throw new AppError(`Invalid dayIndex ${day.dayIndex}`, 400);
    }

    if (!day.title || typeof day.title !== "string") {
      throw new AppError(`Day ${day.dayIndex} must have a title`, 400);
    }

    if (!Array.isArray(day.exercises) || day.exercises.length === 0) {
      throw new AppError(`Day ${day.dayIndex} must have exercises`, 400);
    }
  }

  const uniqueIndexes = new Set(dayIndexes);
  if (uniqueIndexes.size !== dayIndexes.length) {
    throw new AppError("Duplicate dayIndex not allowed", 400);
  }

  const sorted = [...uniqueIndexes].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      throw new AppError("DayIndex must be sequential (1,2,3...)", 400);
    }
  }

  for (const day of days) {
    const orderIndexes = [];

    for (const ex of day.exercises) {
      if (!ex.exerciseId || typeof ex.exerciseId !== "number") {
        throw new AppError(`Invalid exerciseId in day ${day.dayIndex}`, 400);
      }

      if (!ex.sets || ex.sets <= 0) {
        throw new AppError(`Invalid sets in day ${day.dayIndex}`, 400);
      }

      if (!ex.reps || ex.reps <= 0) {
        throw new AppError(`Invalid reps in day ${day.dayIndex}`, 400);
      }

      if (!ex.exerciseName || typeof ex.exerciseName !== "string") {
        throw new AppError(`Exercise name required in day ${day.dayIndex}`, 400);
      }

      const order = ex.orderIndex || 1;

      if (orderIndexes.includes(order)) {
        throw new AppError(`Duplicate orderIndex in day ${day.dayIndex}`, 400);
      }

      orderIndexes.push(order);
    }
  }

  await workoutPlanRepo.updatePlan({
    planId,
    name,
    goal,
    level,
    daysCount,
    description
  });

  await workoutPlanRepo.deletePlanExercises(planId);
  await workoutPlanRepo.deletePlanDays(planId);

  for (const day of days) {
    const dayId = await workoutPlanRepo.createDay({
      planId,
      dayIndex: day.dayIndex,
      title: day.title
    });

    for (const ex of day.exercises) {
      await workoutPlanRepo.createExercise({
        dayId,
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        orderIndex: ex.orderIndex || 1,
        exerciseName: ex.exerciseName
      });
    }
  }

  return { planId };
};

const getActiveWorkoutPlan = async (userId) => {
  const plan = await workoutPlanRepo.getActivePlanByUser(userId);

  if (!plan) {
    throw new AppError("No active workout plan found", 404);
  }

  const days = await workoutPlanRepo.getPlanDays(plan.Id);

  for (const day of days) {
    const exercises = await workoutPlanRepo.getDayExercises(day.Id);
    day.exercises = exercises;
  }

  plan.days = days;
  return plan;
};

const activateWorkoutPlan = async (userId, planId) => {
  const plan = await workoutPlanRepo.getPlanById(planId);

  if (!plan || plan.UserId !== userId) {
    throw new AppError("Workout plan not found", 404);
  }

  if (plan.IsActive) {
    return {
      planId,
      message: "Plan already active"
    };
  }

  await workoutPlanRepo.activatePlanForUser(userId, planId);
  return { planId };
};

const deleteWorkoutPlan = async (userId, planId) => {
  const plan = await workoutPlanRepo.getPlanById(planId);

  if (!plan || plan.UserId !== userId) {
    throw new AppError("Workout plan not found", 404);
  }

  const isActive = plan.IsActive;

  await workoutPlanRepo.deletePlanExercises(planId);
  await workoutPlanRepo.deletePlanDays(planId);
  await workoutPlanRepo.deletePlan(planId);

  if (isActive) {
    const anotherPlan = await workoutPlanRepo.getAnotherUserPlan(userId, planId);

    if (anotherPlan) {
      await workoutPlanRepo.activatePlanForUser(userId, anotherPlan.Id);
    }
  }

  return { planId };
};

export default {
  createWorkoutPlan,
  getUserWorkoutPlans,
  updateWorkoutPlan,
  getActiveWorkoutPlan,
  activateWorkoutPlan,
  deleteWorkoutPlan
};