import { createLogger, format, transports, Logger } from 'winston';

//define the custom format for log message
const logFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});


//configure the winston logger
const logger: Logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        logFormat
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'auth.log' })
    ]
});


export default logger;