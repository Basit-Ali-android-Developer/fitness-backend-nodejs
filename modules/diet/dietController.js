import dietService from './dietService.js';
import asyncHandler from '../../utils/asyncHandler.js';

const createOrUpdateDietPlan = asyncHandler(async (req, res) => {
  const result = await dietService.createOrUpdateDietPlan(req.user.Id, req.body);

  res.status(200).json({
    result: "success",
    message: "Diet plan saved successfully",
    data: result
  });
});

const getDietPlan = asyncHandler(async (req, res) => {
  const result = await dietService.getDietPlan(req.user.Id);

  res.status(200).json({
    result: "success",
    message: "Diet plan fetched successfully",
    data: result
  });
});

const deleteDietPlan = asyncHandler(async (req, res) => {
  const result = await dietService.deleteDietPlan(req.user.Id);

  res.status(200).json({
    result: "success",
    message: result.message,
    data: null
  });
});

export {
  createOrUpdateDietPlan,
  getDietPlan,
  deleteDietPlan
};