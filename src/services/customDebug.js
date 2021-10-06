const loggerService = require('./logger');

function customDebug(prefix) {
  return function (message) {
    if (message instanceof Error) {
      loggerService.error(message);
      return;
    }
    if (prefix.includes(':error') && typeof message === 'string') {
      loggerService.error(new Error(message));
      return;
    }
    loggerService.info(
      `${prefix} ${typeof message === 'string' ? message : JSON.stringify(message)}`,
    );
  };
}

module.exports = customDebug;
