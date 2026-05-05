const asyncHandler = require('../../utils/asyncHandler');
const workoutTrackingService = require('./workoutTrackingService');





const getNextWorkout = asyncHandler(async (req, res) => {

  const result = await workoutTrackingService.getNextWorkout(req.user.Id);

  res.status(200).json({
    success: true,
    message: "Next workout fetched successfully",
    data: result
  });

});




const startWorkout = asyncHandler(async (req, res) => {

  const result = await workoutTrackingService.startWorkout(req.user.Id);

  res.status(200).json({
    success: true,
    message: result.resume
      ? "Resuming existing workout"
      : "Workout started successfully",
    data: result
  });

});




const logSet = asyncHandler(async (req, res) => {

  const result = await workoutTrackingService.logSet(req.body);

  res.status(200).json({
    success: true,
    message: result.message
  });

});




const getCurrentSessionDetails = asyncHandler(async (req, res) => {

  const result = await workoutTrackingService.getCurrentSessionDetails(req.user.Id);

  res.status(200).json({
    success: true,
    message: "Current session fetched successfully",
    data: result
  });

});



const completeWorkout = asyncHandler(async (req, res) => {

  const result = await workoutTrackingService.completeWorkout(req.body.sessionId);

  res.status(200).json({
    success: true,
    message: result.message
  });

});




const skipWorkout = asyncHandler(async (req, res) => {

  const result = await workoutTrackingService.skipWorkout(req.user.Id);

  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      skippedDayIndex: result.skippedDayIndex
    }
  });

});




const getWorkoutHistory = asyncHandler(async (req, res) => {

  const result = await workoutTrackingService.getWorkoutHistory(req.user.Id);

  res.status(200).json({
    success: true,
    message: "Workout history fetched successfully",
    data: result
  });

});




module.exports = {
  getNextWorkout,
  startWorkout,
  logSet,
  getCurrentSessionDetails,
  completeWorkout,
  skipWorkout,
  getWorkoutHistory
};