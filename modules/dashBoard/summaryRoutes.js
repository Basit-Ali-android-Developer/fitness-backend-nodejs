import express from 'express';
const router = express.Router();
import { getTodaySummary, getDashboardStats } from './summaryController.js';
import authMiddleware from '../../middleware/authMiddleware.js';

router.get('/getTodaySummary', authMiddleware, getTodaySummary);
router.get('/getDashboardStats', authMiddleware, getDashboardStats);

export default router;