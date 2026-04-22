const express = require('express');
const router = express.Router();
const { createOrUpdateDietPlan , getDietPlan , deleteDietPlan} = require('./dietController');
const authMiddleware = require('../../middleware/authMiddleware');

// POST /api/users/
router.post('/createOrUpdateDietPlan', authMiddleware, createOrUpdateDietPlan);
router.get('/getDietPlan', authMiddleware, getDietPlan);
router.delete('/deleteDietPlan', authMiddleware, deleteDietPlan);


module.exports = router;