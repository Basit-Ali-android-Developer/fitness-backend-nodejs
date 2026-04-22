const express = require('express');
const router = express.Router();
const { getTodaySummary, getDashboardStats } = require('./summaryController');
const authMiddleware = require('../../middleware/authMiddleware');


router.get('/getTodaySummary', authMiddleware, getTodaySummary);
router.get('/getDashboardStats', authMiddleware, getDashboardStats);







module.exports = router;