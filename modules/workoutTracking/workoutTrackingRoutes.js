const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middleware/authMiddleware');

const { getNextWorkout,
        startWorkout,
        logSet,
        getCurrentSessionDetails,
        completeWorkout,
        skipWorkout,
        getWorkoutHistory
       
    } = require('./workoutTrackingController');  




 router.get('/getNextWorkout', authMiddleware, getNextWorkout);
 router.post('/startWorkout', authMiddleware, startWorkout);
 router.post('/logSet', authMiddleware, logSet);
router.get('/getCurrentSessionDetails', authMiddleware, getCurrentSessionDetails);
router.post('/completeWorkout', authMiddleware, completeWorkout);
router.post('/skipWorkout', authMiddleware, skipWorkout);


//------------work out history function in    workoutTrackingController



router.get('/getWorkoutHistory', authMiddleware, getWorkoutHistory);


module.exports = router;