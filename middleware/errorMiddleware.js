const errorMiddleware = (err, req, res, next) => {
  console.error(err); // log for debugging

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    result: "error",
    message: err.message || "Internal Server Error",
    data: null
  });
};

module.exports = errorMiddleware;