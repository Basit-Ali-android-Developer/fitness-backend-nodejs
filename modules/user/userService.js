require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('./userRepository');
const Joi = require('joi');

const JWT_SECRET = process.env.JWT_SECRET;








const signup = async (data) => {

  
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });

  const { error, value } = schema.validate(data);
  if (error) throw new Error(error.details[0].message.replace(/"/g, ''));

  // check user
  const existingUser = await userRepository.findByEmail(value.email);
  if (existingUser) throw new Error("Email already exists");

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

  // 1️⃣ Check user exists
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  // 2️⃣ Check password
  const isMatch = await bcrypt.compare(password, user.Password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  // 3️⃣ Generate JWT token
  const token = jwt.sign(
    {
      id: user.Id,
      email: user.Email,
      userType: user.UserType
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  // 4️⃣ Return clean user object
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



// ------------------- SERVICE -------------------
const updateProfile = async (userId, data) => {

  // 1️⃣ validate input (STRICT)
  const { error, value } = updateProfileSchema.validate(data, {
    abortEarly: true
  });

  if (error) {
    throw new Error(error.details[0].message);
  }

  // 2️⃣ get user
  const user = await userRepository.getById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // 3️⃣ block deleted user
  if (user.IsDeleted) {
    throw new Error("Account is deactivated");
  }

  // 4️⃣ update DB
  const updatedUser = await userRepository.updateUser(userId, {
    height: value.height,
    weight: value.weight,
    age: value.age,
    gender: value.gender,
    isProfileComplete: 1
  });

  // 5️⃣ return FULL SAFE USER PROFILE
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

  // 1️⃣ validate id
  const userId = parseInt(id);

  if (!userId || isNaN(userId)) {
    throw new Error("Invalid user ID");
  }

  // 2️⃣ fetch user
  const user = await userRepository.getById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // 3️⃣ return formatted response
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
    created_at: user.CreatedAt,
    updated_at: user.UpdatedAt
  };
};





const getUserProfileWithDiet = async (userId) => {

  // 1️⃣ fetch user
  const user = await userRepository.getById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // 2️⃣ fetch diet plan
  const dietPlan = await userRepository.getDietByUserId(userId);

  // 3️⃣ return combined response
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
    throw new Error("User not found");
  }

  if (user.IsDeleted) {
    throw new Error("User already deleted");
  }

  await userRepository.deleteUser(userId);

  return {
    message: "User deleted successfully"
  };
};


const deleteUserByAdmin = async (userId) => {

  const id = parseInt(userId);

  if (!id || isNaN(id)) {
    throw new Error("Invalid user ID");
  }

  const user = await userRepository.getById(id);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.IsDeleted) {
    throw new Error("User already deleted");
  }

  await userRepository.deleteUser(id);

  return {
    message: "User deleted by admin successfully"
  };
};


module.exports = { signup, login, updateProfile , getProfileById, getUserProfileWithDiet, deleteUser, deleteUserByAdmin};