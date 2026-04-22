const { sql, poolPromise } = require('../../db/connection');
const Joi = require('joi');


const getFoods = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        Id,
        Name,
        Calories,
        Protein,
        Carbs,
        Fats,
        Unit
      FROM Foods
      WHERE IsActive = 1
      ORDER BY Name ASC
    `);

    const foods = result.recordset;

    // =========================
    // EMPTY CHECK
    // =========================
    if (!foods || foods.length === 0) {
      return res.status(200).json({
        result: "success",
        message: "No foods available",
        data: []
      });
    }

    return res.status(200).json({
      result: "success",
      message: "Foods fetched successfully",
      data: foods
    });

  } catch (error) {
    console.error("Error fetching foods:", error);

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};






const addFood = async (req, res) => {
  try {
    const { name, calories, protein, carbs, fats, unit } = req.body;

    // =========================
    // 1. BASIC VALIDATION
    // =========================
    if (!name || name.trim() === "") {
      return res.status(400).json({
        result: "error",
        message: "Food name is required"
      });
    }

    // =========================
    // 2. NUMERIC VALIDATION
    // =========================
    const fields = { calories, protein, carbs, fats };

    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined || value === "") {
        return res.status(400).json({
          result: "error",
          message: `${key} is required`
        });
      }

      if (isNaN(value)) {
        return res.status(400).json({
          result: "error",
          message: `${key} must be a number`
        });
      }

      if (Number(value) < 0) {
        return res.status(400).json({
          result: "error",
          message: `${key} cannot be negative`
        });
      }
    }

    // (optional based on your rule)
    if (
      Number(calories) === 0 &&
      Number(protein) === 0 &&
      Number(carbs) === 0 &&
      Number(fats) === 0
    ) {
      return res.status(400).json({
        result: "error",
        message: "Food cannot have all zero nutritional values"
      });
    }

    const pool = await poolPromise;

    await pool.request()
      .input("name", name.trim())
      .input("calories", Number(calories))
      .input("protein", Number(protein))
      .input("carbs", Number(carbs))
      .input("fats", Number(fats))
      .input("unit", unit || "g")
      .input("isActive", 1)
      .query(`
        INSERT INTO Foods
        (Name, Calories, Protein, Carbs, Fats, Unit, IsActive, CreatedAt, UpdatedAt)
        VALUES
        (@name, @calories, @protein, @carbs, @fats, @unit, @isActive, GETDATE(), GETDATE())
      `);

    return res.status(201).json({
      result: "success",
      message: "Food added successfully"
    });

  } catch (error) {
    console.error(error);

    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({
        result: "error",
        message: "Food already exists"
      });
    }

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};






const updateFood = async (req, res) => {
  try {
    const foodId = req.params.id;
    const { name, calories, protein, carbs, fats, unit } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        result: "error",
        message: "Food name is required"
      });
    }

    const pool = await poolPromise;

    // =========================
    // 1. CHECK DUPLICATE NAME
    // (exclude current food id)
    // =========================
    const existingFood = await pool.request()
      .input("name", name.trim())
      .input("id", foodId)
      .query(`
        SELECT Id 
        FROM Foods 
        WHERE Name = @name AND Id <> @id AND IsActive = 1
      `);

    if (existingFood.recordset.length > 0) {
      return res.status(409).json({
        result: "error",
        message: "Food already exists"
      });
    }

    // =========================
    // 2. VALIDATION (NUMBERS)
    // =========================
    const fields = { calories, protein, carbs, fats };

    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined || value === "") {
        return res.status(400).json({
          result: "error",
          message: `${key} is required`
        });
      }

      if (isNaN(value)) {
        return res.status(400).json({
          result: "error",
          message: `${key} must be a number`
        });
      }

      if (Number(value) < 0) {
        return res.status(400).json({
          result: "error",
          message: `${key} cannot be negative`
        });
      }
    }

    // =========================
    // 3. UPDATE FOOD
    // =========================
    await pool.request()
      .input("id", foodId)
      .input("name", name.trim())
      .input("calories", Number(calories))
      .input("protein", Number(protein))
      .input("carbs", Number(carbs))
      .input("fats", Number(fats))
      .input("unit", unit || "g")
      .query(`
        UPDATE Foods
        SET 
          Name = @name,
          Calories = @calories,
          Protein = @protein,
          Carbs = @carbs,
          Fats = @fats,
          Unit = @unit,
          UpdatedAt = GETDATE()
        WHERE Id = @id
      `);

    return res.json({
      result: "success",
      message: "Food updated successfully"
    });

  } catch (error) {
    console.error(error);

    // =========================
    // 4. SQL DUPLICATE ERROR SAFE HANDLING
    // =========================
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({
        result: "error",
        message: "Food already exists"
      });
    }

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};





const deleteFood = async (req, res) => {
  try {
    const foodId = req.params.id;

    const pool = await poolPromise;

    const food = await pool.request()
      .input("id", foodId)
      .query(`
        SELECT Id, IsActive
        FROM Foods
        WHERE Id = @id
      `);

    if (food.recordset.length === 0) {
      return res.status(404).json({
        result: "error",
        message: "Food not found"
      });
    }

    const isActive = Number(food.recordset[0].IsActive);

    // =========================
    // FIXED CHECK
    // =========================
    if (isActive === 0) {
      return res.status(400).json({
        result: "error",
        message: "Food is already inactive"
      });
    }

    await pool.request()
      .input("id", foodId)
      .query(`
        UPDATE Foods
        SET IsActive = 0,
            UpdatedAt = GETDATE()
        WHERE Id = @id
      `);

    return res.json({
      result: "success",
      message: "Food deleted successfully"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};






const activateFood = async (req, res) => {
  try {
    const foodId = req.params.id;

    const pool = await poolPromise;

    // =========================
    // CHECK FOOD EXISTS
    // =========================
    const food = await pool.request()
      .input("id", foodId)
      .query(`
        SELECT Id, IsActive
        FROM Foods
        WHERE Id = @id
      `);

    if (food.recordset.length === 0) {
      return res.status(404).json({
        result: "error",
        message: "Food not found"
      });
    }

    const isActive = Number(food.recordset[0].IsActive);

    // =========================
    // ALREADY ACTIVE CHECK
    // =========================
    if (isActive === 1) {
      return res.status(400).json({
        result: "error",
        message: "Food is already active"
      });
    }

    // =========================
    // ACTIVATE FOOD
    // =========================
    await pool.request()
      .input("id", foodId)
      .query(`
        UPDATE Foods
        SET IsActive = 1,
            UpdatedAt = GETDATE()
        WHERE Id = @id
      `);

    return res.json({
      result: "success",
      message: "Food activated successfully"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      result: "error",
      message: "Server error"
    });
  }
};



module.exports = {getFoods, addFood, updateFood, deleteFood, activateFood };