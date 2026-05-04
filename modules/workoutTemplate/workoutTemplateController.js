const asyncHandler = require('../../utils/asyncHandler');
const templateService = require('./workoutTemplateService');




const createFullWorkoutTemplateSplit = asyncHandler(async (req, res) => {

  const result = await templateService.createFullWorkoutTemplateSplit(req.body);

  res.status(201).json({
    success: true,
    message: "Full workout split created successfully",
    data: result
  });

});





const getAllTemplates = asyncHandler(async (req, res) => {

  const result = await templateService.getAllTemplates();

  res.status(200).json({
    success: true,
    message: "Workout templates fetched successfully",
    data: result
  });

});



const getTemplateById = asyncHandler(async (req, res) => {

  const result = await templateService.getTemplateById(req.params.id);

  res.status(200).json({
    success: true,
    message: "Workout template fetched successfully",
    data: result
  });

});




const updateWorkoutTemplateSplit = asyncHandler(async (req, res) => {

  const result = await templateService.updateWorkoutTemplateSplit(req.params.id,req.body);

  res.status(200).json({
    success: true,
    message: "Workout template updated successfully",
    data: result
  });

});



const deleteWorkoutTemplate = asyncHandler(async (req, res) => {

  const result = await templateService.deleteWorkoutTemplate(req.params.id);

  res.status(200).json({
    success: true,
    message: "Workout template deleted successfully",
    data: result
  });

});



module.exports = { 
    createFullWorkoutTemplateSplit,
    getAllTemplates,
    getTemplateById,
    updateWorkoutTemplateSplit,
    deleteWorkoutTemplate
 };