import { createLogger, format, transports, Logger } from 'winston';

const logger: Logger = createLogger({
  level: 'info',
  transports: [
    // Console transport for real-time viewing
    new transports.Console({
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.colorize(),
        format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),
    
    // File transport for data collection
    new transports.File({
      filename: 'auth.log',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.json() // Use JSON for easy parsing later
      )
    })
  ]
});

export default logger;