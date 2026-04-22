const express = require('express');
const router = express.Router();
const { createMeal, getUserMeals, getMealById, updateMeal, deleteMeal, getTodayMeals, markMealDone, getMealHistory } = require('./mealController');
const authMiddleware = require('../../middleware/authMiddleware');

// meal api for meal controller to controll data in backend
router.post('/createMeal', authMiddleware, createMeal);
router.get('/getUserMeals', authMiddleware, getUserMeals);
router.get('/getMealById/:id', authMiddleware, getMealById);
router.put('/updateMeal/:id', authMiddleware, updateMeal);
router.delete('/deleteMeal/:id', authMiddleware, deleteMeal);

router.get('/getTodayMeals', authMiddleware, getTodayMeals);
router.put("/markMealDone/:id", authMiddleware, markMealDone);
router.get('/getMealHistory', authMiddleware, getMealHistory);






module.exports = router;