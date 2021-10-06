const { format, transports, createLogger } = require('winston');
const expressWinston = require('express-winston');

class LoggerService {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL;
    this.logFormat = process.env.LOG_FORMAT;
    this.headersBlackList = ['X-Access-Token'];
    if (['DEBUG', 'TRACE'].includes(this.logLevel)) {
      process.env.DEBUG = '*';
    }
    if (process.env.LOG_HTTP_BODY === 'true') {
      expressWinston.requestWhitelist.push('body');
      expressWinston.responseWhitelist.push('body');
    }

    this.middleware = expressWinston.logger({
      ...this.loggerOptions,
      meta: true, // optional: control whether you want to log the meta data about the request (default to true)
      headerBlacklist: this.headersBlackList,
      ignoreRoute: (req) => req.path.includes('/actuator'),
      msg: 'HTTP {{req.method}} {{res.statusCode}} {{req.url}} - {{res.responseTime}}ms',
    });
    this.logger = createLogger(this.loggerOptions);

    process.on('uncaughtException', (err) => {
      this.error(err);
      process.exit(1);
    });
    process.on('unhandledRejection', (err) => {
      this.error(err);
    });
  }

  get logLevelMap() {
    return {
      TRACE: 'info',
      DEBUG: 'info',
      INFO: 'info',
      WARN: 'error',
      ERROR: 'error',
    };
  }

  get loggerOptions() {
    return {
      transports: [
        new transports.Console({
          level: this.logLevelMap[this.logLevel] || 'error',
        }),
      ],
      format: format.combine(
        format.timestamp({ alias: '@timestamp' }),
        format(this.timestampRemover)(),
        format(this.addResponseCode)(),
        format.json(),
      ),
    };
  }

  info(message) {
    if (this.logFormat === 'TEXT') {
      // eslint-disable-next-line no-console
      console.log(message);
      return;
    }
    this.logger.info(message);
  }

  error(err) {
    if (this.logFormat === 'TEXT') {
      // eslint-disable-next-line no-console
      console.error(err);
      return;
    }
    this.logger.error(err.message, { name: err.name, stack: err.stack });
  }

  timestampRemover({ timestamp, ...rest }) {
    return rest;
  }

  addResponseCode(data) {
    return {
      ...data,
      ...(data.meta?.res && { responseCode: data.meta.res.statusCode }),
    };
  }
}

module.exports = new LoggerService();
