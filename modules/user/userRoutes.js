import express from 'express';
const router = express.Router();
import authMiddleware from '../../middleware/authMiddleware.js';
import adminMiddleware from '../../middleware/adminMiddleware.js';
import {
  signup,
  login,
  updateProfile,
  getProfileById,
  getUserProfileWithDiet,
  deleteUser,
  deleteUserByAdmin,
  ActivateUserByAdmin,
  getUsersWithDiet
} from './userController.js';

// POST /api/users/
router.post('/signup', signup);
router.post('/login', login);
router.put('/updateProfile', authMiddleware, updateProfile); 
router.get('/getProfileById/:id', getProfileById);

router.get('/getProfileWithDiet', authMiddleware, getUserProfileWithDiet);
router.delete('/deleteUser', authMiddleware, deleteUser);
router.delete('/deleteUserByAdmin/:id', adminMiddleware, deleteUserByAdmin);
router.put('/ActivateUserByAdmin/:id', adminMiddleware, ActivateUserByAdmin);

router.get('/getUsersWithDiet', adminMiddleware, getUsersWithDiet);

export default router;