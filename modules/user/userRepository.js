import { sql, poolPromise } from '../../db/connection.js';

const findByEmail = async (email) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('Email', sql.NVarChar, email)
    .query('SELECT * FROM Users WHERE Email = @Email AND IsDeleted = 0');

  return result.recordset[0];
};

const createUser = async (user) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('Name', sql.NVarChar, user.name)
    .input('Email', sql.NVarChar, user.email)
    .input('Password', sql.NVarChar, user.password)
    .input('UserType', sql.NVarChar, 'User')
    .input('Height', sql.Float, user.height || null)
    .input('Weight', sql.Float, user.weight || null)
    .input('Age', sql.Int, user.age || null)
    .input('Gender', sql.NVarChar, user.gender || null)
    .input('IsProfileComplete', sql.Bit, user.isProfileComplete)
    .input('IsDeleted', sql.Bit, user.isDeleted)
    .query(`
      INSERT INTO Users 
      (Name, Email, Password, UserType, Height, Weight, Age, Gender, IsProfileComplete,IsDeleted, CreatedAt, UpdatedAt)
      OUTPUT inserted.*
      VALUES 
      (@Name, @Email, @Password, @UserType, @Height, @Weight, @Age, @Gender, @IsProfileComplete, @IsDeleted, GETDATE(), GETDATE())
    `);

  return result.recordset[0];
};

const findByEmailExcludeUser = async (email, userId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('Email', sql.NVarChar, email)
    .input('UserId', sql.Int, userId)
    .query(`
      SELECT * FROM Users
      WHERE Email = @Email AND Id <> @UserId
    `);

  return result.recordset[0];
};

const updateUser = async (userId, data) => {
  const pool = await poolPromise;

  const request = pool.request().input('UserId', sql.Int, userId);

  let updates = [];

  if (data.height !== undefined) {
    request.input('Height', sql.Float, data.height);
    updates.push("Height = @Height");
  }

  if (data.weight !== undefined) {
    request.input('Weight', sql.Float, data.weight);
    updates.push("Weight = @Weight");
  }

  if (data.age !== undefined) {
    request.input('Age', sql.Int, data.age);
    updates.push("Age = @Age");
  }

  if (data.gender) {
    request.input('Gender', sql.NVarChar, data.gender);
    updates.push("Gender = @Gender");
  }

  request.input('IsProfileComplete', sql.Bit, data.isProfileComplete);
  updates.push("IsProfileComplete = @IsProfileComplete");

  const query = `
    UPDATE Users
    SET ${updates.join(', ')}, UpdatedAt = GETDATE()
    OUTPUT inserted.*
    WHERE Id = @UserId AND IsDeleted = 0
  `;

  const result = await request.query(query);

  return result.recordset[0]; // may be undefined
};

const getById = async (userId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('UserId', sql.Int, userId)
    .query(`
      SELECT Id, Name, Email, UserType, Age, Gender, Height, Weight, IsProfileComplete, CreatedAt, UpdatedAt , IsDeleted , DeletedAt
      FROM Users
      WHERE Id = @UserId
    `);

  return result.recordset[0];
};

const getFullUserById = async (userId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('UserId', sql.Int, userId)
    .query(`
      SELECT *
      FROM Users
      WHERE Id = @UserId
    `);

  return result.recordset[0];
};

const getDietByUserId = async (userId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('UserId', sql.Int, userId)
    .query(`
      SELECT GoalType, TargetWeight, BMR, MaintenanceCalories, TargetCalories, ActivityLevel, CreatedAt, UpdatedAt
      FROM UserDietPlans
      WHERE UserId = @UserId
    `);

  return result.recordset[0];
};

const deleteUser = async (userId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('UserId', sql.Int, userId)
    .query(`
      UPDATE Users
      SET IsDeleted = 1,
          DeletedAt = GETDATE(),
          UpdatedAt = GETDATE()
      WHERE Id = @UserId AND IsDeleted = 0
    `);

  return result.rowsAffected[0]; // number of affected rows
};

const ActivateUser = async (userId) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('UserId', sql.Int, userId)
    .query(`
      UPDATE Users
      SET IsDeleted = 0,
          DeletedAt = NULL,
          UpdatedAt = GETDATE()
      WHERE Id = @UserId AND IsDeleted = 1
    `);

  return result.rowsAffected[0]; 
};

const getUsersWithDiet = async (offset, limit) => {
  const pool = await poolPromise;

  const dataResult = await pool.request()
    .input('offset', sql.Int, offset)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT 
        u.Id,
        u.Name,
        u.Email,
        u.UserType,
        u.IsDeleted,
        d.GoalType,
        d.TargetWeight,
        d.BMR,
        d.MaintenanceCalories,
        d.TargetCalories,
        d.ActivityLevel,
        d.CreatedAt AS DietCreatedAt,
        d.UpdatedAt AS DietUpdatedAt
      FROM Users u
      LEFT JOIN UserDietPlans d 
        ON u.Id = d.UserId
      WHERE u.IsDeleted = 0
        AND u.UserType != 'Admin'
      ORDER BY u.Id
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

  const countResult = await pool.request().query(`
    SELECT COUNT(*) AS total
    FROM Users u
    WHERE u.IsDeleted = 0
      AND u.UserType != 'Admin'
  `);

  return {
    rows: dataResult.recordset,
    total: countResult.recordset[0].total
  };
};

export default {
  findByEmail,
  createUser,
  findByEmailExcludeUser,
  getById,
  getDietByUserId,
  deleteUser,
  updateUser,
  getFullUserById,
  ActivateUser,
  getUsersWithDiet
};