const express = require('express');
const router = express.Router();


const { createWorkoutPlan,
        getUserWorkoutPlans,
        updateWorkoutPlan,
        getActiveWorkoutPlan,
        activateWorkoutPlan,
        deleteWorkoutPlan
        
    
    } = require('./workoutPlanController');    

const authMiddleware = require('../../middleware/authMiddleware');
 






router.post('/createWorkoutPlan', authMiddleware, createWorkoutPlan);
router.get('/getUserWorkoutPlans', authMiddleware, getUserWorkoutPlans);
router.put('/updateWorkoutPlan/:id', authMiddleware, updateWorkoutPlan);
router.get('/getActiveWorkoutPlan', authMiddleware, getActiveWorkoutPlan);

router.put('/activateWorkoutPlan/:id', authMiddleware, activateWorkoutPlan);
router.delete('/deleteWorkoutPlan/:id', authMiddleware, deleteWorkoutPlan);








module.exports = router;