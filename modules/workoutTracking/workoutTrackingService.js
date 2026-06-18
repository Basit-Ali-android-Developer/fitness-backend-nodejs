import workoutTrackingRepo from './workoutTrackingRepository.js';
import AppError from '../../utils/AppError.js';




const getNextWorkout = async (userId) => {


  const plan = await workoutTrackingRepo.getActivePlanByUser(userId);

  if (!plan) {
    throw new AppError("No active workout plan found", 404);
  }

 
  const lastSession = await workoutTrackingRepo.getLastWorkoutSession(userId, plan.Id);

  let nextDayIndex = 1;

  if (lastSession) {
    nextDayIndex = lastSession.DayIndex + 1;
  }


  if (nextDayIndex > plan.DaysCount) {
    nextDayIndex = 1;
  }


  const day = await workoutTrackingRepo.getPlanDay(plan.Id, nextDayIndex);

  if (!day) {
    return {
      plan: {
        id: plan.Id,
        name: plan.Name
      },
      nextWorkout: null
    };
  }


  const exercises = await workoutTrackingRepo.getDayExercisesWithNames(day.Id);

  return {
    plan: {
      id: plan.Id,
      name: plan.Name
    },
    nextWorkout: {
      dayIndex: nextDayIndex,
      title: day.Title,
      exercises
    }
  };
};





const startWorkout = async (userId) => {


  const plan = await workoutTrackingRepo.getActivePlanByUser(userId);

  if (!plan) {
    throw new AppError("No active workout plan found", 404);
  }

 
  const existingSession = await workoutTrackingRepo.getInProgressSession(userId, plan.Id);

  if (existingSession) {
    return {
      resume: true,
      sessionId: existingSession.Id,
      dayIndex: existingSession.DayIndex
    };
  }


  const lastSession = await workoutTrackingRepo.getLastCompletedSession(userId, plan.Id);

  let nextDayIndex = 1;

  if (lastSession) {
    nextDayIndex = lastSession.DayIndex + 1;
  }

  if (nextDayIndex > plan.DaysCount) {
    nextDayIndex = 1;
  }


  const day = await workoutTrackingRepo.getPlanDay(plan.Id, nextDayIndex);

  if (!day) {
    throw new AppError("No workout defined for this day", 400);
  }


  const sessionId = await workoutTrackingRepo.createWorkoutSession(
    userId,
    plan.Id,
    nextDayIndex
  );

  return {
    resume: false,
    sessionId,
    plan: {
      id: plan.Id,
      name: plan.Name
    },
    workout: {
      dayIndex: nextDayIndex,
      title: day.Title
    }
  };
};







const logSet = async (data) => {

  const { sessionId, exerciseId, setNumber, reps, weight } = data;

  if (!sessionId || !exerciseId || !setNumber) {
    throw new AppError("sessionId, exerciseId and setNumber are required", 400);
  }

  if (!reps || reps <= 0) {
    throw new AppError("Invalid reps", 400);
  }

  if (weight < 0) {
    throw new AppError("Weight cannot be negative", 400);
  }

  const session = await workoutTrackingRepo.getActiveSessionById(sessionId);

  if (!session) {
    throw new AppError("Invalid or inactive session", 400);
  }


  const existingSet = await workoutTrackingRepo.checkSetExists(
    sessionId,
    exerciseId,
    setNumber
  );

  if (existingSet) {
    throw new AppError("Set already logged", 400);
  }

  await workoutTrackingRepo.createSetLog({
    sessionId,
    exerciseId,
    setNumber,
    reps,
    weight
  });

  return { message: "Set logged successfully" };
};




const getCurrentSessionDetails = async (userId) => {


  const session = await workoutTrackingRepo.getActiveSessionByUser(userId);

  if (!session) {
    throw new AppError("No session in progress", 404);
  }


  const logs = await workoutTrackingRepo.getSessionLogs(session.Id);


  const exerciseMap = {};

  for (const log of logs) {
    if (!exerciseMap[log.ExerciseId]) {
      exerciseMap[log.ExerciseId] = {
        exerciseId: log.ExerciseId,
        exerciseName: log.ExerciseName,
        sets: []
      };
    }

    exerciseMap[log.ExerciseId].sets.push({
      setNumber: log.SetNumber,
      reps: log.Reps,
      weight: log.Weight
    });
  }

  const exercises = Object.values(exerciseMap);

  return {
    sessionId: session.Id,
    planId: session.PlanId,
    dayIndex: session.DayIndex,
    exercises
  };
};




const completeWorkout = async (sessionId) => {

  if (!sessionId) {
    throw new AppError("sessionId is required", 400);
  }


  const session = await workoutTrackingRepo.getSessionById(sessionId);

  if (!session || session.Status !== 'in_progress') {
    throw new AppError("Invalid session", 400);
  }

  await workoutTrackingRepo.completeSession(sessionId);

  return {
    message: "Workout completed successfully "
  };
};




const skipWorkout = async (userId) => {


  const plan = await workoutTrackingRepo.getActivePlanByUser(userId);

  if (!plan) {
    throw new AppError("No active plan", 404);
  }


  const inProgress = await workoutTrackingRepo.getInProgressSession(userId, plan.Id);

  if (inProgress) {
    throw new AppError("Cannot skip while workout is in progress", 400);
  }


  const lastSession = await workoutTrackingRepo.getLastSession(userId, plan.Id);

  let nextDayIndex = 1;

  if (lastSession) {
    nextDayIndex = lastSession.DayIndex + 1;
  }

  if (nextDayIndex > plan.DaysCount) {
    nextDayIndex = 1;
  }


  const day = await workoutTrackingRepo.getPlanDay(plan.Id, nextDayIndex);

  if (!day) {
    throw new AppError("No workout defined for next day", 400);
  }

  await workoutTrackingRepo.createSkippedSession(
    userId,
    plan.Id,
    nextDayIndex
  );

  return {
    message: "Workout skipped successfully",
    skippedDayIndex: nextDayIndex
  };
};





const getWorkoutHistory = async (userId, page = 1) => {

  const { rows, pagination } = await workoutTrackingRepo.getWorkoutHistory(userId, page);

  const sessionsMap = new Map();

  for (const row of rows) {

    if (!sessionsMap.has(row.SessionId)) {
      sessionsMap.set(row.SessionId, {
        sessionId: row.SessionId,
        status: row.Status,
        startTime: row.StartTime,
        endTime: row.EndTime,
        planName: row.PlanName,
        day: {
          dayIndex: row.DayIndex,
          title: row.DayTitle
        },
        exercisesMap: new Map()
      });
    }

    const session = sessionsMap.get(row.SessionId);

    if (row.ExerciseId) {

      if (!session.exercisesMap.has(row.ExerciseId)) {
        session.exercisesMap.set(row.ExerciseId, {
          exerciseId: row.ExerciseId,
          exerciseName: row.ExerciseName,
          sets: []
        });
      }

      const exercise = session.exercisesMap.get(row.ExerciseId);

      if (row.SetNumber !== null && row.SetNumber !== undefined) {
        exercise.sets.push({
          setNumber: row.SetNumber,
          reps: row.Reps,
          weight: row.Weight
        });
      }
    }
  }

  const data = Array.from(sessionsMap.values()).map(session => ({
    sessionId: session.sessionId,
    status: session.status,
    startTime: session.startTime,
    endTime: session.endTime,
    planName: session.planName,
    day: session.day,
    exercises: Array.from(session.exercisesMap.values())
  }));

  return { data, pagination };
};





export default {
     getNextWorkout,
     startWorkout,
     logSet,
     getCurrentSessionDetails,
     completeWorkout,
     skipWorkout,
     getWorkoutHistory
};