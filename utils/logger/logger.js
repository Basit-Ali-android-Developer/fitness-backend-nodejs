const winston = require("winston");
const path = require("path");

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

const transports = [];
const isWorker = typeof globalThis !== 'undefined' && (globalThis.WebSocketPair || process.env.CF_PAGES || process.env.CLOUDFLARE_WORKER);

if (isWorker || process.env.DISABLE_FILE_LOGS === "true") {
  transports.push(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
} else {
  transports.push(
    // Errors only
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: "error",
    }),
    // All logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log')
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: transports,
});

// Console log in development
if (!isWorker && process.env.DISABLE_FILE_LOGS !== "true" && process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = logger;