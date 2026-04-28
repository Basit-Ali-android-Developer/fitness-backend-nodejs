require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('./userRepository');
const Joi = require('joi');

const JWT_SECRET = process.env.JWT_SECRET;

const AppError = require('../../utils/AppError');








const signup = async (data) => {

  
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });

  const { error, value } = schema.validate(data);


   if (error) {
    throw new AppError(error.details[0].message.replace(/"/g, ''), 400);
  }


  // check user
  const existingUser = await userRepository.findByEmail(value.email);


  if (existingUser) {
    throw new AppError("Email already exists", 409);
  }

  // hash password
  const hashedPassword = await bcrypt.hash(value.password, 10);


  // create user
  const user = await userRepository.createUser({
    ...value,
    password: hashedPassword,
    isProfileComplete: 0,
    isDeleted: 0
  });

  return user;
};








const login = async (data) => {

  const { email, password } = data;


  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }


  const user = await userRepository.findByEmail(email);

 
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }


  const isMatch = await bcrypt.compare(password, user.Password);

  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }


  const token = jwt.sign(
    {
      id: user.Id,
      email: user.Email,
      userType: user.UserType
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );


  const responseUser = {
    id: user.Id,
    name: user.Name,
    email: user.Email,
    usertype: user.UserType,
    height: user.Height,
    weight: user.Weight,
    age: user.Age,
    gender: user.Gender,
    is_profile_complete: user.IsProfileComplete,
    created_at: user.CreatedAt,
    updated_at: user.UpdatedAt
  };

  return {
    user: responseUser,
    token
  };
};






const updateProfileSchema = Joi.object({
  height: Joi.number().positive().required()
    .messages({
      "any.required": "height is required",
      "number.base": "height must be a number",
      "number.positive": "height must be greater than 0"
    }),

  weight: Joi.number().positive().required()
    .messages({
      "any.required": "weight is required",
      "number.base": "weight must be a number",
      "number.positive": "weight must be greater than 0"
    }),

  age: Joi.number().integer().min(1).required()
    .messages({
      "any.required": "age is required",
      "number.base": "age must be a number",
      "number.min": "age must be greater than 0"
    }),

  gender: Joi.string().valid('Male', 'Female', 'Other').required()
    .messages({
      "any.required": "gender is required",
      "any.only": "gender must be Male, Female or Other"
    })
});




const updateProfile = async (user, data) => {

  const { error, value } = updateProfileSchema.validate(data, {
    abortEarly: true
  });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const updatedUser = await userRepository.updateUser(user.Id, {
    height: value.height,
    weight: value.weight,
    age: value.age,
    gender: value.gender,
    isProfileComplete: 1
  });

  // if (!updatedUser) {
  //   throw new AppError("User not found or deleted", 404);
  // }

  return {
    id: updatedUser.Id,
    name: updatedUser.Name,
    email: updatedUser.Email,
    usertype: updatedUser.UserType,
    age: updatedUser.Age,
    gender: updatedUser.Gender,
    height: updatedUser.Height,
    weight: updatedUser.Weight,
    is_profile_complete: updatedUser.IsProfileComplete,
    created_at: updatedUser.CreatedAt,
    updated_at: updatedUser.UpdatedAt
  };
};





const getProfileById = async (id) => {

  const userId = parseInt(id);

  if (!userId || isNaN(userId)) {
   throw new AppError("Invalid user ID", 404);
  }

  const user = await userRepository.getFullUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user.Id,
    name: user.Name,
    email: user.Email,
    usertype: user.UserType,
    age: user.Age,
    gender: user.Gender,
    height: user.Height,
    weight: user.Weight,
    isProfileComplete: user.IsProfileComplete,
    isDeleted: user.IsDeleted,
    DeletedAt: user.DeletedAt,
    created_at: user.CreatedAt,
    updated_at: user.UpdatedAt
  };
};






const getUserProfileWithDiet = async (userId) => {

  const user = await userRepository.getById(userId);
  

  const dietPlan = await userRepository.getDietByUserId(userId);

  return {
    user: {
      id: user.Id,
      name: user.Name,
      email: user.Email,
      age: user.Age,
      gender: user.Gender,
      height: user.Height,
      weight: user.Weight,
      isProfileComplete: user.IsProfileComplete
    },
    dietPlan: dietPlan || null
  };
};








const deleteUser = async (userId) => {

  const user = await userRepository.getById(userId);

  if (!user) {
  throw new AppError("User not found", 404);
   }

if (user.IsDeleted === true) {
  throw new AppError("User already deleted", 400);
   }

  await userRepository.deleteUser(userId);

  return {
    message: "User deleted successfully"
  };
};






const deleteUserByAdmin = async (userId) => {

  const id = parseInt(userId);

  if (!id || isNaN(id)) {
    throw new AppError("Invalid user ID", 404);
  }

  const user = await userRepository.getById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  console.log(" USER FROM DB:", user);

  if (Number(user.IsDeleted) === 1) {
    throw new AppError("User already deleted", 404);
  }

  await userRepository.deleteUser(id);

  return {
    message: "User deleted by admin successfully"
  };
};





const ActivateUserByAdmin = async (userId) => {

  const id = parseInt(userId);

  if (!id || isNaN(id)) {
    throw new AppError("Invalid user ID", 404);
  }

  const user = await userRepository.getById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  console.log(" USER FROM DB:", user);

  if (Number(user.IsDeleted) === 0) {
    throw new AppError("User already Active", 404);
  }

  await userRepository.ActivateUser(id);

  return {
    message: "User activated by admin successfully"
  };
};



const getUsersWithDiet = async (page) => {

  const limit = 10; 
  const offset = (page - 1) * limit;

  const { rows, total } = await userRepository.getUsersWithDiet(offset, limit);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total
    }
  };
};


module.exports = { signup, login, updateProfile , getProfileById, getUserProfileWithDiet, deleteUser, deleteUserByAdmin, ActivateUserByAdmin, getUsersWithDiet};