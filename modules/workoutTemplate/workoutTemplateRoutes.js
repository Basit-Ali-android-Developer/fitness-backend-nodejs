const express = require('express');
const router = express.Router();
const adminMiddleware = require('../../middleware/adminMiddleware');
const { createFullWorkoutTemplateSplit,
        getAllTemplates,
        getTemplateById,
        updateWorkoutTemplateSplit,
        deleteWorkoutTemplate
        
 } = require('./workoutTemplateController');



router.post('/createFullWorkoutTemplateSplit', adminMiddleware, createFullWorkoutTemplateSplit);
router.get('/getAllTemplates', adminMiddleware, getAllTemplates);
router.get('/getTemplateById/:id', adminMiddleware, getTemplateById);
router.put('/updateWorkoutTemplateSplit/:id', adminMiddleware, updateWorkoutTemplateSplit);
router.delete('/deleteWorkoutTemplate/:id', adminMiddleware, deleteWorkoutTemplate);



module.exports = router;