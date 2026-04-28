const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const adminMiddleware = require('../../middleware/adminMiddleware');
const { signup,
        login,
        updateProfile ,
        getProfileById ,
        getUserProfileWithDiet,
        deleteUser,
        deleteUserByAdmin,
        ActivateUserByAdmin,
        getUsersWithDiet } = require('./userController');

// POST /api/users/
router.post('/signup', signup);
router.post('/login', login);
router.put('/updateProfile', authMiddleware, updateProfile); 
router.get('/getProfileById/:id', getProfileById);

router.get('/getProfileWithDiet', authMiddleware, getUserProfileWithDiet);
router.delete('/deleteUser', authMiddleware, deleteUser);
router.delete('/deleteUserByAdmin/:id', adminMiddleware,   deleteUserByAdmin);
router.put('/ActivateUserByAdmin/:id', adminMiddleware,   ActivateUserByAdmin);

router.get('/getUsersWithDiet', adminMiddleware, getUsersWithDiet);



module.exports = router;