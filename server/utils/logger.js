// server/utils/logger.js
const logLevels = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

const getTimestamp = () => {
  return new Date().toISOString();
};

export const logger = {
  debug: (message, data = '') => {
    console.log(`[${getTimestamp()}] [${logLevels.debug}] ${message}`, data);
  },

  info: (message, data = '') => {
    console.log(`[${getTimestamp()}] [${logLevels.info}] ${message}`, data);
  },

  warn: (message, data = '') => {
    console.warn(`[${getTimestamp()}] [${logLevels.warn}] ${message}`, data);
  },

  error: (message, error = '') => {
    console.error(`[${getTimestamp()}] [${logLevels.error}] ${message}`, error);
  },
};
