const asyncHandler = require('../../utils/asyncHandler');
const workoutPlanService = require('./workoutPlanService');






const createWorkoutPlan = asyncHandler(async (req, res) => {

  const result = await workoutPlanService.createWorkoutPlan(req.user.Id,req.body);

  res.status(200).json({
    success: true,
    message: "Workout plan created successfully",
    data: result
  });

});





const getUserWorkoutPlans = asyncHandler(async (req, res) => {

  const page = parseInt(req.query.page) || 1;

  const result = await workoutPlanService.getUserWorkoutPlans(
    req.user.Id,
    page
  );

  res.status(200).json({
    success: true,
    message: "Workout plans fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
});




const updateWorkoutPlan = asyncHandler(async (req, res) => {

  const result = await workoutPlanService.updateWorkoutPlan(
    req.user.Id,
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Workout plan updated successfully",
    data: result
  });

});




const getActiveWorkoutPlan = asyncHandler(async (req, res) => {

  const result = await workoutPlanService.getActiveWorkoutPlan(req.user.Id);

  res.status(200).json({
    success: true,
    message: "Active workout plan fetched successfully",
    data: result
  });

});



const activateWorkoutPlan = asyncHandler(async (req, res) => {

  const result = await workoutPlanService.activateWorkoutPlan(
    req.user.Id,
    req.params.id
  );

  res.status(200).json({
    success: true,
    message: result.message || "Workout plan activated successfully",
    data: result
  });

});




const deleteWorkoutPlan = asyncHandler(async (req, res) => {

  const result = await workoutPlanService.deleteWorkoutPlan(
    req.user.Id,
    req.params.id
  );

  res.status(200).json({
    success: true,
    message: "Workout plan deleted successfully",
    data: result
  });

});


module.exports = {
  createWorkoutPlan,
  getUserWorkoutPlans,
  updateWorkoutPlan,
  getActiveWorkoutPlan,
  activateWorkoutPlan,
  deleteWorkoutPlan
};