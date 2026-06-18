import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

let __filename = '';
let __dirname = '';

try {
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
  }
} catch (e) {
  // Safe fallback for environments without file URL support (like Cloudflare Workers)
}

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

export default logger;