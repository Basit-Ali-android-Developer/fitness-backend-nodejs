const { sql, poolPromise } = require('../../db/connection');




// const getFoods = async () => {
//   const pool = await poolPromise;

//   const result = await pool.request().query(`
//     SELECT Id, Name, Calories, Protein, Carbs, Fats, Unit
//     FROM Foods
//     WHERE IsActive = 1
//     ORDER BY Name ASC
//   `);

//   return result.recordset;
// };

const getFoods = async (page = 1) => {
  const pool = await poolPromise;

  const limit = 10;
  const offset = (page - 1) * limit;

  // 1️⃣ Data query
  const dataResult = await pool.request()
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT Id, Name, Calories, Protein, Carbs, Fats, Unit
      FROM Foods
      WHERE IsActive = 1
      ORDER BY Name ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `);

  // 2️⃣ Count query
  const countResult = await pool.request()
    .query(`
      SELECT COUNT(*) AS total
      FROM Foods
      WHERE IsActive = 1
    `);

  const total = countResult.recordset[0].total;
  const totalPages = Math.ceil(total / limit);

  return {
    data: dataResult.recordset,
    total,
    totalPages,
    page,
    limit,
    hasNextPage: page < totalPages
  };
};





const findByName = async (name) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('name', sql.NVarChar, name)
    .query(`SELECT * FROM Foods WHERE Name = @name AND IsActive = 1`);

  return result.recordset[0];
};






const findByNameExcludeId = async (name, id) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('name', sql.NVarChar, name)
    .input('id', sql.Int, id)
    .query(`
      SELECT * FROM Foods 
      WHERE Name = @name AND Id <> @id AND IsActive = 1
    `);

  return result.recordset[0];
};






const createFood = async (data) => {
  const pool = await poolPromise;

  await pool.request()
    .input("name", data.name)
    .input("calories", data.calories)
    .input("protein", data.protein)
    .input("carbs", data.carbs)
    .input("fats", data.fats)
    .input("unit", data.unit)
    .query(`
      INSERT INTO Foods
      (Name, Calories, Protein, Carbs, Fats, Unit, IsActive, CreatedAt, UpdatedAt)
      VALUES
      (@name, @calories, @protein, @carbs, @fats, @unit, 1, GETDATE(), GETDATE())
    `);
};






const getById = async (id) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input('id', sql.Int, id)
    .query(`SELECT * FROM Foods WHERE Id = @id`);

  return result.recordset[0];
};






const updateFood = async (id, data) => {
  const pool = await poolPromise;

  const result = await pool.request()
    .input("id", id)
    .input("name", data.name)
    .input("calories", data.calories)
    .input("protein", data.protein)
    .input("carbs", data.carbs)
    .input("fats", data.fats)
    .input("unit", data.unit)
    .query(`
      UPDATE Foods
      SET Name=@name,
          Calories=@calories,
          Protein=@protein,
          Carbs=@carbs,
          Fats=@fats,
          Unit=@unit,
          UpdatedAt=GETDATE()
      OUTPUT inserted.*
      WHERE Id=@id
    `);

  return result.recordset[0];
};






const deleteFood = async (id) => {
  const pool = await poolPromise;

  await pool.request()
    .input('id', sql.Int, id)
    .query(`
      UPDATE Foods
      SET IsActive = 0,
          UpdatedAt = GETDATE()
      WHERE Id = @id
    `);
};






const activateFood = async (id) => {
  const pool = await poolPromise;

  await pool.request()
    .input('id', sql.Int, id)
    .query(`
      UPDATE Foods
      SET IsActive = 1,
          UpdatedAt = GETDATE()
      WHERE Id = @id
    `);
};






module.exports = {
  getFoods,
  findByName,
  findByNameExcludeId,
  createFood,
  getById,
  updateFood,
  deleteFood,
  activateFood
};