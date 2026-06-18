import summaryService from './summaryService.js';
import asyncHandler from '../../utils/asyncHandler.js';

const getTodaySummary = asyncHandler(async (req, res) => {
  const result = await summaryService.getTodaySummary(req.user.Id);

  res.status(200).json({
    result: "success",
    message: "Today summary fetched successfully",
    data: result
  });
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const result = await summaryService.getDashboardStats(req.user.Id);

  res.status(200).json({
    result: "success",
    message: "Dashboard fetched successfully",
    data: result
  });
});

export { getTodaySummary, getDashboardStats };