import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, json, printf, colorize } = winston.format;

// Formato para desarrollo (más legible)
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Formato según configuración
const format = config.logFormat === 'json'
  ? combine(timestamp(), json())
  : combine(timestamp(), colorize(), devFormat);

const logger = winston.createLogger({
  level: config.logLevel,
  format,
  transports: [
    // Console
    new winston.transports.Console(),

    // File - Error logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),

    // File - Combined logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

export default logger;
