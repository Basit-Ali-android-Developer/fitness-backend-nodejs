import express from 'express';
const router = express.Router();
import { 
  createMeal, 
  getUserMeals, 
  getMealById, 
  updateMeal, 
  deleteMeal, 
  getTodayMeals, 
  markMealDone, 
  getMealHistory 
} from './mealController.js';
import authMiddleware from '../../middleware/authMiddleware.js';

// meal api for meal controller to control data in backend
router.post('/createMeal', authMiddleware, createMeal);
router.get('/getUserMeals', authMiddleware, getUserMeals);
router.get('/getMealById/:id', authMiddleware, getMealById);
router.put('/updateMeal/:id', authMiddleware, updateMeal);
router.delete('/deleteMeal/:id', authMiddleware, deleteMeal);

router.get('/getTodayMeals', authMiddleware, getTodayMeals);
router.put("/markMealDone/:id", authMiddleware, markMealDone);
router.get('/getMealHistory', authMiddleware, getMealHistory);

export default router;