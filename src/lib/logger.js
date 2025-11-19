/**
 * Centralized logging utility with PII masking
 * Provides structured logging with security considerations
 */

const crypto = require('crypto');
const { config } = require('../config');

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;

/**
 * Mask user ID for privacy (show first 8 chars + ...)
 */
function maskUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    return 'undefined';
  }
  return userId.length > 8 ? `${userId.substring(0, 8)}...` : userId;
}

/**
 * Mask email for privacy (show first 2 chars of local + domain)
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') {
    return 'undefined';
  }
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***@***';
  }
  return `${local.substring(0, 2)}***@${domain}`;
}

/**
 * Generate request ID for tracing
 */
function generateRequestId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Create structured log entry
 */
function createLogEntry(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  
  // Mask any user IDs in metadata
  if (entry.userId) {
    entry.userIdMasked = maskUserId(entry.userId);
    delete entry.userId; // Remove original userId for security
  }
  
  // Remove sensitive fields
  ['password', 'token', 'secret', 'key', 'authorization'].forEach(field => {
    if (entry[field]) {
      delete entry[field];
    }
  });
  
  return entry;
}

/**
 * Log at different levels
 */
function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] <= currentLogLevel) {
    const entry = createLogEntry(level, message, meta);
    console.log(JSON.stringify(entry));
  }
}

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),

  // Utility functions
  maskUserId,
  maskEmail,
  generateRequestId,
  
  // Express middleware for request logging
  requestLogger: (req, res, next) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    req.requestId = requestId;
    
    // Log request start
    logger.info('Request started', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      userIdMasked: req.userId ? maskUserId(req.userId) : undefined,
    });
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      // Log response (without sensitive data)
      logger.info('Request completed', {
        requestId,
        method: req.method,
        url: req.url,
        status: res.statusCode,
        durationMs: duration,
        userIdMasked: req.userId ? maskUserId(req.userId) : undefined,
      });
      
      // Add request ID to response headers
      res.set('X-Request-Id', requestId);
      
      return originalJson.call(this, data);
    };
    
    next();
  },
};

module.exports = logger;