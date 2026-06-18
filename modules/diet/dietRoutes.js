import express from 'express';
const router = express.Router();
import { createOrUpdateDietPlan, getDietPlan, deleteDietPlan } from './dietController.js';
import authMiddleware from '../../middleware/authMiddleware.js';

// POST /api/users/
router.post('/createOrUpdateDietPlan', authMiddleware, createOrUpdateDietPlan);
router.get('/getDietPlan', authMiddleware, getDietPlan);
router.delete('/deleteDietPlan', authMiddleware, deleteDietPlan);

export default router;