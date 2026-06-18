import express from 'express';
const router = express.Router();
import { 
  createWorkoutPlan,
  getUserWorkoutPlans,
  updateWorkoutPlan,
  getActiveWorkoutPlan,
  activateWorkoutPlan,
  deleteWorkoutPlan
} from './workoutPlanController.js';
import authMiddleware from '../../middleware/authMiddleware.js';

router.post('/createWorkoutPlan', authMiddleware, createWorkoutPlan);
router.get('/getUserWorkoutPlans', authMiddleware, getUserWorkoutPlans);
router.put('/updateWorkoutPlan/:id', authMiddleware, updateWorkoutPlan);
router.get('/getActiveWorkoutPlan', authMiddleware, getActiveWorkoutPlan);
router.put('/activateWorkoutPlan/:id', authMiddleware, activateWorkoutPlan);
router.delete('/deleteWorkoutPlan/:id', authMiddleware, deleteWorkoutPlan);

export default router;