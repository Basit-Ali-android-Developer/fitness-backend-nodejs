import express from 'express';
const router = express.Router();
import { getFoods, addFood, updateFood, deleteFood, activateFood } from './foodController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import adminMiddleware from '../../middleware/adminMiddleware.js';

router.get('/getFoods', authMiddleware, getFoods);
router.post('/addFood', adminMiddleware, addFood);
router.put('/updateFood/:id', adminMiddleware, updateFood);
router.delete('/deleteFood/:id', adminMiddleware, deleteFood);
router.put('/activateFood/:id', adminMiddleware, activateFood);

export default router;