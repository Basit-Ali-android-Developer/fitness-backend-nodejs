import express from 'express';
const router = express.Router();

import authMiddleware from '../../middleware/authMiddleware.js';

import { getNextWorkout,
        startWorkout,
        logSet,
        getCurrentSessionDetails,
        completeWorkout,
        skipWorkout,
        getWorkoutHistory
       
    } from './workoutTrackingController.js';  




 router.get('/getNextWorkout', authMiddleware, getNextWorkout);
 router.post('/startWorkout', authMiddleware, startWorkout);
 router.post('/logSet', authMiddleware, logSet);
router.get('/getCurrentSessionDetails', authMiddleware, getCurrentSessionDetails);
router.post('/completeWorkout', authMiddleware, completeWorkout);
router.post('/skipWorkout', authMiddleware, skipWorkout);


//------------work out history function in    workoutTrackingController



router.get('/getWorkoutHistory', authMiddleware, getWorkoutHistory);


export default router;