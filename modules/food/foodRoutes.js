const express = require('express');
const router = express.Router();
const { getFoods, addFood, updateFood, deleteFood, activateFood } = require('./foodController');
const authMiddleware = require('../../middleware/authMiddleware');


router.get('/getFoods', authMiddleware, getFoods);
router.post('/addFood', authMiddleware, addFood);
router.put('/updateFood/:id', authMiddleware, updateFood);
router.delete('/deleteFood/:id', authMiddleware, deleteFood);
router.put('/activateFood/:id', authMiddleware, activateFood);



module.exports = router;