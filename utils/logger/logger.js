import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const isWorker = typeof globalThis !== 'undefined' && (globalThis.WebSocketPair || process.env.CF_PAGES || process.env.CLOUDFLARE_WORKER);

let logger;

if (isWorker) {
  // Lightweight native logging for Cloudflare Workers (avoiding Winston stream issues)
  logger = {
    info: (...args) => console.log("[INFO]:", ...args),
    error: (...args) => console.error("[ERROR]:", ...args),
    warn: (...args) => console.warn("[WARN]:", ...args),
    debug: (...args) => console.log("[DEBUG]:", ...args)
  };
} else {
  let __filename = '';
  let __dirname = '';

  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      __filename = fileURLToPath(import.meta.url);
      __dirname = path.dirname(__filename);
    }
  } catch (e) {
    // Safe fallback
  }

  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
  );

  const transports = [];

  if (process.env.DISABLE_FILE_LOGS === "true") {
    transports.push(
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    );
  } else {
    transports.push(
      new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: "error",
      }),
      new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log')
      })
    );
  }

  logger = winston.createLogger({
    level: "info",
    format: logFormat,
    transports: transports,
  });

  if (process.env.DISABLE_FILE_LOGS !== "true" && process.env.NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    );
  }
}

export default logger;