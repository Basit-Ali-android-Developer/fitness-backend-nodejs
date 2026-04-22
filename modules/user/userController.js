const { sql, poolPromise } = require('../../db/connection');
const bcrypt = require('bcryptjs');
const Joi = require('joi'); // For validation
const jwt = require('jsonwebtoken');
const JWT_SECRET = "YOUR_SECRET_KEY_HERE";


// --------------------- Sign up Validation Schema ---------------------

const signupSchema = Joi.object({
  name: Joi.string()
    .pattern(/^[A-Za-z][A-Za-z\s'-]*$/)
    .min(2)
    .max(50)
    .required()
    .messages({
      "string.empty": "Name is required",
      "string.pattern.base": "Name must start with a letter and contain only letters, spaces, hyphens, or apostrophes",
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 50 characters"
    }),
  
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(100)
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Email must be valid",
      "string.max": "Email cannot exceed 100 characters"
    }),
  
  password: Joi.string()
    .min(6)
    .max(255)
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 6 characters",
      "string.max": "Password cannot exceed 255 characters"
    }),

  age: Joi.number().integer().positive().optional().messages({
    "number.base": "Age must be a number",
    "number.positive": "Age must be positive",
    "number.integer": "Age must be an integer"
  }),

  gender: Joi.string().valid('Male', 'Female', 'Other').optional()
    .messages({
      "any.only": "Gender must be 'Male', 'Female', or 'Other'"
    }),

  height: Joi.number().positive().optional().messages({
    "number.base": "Height must be a number",
    "number.positive": "Height must be positive"
  }),

  weight: Joi.number().positive().optional().messages({
    "number.base": "Weight must be a number",
    "number.positive": "Weight must be positive"
  })
});

// --------------------- Sign up Function ---------------------
const signup = async (req, res) => {
  try {
    // 1️⃣ Validate request body
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        result: "error",
        message: error.details[0].message,
        data: null
      });
    }

    const { name, email, password, age, gender, height, weight } = value;
    const pool = await poolPromise;

    // 2️⃣ Check if user already exists
    const existingUser = await pool
      .request()
      .input('Email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE Email = @Email');

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({
        result: "error",
        message: "The email has already been taken.",
        data: null
      });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Determine if profile is complete
    const isProfileComplete = (height && weight && age && gender) ? 1 : 0;

    // 5️⃣ Insert new user
    const insertResult = await pool
      .request()
      .input('Name', sql.NVarChar, name)
      .input('Email', sql.NVarChar, email)
      .input('Password', sql.NVarChar, hashedPassword)
      .input('UserType', sql.NVarChar, 'User') // default
      .input('Height', sql.Float, height || null)
      .input('Weight', sql.Float, weight || null)
      .input('Age', sql.Int, age || null)
      .input('Gender', sql.NVarChar, gender || null)
      .input('IsProfileComplete', sql.Bit, isProfileComplete)
      .query(`
        INSERT INTO Users (Name, Email, Password, UserType, Height, Weight, Age, Gender, IsProfileComplete, CreatedAt, UpdatedAt)
        OUTPUT inserted.*
        VALUES (@Name, @Email, @Password, @UserType, @Height, @Weight, @Age, @Gender, @IsProfileComplete, GETDATE(), GETDATE())
      `);

    const newUser = insertResult.recordset[0];

    // 6️⃣ Send standardized response
    return res.status(201).json({
      result: "success",
      message: "Account created successfully",
      data: {
        id: newUser.Id,
        name: newUser.Name,
        email: newUser.Email,
        usertype: newUser.UserType,
        height: newUser.Height,
        weight: newUser.Weight,
        age: newUser.Age,
        gender: newUser.Gender,
        is_profile_complete: newUser.IsProfileComplete,
        created_at: newUser.CreatedAt,
        updated_at: newUser.UpdatedAt
      },
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};







// login Validation schema
const loginSchema = Joi.object({
  email: Joi.string().email().max(100).required(),
  password: Joi.string().min(6).max(255).required()
});

// --------login function
const login = async (req, res) => {
  try {
    // 1️⃣ Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        result: "error",
        message: error.details[0].message,
        data: null
      });
    }

    const { email, password } = value;
    const pool = await poolPromise;

    // 2️⃣ Check if user exists
    const userResult = await pool
      .request()
      .input('Email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE Email = @Email');

    if (userResult.recordset.length === 0) {
      return res.status(400).json({
        result: "error",
        message: "Invalid Credientials",
        data: null
      });
    }

    const user = userResult.recordset[0];

    // 3️⃣ Compare password
    const validPassword = await bcrypt.compare(password, user.Password);
    if (!validPassword) {
      return res.status(400).json({
        result: "error",
        message: "Invalid Credentials",
        data: null
      });
    }

    // 4️⃣ Generate JWT token
    const token = jwt.sign(
      { id: user.Id,
        email: user.Email,
        userType: user.UserType,
        height: user.Height,
        weight: user.Weight,
        age: user.Age,
        gender: user.Gender,
        isProfileComplete: user.IsProfileComplete},
      "YOUR_SECRET_KEY_HERE", // replace with a secure key from .env
      { expiresIn: "7d" }
    );

    // 5️⃣ Prepare response user object
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

    // 6️⃣ Send standardized response
    return res.status(200).json({
      result: "success",
      message: "Login Successfully",
      data: responseUser,
      token: token
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};





// Validation schema for update (all fields optional)
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().max(100).optional(),
  age: Joi.number().integer().positive().optional(),
  gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
  height: Joi.number().positive().optional(),
  weight: Joi.number().positive().optional()
});

// -----------Update Profile Function (using authMiddleware)
const updateProfile = async (req, res) => {
  try {
    // ✅ Get userId from authMiddleware
    const userId = req.user.id;

    // 1️⃣ Validate request body
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        result: "error",
        message: error.details[0].message,
        data: null
      });
    }

    const { name, email, age, gender, height, weight } = value;
    const pool = await poolPromise;

    // 2️⃣ Check if email already exists (if user wants to update email)
    if (email) {
      const emailCheck = await pool
        .request()
        .input('Email', sql.NVarChar, email)
        .input('UserId', sql.Int, userId)
        .query('SELECT * FROM Users WHERE Email = @Email AND Id <> @UserId');

      if (emailCheck.recordset.length > 0) {
        return res.status(400).json({
          result: "error",
          message: "Email not available.",
          data: null
        });
      }
    }

    // 3️⃣ Build dynamic UPDATE query for only provided fields
    let updateFields = [];
    if (name) updateFields.push('Name = @Name');
    if (email) updateFields.push('Email = @Email');
    if (age !== undefined) updateFields.push('Age = @Age');
    if (gender) updateFields.push('Gender = @Gender');
    if (height !== undefined) updateFields.push('Height = @Height');
    if (weight !== undefined) updateFields.push('Weight = @Weight');

    if (updateFields.length === 0) {
      return res.status(400).json({
        result: "error",
        message: "No fields provided to update.",
        data: null
      });
    }

    const request = pool.request().input('UserId', sql.Int, userId);
    if (name) request.input('Name', sql.NVarChar, name);
    if (email) request.input('Email', sql.NVarChar, email);
    if (age !== undefined) request.input('Age', sql.Int, age);
    if (gender) request.input('Gender', sql.NVarChar, gender);
    if (height !== undefined) request.input('Height', sql.Float, height);
    if (weight !== undefined) request.input('Weight', sql.Float, weight);

    // 4️⃣ Determine if profile is complete after update
    const userDataQuery = await pool
      .request()
      .input('UserId', sql.Int, userId)
      .query('SELECT * FROM Users WHERE Id = @UserId');
    const userData = userDataQuery.recordset[0];

    const newProfileComplete = (
      (name || userData.Name) &&
      (email || userData.Email) &&
      (age !== undefined ? age : userData.Age) &&
      (gender || userData.Gender) &&
      (height !== undefined ? height : userData.Height) &&
      (weight !== undefined ? weight : userData.Weight)
    ) ? 1 : 0;

    updateFields.push('IsProfileComplete = @IsProfileComplete');
    request.input('IsProfileComplete', sql.Bit, newProfileComplete);

    const query = `
      UPDATE Users
      SET ${updateFields.join(', ')}, UpdatedAt = GETDATE()
      OUTPUT inserted.*
      WHERE Id = @UserId
    `;

    const result = await request.query(query);
    const updatedUser = result.recordset[0];

    // 5️⃣ Return full updated user profile
    return res.status(200).json({
      result: "success",
      message: "Profile updated successfully",
      data: {
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
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};




// -----------Get Profile By ID
const getProfileById = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // 1️⃣ Validate ID
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        result: "error",
        message: "Invalid user ID",
        data: null
      });
    }

    const pool = await poolPromise;

    // 2️⃣ Fetch user
    const userResult = await pool
      .request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT Id, Name, Email, UserType,Age,Gender, Height, Weight,IsProfileComplete, CreatedAt, UpdatedAt
        FROM Users
        WHERE Id = @UserId
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        result: "error",
        message: "User not found",
        data: null
      });
    }

    const user = userResult.recordset[0];

    // 3️⃣ Response (same format as login)
    return res.status(200).json({
      result: "success",
      message: "Profile fetched successfully",
      data: {
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
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};



// ----------------- Get User Profile + Diet Plan -----------------
const getUserProfileWithDiet = async (req, res) => {
  try {
    // ✅ Get userId from authMiddleware
    const userId = req.user.id;

    // 1️⃣ Fetch user data
    const pool = await poolPromise;

    const userResult = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT Id, Name, Email, Age, Gender, Height, Weight, IsProfileComplete
        FROM Users
        WHERE Id = @UserId
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        result: "error",
        message: "User not found",
        data: null
      });
    }

    const user = userResult.recordset[0];

    // 2️⃣ Fetch diet plan
    const dietResult = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT GoalType, TargetWeight, BMR, MaintenanceCalories, TargetCalories, ActivityLevel, CreatedAt, UpdatedAt
        FROM UserDietPlans
        WHERE UserId = @UserId
      `);

    const dietPlan = dietResult.recordset.length > 0 ? dietResult.recordset[0] : null;

    // 3️⃣ Return combined response
    return res.status(200).json({
      result: "success",
      message: "User profile fetched successfully",
      data: {
        user,
        dietPlan
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "error",
      message: "Server error",
      data: null
    });
  }
};




module.exports = { signup , login , updateProfile , getProfileById , getUserProfileWithDiet};