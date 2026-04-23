const userService = require('./userService');






const signup = async (req, res) => {
  try {
    const result = await userService.signup(req.body);

    return res.status(201).json({
      result: "success",
      message: "Account created successfully",
      data: null
    });

  } catch (err) {
    return res.status(400).json({
      result: "error",
      message: err.message,
      data: null
    });
  }
};






const login = async (req, res) => {
  try {
    const result = await userService.login(req.body);

    return res.status(200).json({
      result: "success",
      message: "Login successful",
      data: {
         user: result.user,
         token: result.token
       }
    });

  } catch (err) {
    return res.status(400).json({
      result: "error",
      message: err.message,
      data: null
    });
  }
};





const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware

    const result = await userService.updateProfile(userId, req.body);

    return res.status(200).json({
      result: "success",
      message: "Profile updated successfully",
      data: result
    });

  } catch (err) {
    return res.status(400).json({
      result: "error",
      message: err.message,
      data: null
    });
  }
};





const getProfileById = async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await userService.getProfileById(userId);

    return res.status(200).json({
      result: "success",
      message: "Profile fetched successfully",
      data: result
    });

  } catch (err) {
    return res.status(400).json({
      result: "error",
      message: err.message,
      data: null
    });
  }
};




const getUserProfileWithDiet = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await userService.getUserProfileWithDiet(userId);

    return res.status(200).json({
      result: "success",
      message: "User profile fetched successfully",
      data: result
    });

  } catch (err) {
    return res.status(400).json({
      result: "error",
      message: err.message,
      data: null
    });
  }
};




const deleteUser = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware

    const result = await userService.deleteUser(userId);

    return res.status(200).json({
      result: "success",
      message: result.message,
      data: null
    });

  } catch (err) {
    return res.status(400).json({
      result: "error",
      message: err.message,
      data: null
    });
  }
};




const deleteUserByAdmin = async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await userService.deleteUserByAdmin(userId);

    return res.status(200).json({
      result: "success",
      message: result.message,
      data: null
    });

  } catch (err) {
    return res.status(400).json({
      result: "error",
      message: err.message,
      data: null
    });
  }
};



module.exports = { signup , login , updateProfile , getProfileById , getUserProfileWithDiet, deleteUser, deleteUserByAdmin};