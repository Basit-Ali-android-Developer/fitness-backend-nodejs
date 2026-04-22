const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const { signup, login, updateProfile , getProfileById , getUserProfileWithDiet } = require('./userController');

// POST /api/users/
router.post('/signup', signup);
router.post('/login', login);
router.put('/updateProfile', authMiddleware, updateProfile); 
router.get('/getProfile/:id', getProfileById);
router.get('/getProfileWithDiet', authMiddleware, getUserProfileWithDiet);



module.exports = router;