import logger from '../utils/logger/logger.js';

const errorMiddleware = (err, req, res, next) => {
   logger.error(`${err.message} - ${err.stack}`);
  console.error(err); // log for debugging

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    result: "error",
    message: err.message || "Internal Server Error",
    data: null
  });
};

export default errorMiddleware;