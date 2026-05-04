const express = require('express');
const router = express.Router();

// const { getAllTemplateWorkoutSplits,
//         getWorkoutTemplateSplitById,
//         createFullWorkoutTemplateSplit,
//         updateWorkoutTemplateSplit,
//         deleteWorkoutSplitTemplate  
//     } = require('./workoutTemplateController');

const { createWorkoutPlan,
        getUserWorkoutPlans,
        updateWorkoutPlan,
        activateWorkoutPlan,
        deleteWorkoutPlan
    } = require('./workoutPlanController');    

const authMiddleware = require('../../middleware/authMiddleware');

const { getNextWorkout,
        startWorkout,
        logSet,
        completeWorkout,
        skipWorkout,
        getWorkoutHistory
    } = require('./workoutTrackingController');  




//------------work out template function in    workoutTemplateController

// router.get('/getAllTemplateWorkoutSplits', authMiddleware, getAllTemplateWorkoutSplits);
// router.get('/getWorkoutTemplateSplitById/:id', authMiddleware, getWorkoutTemplateSplitById);
// router.post('/createFullWorkoutTemplateSplit', authMiddleware, createFullWorkoutTemplateSplit);
// router.put('/updateWorkoutTemplateSplit/:id', authMiddleware, updateWorkoutTemplateSplit);
// router.delete('/deleteWorkoutSplitTemplate/:id', authMiddleware, deleteWorkoutSplitTemplate);


//------------work out Plan function in    workoutPlanController

router.post('/createWorkoutPlan', authMiddleware, createWorkoutPlan);
router.get('/getUserWorkoutPlans', authMiddleware, getUserWorkoutPlans);
router.put('/updateWorkoutPlan/:id', authMiddleware, updateWorkoutPlan);
router.put('/activateWorkoutPlan/:id', authMiddleware, activateWorkoutPlan);
router.delete('/deleteWorkoutPlan/:id', authMiddleware, deleteWorkoutPlan);


//------------work out tracking function in    workoutTrackingController

router.get('/getNextWorkout', authMiddleware, getNextWorkout);
router.post('/startWorkout', authMiddleware, startWorkout);
router.post('/logSet', authMiddleware, logSet);
router.post('/completeWorkout', authMiddleware, completeWorkout);
router.post('/skipWorkout', authMiddleware, skipWorkout);


//------------work out history function in    workoutTrackingController



router.get('/getWorkoutHistory', authMiddleware, getWorkoutHistory);


module.exports = router;