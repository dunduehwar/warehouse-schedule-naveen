const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const appendFile = promisify(fs.appendFile);
const mkdir = promisify(fs.mkdir);

/**
 * Service for logging errors in the application
 */
class ErrorLogger {
          constructor(options = {}) {
                    this.logDir = options.logDir || path.join(__dirname, '..', 'logs');
                    this.errorLogFile = path.join(this.logDir, 'error.log');
                    this.accessLogFile = path.join(this.logDir, 'access.log');
                    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB

                    // Ensure log directory exists
                    this.ensureLogDirectory();
          }

          /**
           * Ensure log directory exists
           */
          async ensureLogDirectory() {
                    try {
                              if (!fs.existsSync(this.logDir)) {
                                        await mkdir(this.logDir, { recursive: true });
                                        console.log(`Created log directory: ${this.logDir}`);
                              }
                    } catch (error) {
                              console.error(`Failed to create log directory: ${error.message}`);
                    }
          }

          /**
           * Format error for logging
           * @param {Error|Object} error - Error object to format
           * @param {Object} context - Additional context information
           * @returns {string} Formatted error log
           */
          formatError(error, context = {}) {
                    const timestamp = new Date().toISOString();
                    const errorObject = {
                              timestamp,
                              message: error.message || 'Unknown error',
                              stack: error.stack,
                              code: error.code,
                              ...context
                    };

                    return JSON.stringify(errorObject) + '\n';
          }

          /**
           * Format access log entry
           * @param {Object} req - Express request object
           * @param {Object} res - Express response object
           * @param {number} time - Response time in milliseconds
           * @returns {string} Formatted access log
           */
          formatAccessLog(req, res, time) {
                    const timestamp = new Date().toISOString();
                    const logEntry = {
                              timestamp,
                              method: req.method,
                              url: req.originalUrl || req.url,
                              status: res.statusCode,
                              contentLength: res.getHeader('content-length') || 0,
                              userAgent: req.headers['user-agent'],
                              ip: req.ip || req.connection.remoteAddress,
                              responseTime: time
                    };

                    return JSON.stringify(logEntry) + '\n';
          }

          /**
           * Log error to file
           * @param {Error|Object} error - Error to log
           * @param {Object} context - Additional context
           * @returns {Promise<void>}
           */
          async logError(error, context = {}) {
                    try {
                              await this.ensureLogDirectory();
                              const formattedError = this.formatError(error, context);
                              await appendFile(this.errorLogFile, formattedError);
                    } catch (writeError) {
                              console.error(`Failed to write to error log: ${writeError.message}`);
                              console.error('Original error:', error);
                    }
          }

          /**
           * Log access to file
           * @param {Object} req - Express request object
           * @param {Object} res - Express response object
           * @param {number} time - Response time in milliseconds
           * @returns {Promise<void>}
           */
          async logAccess(req, res, time) {
                    try {
                              await this.ensureLogDirectory();
                              const formattedLog = this.formatAccessLog(req, res, time);
                              await appendFile(this.accessLogFile, formattedLog);
                    } catch (writeError) {
                              console.error(`Failed to write to access log: ${writeError.message}`);
                    }
          }

          /**
           * Create Express middleware for logging
           * @returns {Function} Express middleware
           */
          createMiddleware() {
                    return async (req, res, next) => {
                              const start = Date.now();

                              // Add response finished listener
                              res.on('finish', async () => {
                                        const time = Date.now() - start;

                                        // Log all requests to access log
                                        await this.logAccess(req, res, time);

                                        // Log errors (status >= 400) to error log
                                        if (res.statusCode >= 400) {
                                                  const error = new Error(`HTTP ${res.statusCode}`);
                                                  const context = {
                                                            method: req.method,
                                                            url: req.originalUrl || req.url,
                                                            statusCode: res.statusCode,
                                                            ip: req.ip || req.connection.remoteAddress
                                                  };
                                                  await this.logError(error, context);
                                        }
                              });

                              next();
                    };
          }

          /**
           * Create Express error handler middleware
           * @returns {Function} Express error middleware
           */
          createErrorHandler() {
                    return async (err, req, res, next) => {
                              // Log the error
                              const context = {
                                        method: req.method,
                                        url: req.originalUrl || req.url,
                                        ip: req.ip || req.connection.remoteAddress
                              };
                              await this.logError(err, context);

                              // Send error response
                              const statusCode = err.statusCode || 500;
                              res.status(statusCode).json({
                                        success: false,
                                        message: process.env.NODE_ENV === 'production'
                                                  ? 'An error occurred while processing your request'
                                                  : err.message,
                                        error: process.env.NODE_ENV === 'production' ? undefined : err.stack
                              });
                    };
          }
}

module.exports = ErrorLogger; 