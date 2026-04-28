const express = require('express');
const router = express.Router();
const { getFoods, addFood, updateFood, deleteFood, activateFood } = require('./foodController');
const authMiddleware = require('../../middleware/authMiddleware');
const adminMiddleware = require('../../middleware/adminMiddleware');


router.get('/getFoods', authMiddleware, getFoods);
router.post('/addFood', adminMiddleware, addFood);
router.put('/updateFood/:id', adminMiddleware, updateFood);
router.delete('/deleteFood/:id', adminMiddleware, deleteFood);
router.put('/activateFood/:id', adminMiddleware, activateFood);



module.exports = router;