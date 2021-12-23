/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */
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

    this.middleware = (req, res, next) => {
      this.routesBlackList = ['/actuator'];
      if (this.logLevel === 'TRACE') {
        this.logHttpTrace(req, res);
      }
      return expressWinston.logger({
        ...this.loggerOptions,
        meta: true, // optional: control whether you want to log the meta data about the request (default to true)
        headerBlacklist: this.headersBlackList,
        ignoreRoute: (req) => this.routesBlackList.some((url) => req.path.includes(url)),
        msg: 'HTTP {{req.method}} {{res.statusCode}} {{req.url}} - {{res.responseTime}}ms',
      })(req, res, next);
    };
    this.logger = createLogger(this.loggerOptions);

    process.on('uncaughtException', (err) => {
      this.error(err);
      process.exit(1);
    });
    process.on('unhandledRejection', (err) => {
      this.error(err);
    });
  }

  logHttpTrace(request, response) {
    if (this.routesBlackList.some((url) => request.originalUrl.includes(url))) {
      return;
    }
    let body = [];
    let requestErrorMessage = null;
    const logRequestChunk = (chunk) => {
      body.push(chunk);
      this.trace(
        `HTTP Request: ${request.method} ${request.originalUrl}, Data event: chunk received - ${chunk.toString()}`,
      );
    };
    const logRequestEnd = () => {
      body = Buffer.concat(body).toString();
      this.trace(
        `HTTP Request: ${request.method} ${request.originalUrl}, End event: Request body assembled - ${body}`,
      );
    };
    const logRequestError = (error) => {
      requestErrorMessage = error.message;
      this.trace(
        `HTTP Request: ${request.method} ${request.originalUrl}, Error event: ${requestErrorMessage}`,
      );
    };
    request.on('data', logRequestChunk);
    request.on('end', logRequestEnd);
    request.on('error', logRequestError);

    const logClose = () => {
      // eslint-disable-next-line no-use-before-define
      removeHandlers();
      this.trace(`HTTP Response: ${request.method} ${request.url}, Close event. Client aborted`);
    };
    const logError = (error) => {
      // eslint-disable-next-line no-use-before-define
      removeHandlers();
      this.trace(`HTTP Response: ${request.method} ${request.url}, Error event: ${error.message}`);
    };
    const logFinish = () => {
      // eslint-disable-next-line no-use-before-define
      removeHandlers();
      this.trace(
        `HTTP Response: ${response.statusCode} ${request.method} ${request.url}, Finish event`,
      );
    };
    response.on('close', logClose);
    response.on('error', logError);
    response.on('finish', logFinish);

    const removeHandlers = () => {
      request.off('data', logRequestChunk);
      request.off('end', logRequestEnd);
      request.off('error', logRequestError);
      response.off('close', logClose);
      response.off('error', logError);
      response.off('finish', logFinish);
    };
  }

  get logLevelMap() {
    return {
      TRACE: 'debug',
      DEBUG: 'debug',
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

  trace(message) {
    if (this.logFormat === 'TEXT') {
      // eslint-disable-next-line no-console
      console.log(message);
      return;
    }
    this.logger.debug(message);
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
