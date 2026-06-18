import express from 'express';
const router = express.Router();
import adminMiddleware from '../../middleware/adminMiddleware.js';
import {
  createFullWorkoutTemplateSplit,
  getAllTemplates,
  getTemplateById,
  updateWorkoutTemplateSplit,
  deleteWorkoutTemplate
} from './workoutTemplateController.js';

router.post('/createFullWorkoutTemplateSplit', adminMiddleware, createFullWorkoutTemplateSplit);
router.get('/getAllTemplates', adminMiddleware, getAllTemplates);
router.get('/getTemplateById/:id', adminMiddleware, getTemplateById);
router.put('/updateWorkoutTemplateSplit/:id', adminMiddleware, updateWorkoutTemplateSplit);
router.delete('/deleteWorkoutTemplate/:id', adminMiddleware, deleteWorkoutTemplate);

export default router;