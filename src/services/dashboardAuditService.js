/**
 * Dashboard Audit Service
 * 
 * Provides structured audit logging for dashboard analytics operations.
 * Implements production-grade traceability with correlation IDs and performance metrics.
 * 
 * Features:
 * - Structured logging with PII masking
 * - Correlation ID support for cross-service tracing
 * - Async Supabase writes (non-blocking)
 * - Local file logging for development
 * - 7-day automatic log rotation
 */

const fs = require('fs').promises;
const path = require('path');
const { supabaseAdmin } = require('../lib/supabaseServer');
const logger = require('../lib/logger');

const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'dashboard-audit.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const LOG_RETENTION_DAYS = 7;

// Event types
const EVENT_TYPES = {
  DATA_FETCH: 'data_fetch',
  USER_INTERACTION: 'user_interaction',
  ERROR_RESPONSE: 'error_response',
  CACHE_HIT: 'cache_hit',
  CACHE_MISS: 'cache_miss',
  API_CALL: 'api_call',
  METRIC_COLLECTION: 'metric_collection',
};

// Event categories
const EVENT_CATEGORIES = {
  DATA_FETCH: 'data_fetch',
  USER_ACTION: 'user_action',
  SYSTEM_EVENT: 'system_event',
  PERFORMANCE: 'performance',
  ERROR: 'error',
};

// Status types
const STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
};

/**
 * Ensure logs directory exists
 */
async function ensureLogDirectory() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Check and rotate log file if needed
 */
async function rotateLogIfNeeded() {
  try {
    const stats = await fs.stat(LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivePath = path.join(LOG_DIR, `dashboard-audit-${timestamp}.log`);
      await fs.rename(LOG_FILE, archivePath);
      logger.info('Log file rotated', { archivePath });
    }
  } catch (error) {
    // File might not exist yet, ignore
  }
}

/**
 * Delete logs older than retention period
 */
async function cleanOldLogs() {
  try {
    const files = await fs.readdir(LOG_DIR);
    const now = Date.now();
    const retentionMs = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.startsWith('dashboard-audit-') && file.endsWith('.log')) {
        const filePath = path.join(LOG_DIR, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > retentionMs) {
          await fs.unlink(filePath);
          logger.info('Deleted old log file', { file, ageHours: Math.round(age / (60 * 60 * 1000)) });
        }
      }
    }
  } catch (error) {
    logger.warn('Error cleaning old logs', { error: error.message });
  }
}

/**
 * Write audit log to local file (development)
 * @param {Object} logEntry - Structured log entry
 */
async function writeToLocalFile(logEntry) {
  try {
    await ensureLogDirectory();
    await rotateLogIfNeeded();
    
    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(LOG_FILE, logLine);
  } catch (error) {
    logger.error('Error writing to local audit log', { error: error.message });
  }
}

/**
 * Write audit log to Supabase (production)
 * @param {Object} logEntry - Structured log entry
 */
async function writeToSupabase(logEntry) {
  try {
    // Async write - don't block on response
    setImmediate(async () => {
      try {
        const { error } = await supabaseAdmin
          .from('dashboard_audit')
          .insert({
            user_id: logEntry.userId || null,
            correlation_id: logEntry.correlationId,
            request_id: logEntry.requestId || null,
            event_type: logEntry.eventType,
            event_category: logEntry.eventCategory || EVENT_CATEGORIES.DATA_FETCH,
            operation: logEntry.operation,
            status: logEntry.status,
            status_code: logEntry.statusCode || null,
            error_message: logEntry.errorMessage || null,
            duration_ms: logEntry.durationMs || null,
            data_size_bytes: logEntry.dataSizeBytes || null,
            data_summary: logEntry.dataSummary || null,
            metadata: logEntry.metadata || null,
          });

        if (error) {
          logger.error('Failed to write audit log to Supabase', { error: error.message });
        }
      } catch (err) {
        logger.error('Exception writing audit log to Supabase', { error: err.message });
      }
    });
  } catch (error) {
    logger.error('Error initiating Supabase audit write', { error: error.message });
  }
}

/**
 * Create and store an audit log entry
 * @param {Object} params - Audit log parameters
 * @returns {Object} The created audit entry
 */
async function createAuditLog({
  userId = null,
  correlationId,
  requestId = null,
  eventType,
  eventCategory = EVENT_CATEGORIES.DATA_FETCH,
  operation,
  status = STATUS.SUCCESS,
  statusCode = null,
  errorMessage = null,
  durationMs = null,
  dataSizeBytes = null,
  dataSummary = null,
  metadata = null,
}) {
  // Validation
  if (!correlationId) {
    throw new Error('correlationId is required for audit logging');
  }
  if (!eventType) {
    throw new Error('eventType is required for audit logging');
  }
  if (!operation) {
    throw new Error('operation is required for audit logging');
  }

  // Build structured log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: userId ? logger.maskUserId(userId) : null, // Mask for file logs
    correlationId,
    requestId,
    eventType,
    eventCategory,
    operation,
    status,
    statusCode,
    errorMessage: errorMessage ? sanitizeErrorMessage(errorMessage) : null,
    durationMs,
    dataSizeBytes,
    dataSummary: dataSummary ? sanitizeDataSummary(dataSummary) : null,
    metadata: metadata ? sanitizeMetadata(metadata) : null,
  };

  // Write to appropriate destinations
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Development: write to local file
    await writeToLocalFile(logEntry);
  } else {
    // Production: write to Supabase (async, non-blocking)
    writeToSupabase({
      ...logEntry,
      userId, // Use real userId for Supabase (masked version is only for file logs)
    });
  }

  // Also log to standard logger for immediate visibility
  const logLevel = status === STATUS.ERROR ? 'error' : status === STATUS.WARNING ? 'warn' : 'info';
  logger[logLevel](`Dashboard audit: ${operation}`, {
    correlationId,
    eventType,
    status,
    durationMs,
  });

  return logEntry;
}

/**
 * Sanitize error message to remove sensitive data
 * @param {string} message - Error message
 * @returns {string} Sanitized message
 */
function sanitizeErrorMessage(message) {
  if (!message) return null;
  
  // Remove potential tokens, passwords, etc.
  let sanitized = message;
  sanitized = sanitized.replace(/token[=:\s]+[a-zA-Z0-9_-]+/gi, 'token=[REDACTED]');
  sanitized = sanitized.replace(/password[=:\s]+[^\s]+/gi, 'password=[REDACTED]');
  sanitized = sanitized.replace(/key[=:\s]+[a-zA-Z0-9_-]+/gi, 'key=[REDACTED]');
  
  return sanitized.substring(0, 500); // Limit length
}

/**
 * Sanitize data summary to remove PII
 * @param {Object} summary - Data summary
 * @returns {Object} Sanitized summary
 */
function sanitizeDataSummary(summary) {
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  const sanitized = { ...summary };
  
  // Remove sensitive fields
  const sensitiveFields = ['email', 'password', 'token', 'secret', 'ssn', 'creditCard'];
  sensitiveFields.forEach(field => {
    delete sanitized[field];
  });

  return sanitized;
}

/**
 * Sanitize metadata to remove sensitive data
 * @param {Object} metadata - Metadata object
 * @returns {Object} Sanitized metadata
 */
function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const sanitized = { ...metadata };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie'];
  sensitiveFields.forEach(field => {
    delete sanitized[field];
  });

  return sanitized;
}

/**
 * Create audit log for data fetch operation
 * @param {Object} params - Audit parameters
 */
async function logDataFetch(params) {
  return createAuditLog({
    ...params,
    eventType: EVENT_TYPES.DATA_FETCH,
    eventCategory: EVENT_CATEGORIES.DATA_FETCH,
  });
}

/**
 * Create audit log for user interaction
 * @param {Object} params - Audit parameters
 */
async function logUserInteraction(params) {
  return createAuditLog({
    ...params,
    eventType: EVENT_TYPES.USER_INTERACTION,
    eventCategory: EVENT_CATEGORIES.USER_ACTION,
  });
}

/**
 * Create audit log for error response
 * @param {Object} params - Audit parameters
 */
async function logErrorResponse(params) {
  return createAuditLog({
    ...params,
    eventType: EVENT_TYPES.ERROR_RESPONSE,
    eventCategory: EVENT_CATEGORIES.ERROR,
    status: STATUS.ERROR,
  });
}

/**
 * Create audit log for cache hit
 * @param {Object} params - Audit parameters
 */
async function logCacheHit(params) {
  return createAuditLog({
    ...params,
    eventType: EVENT_TYPES.CACHE_HIT,
    eventCategory: EVENT_CATEGORIES.PERFORMANCE,
  });
}

/**
 * Create audit log for cache miss
 * @param {Object} params - Audit parameters
 */
async function logCacheMiss(params) {
  return createAuditLog({
    ...params,
    eventType: EVENT_TYPES.CACHE_MISS,
    eventCategory: EVENT_CATEGORIES.PERFORMANCE,
  });
}

/**
 * Create audit log for API call
 * @param {Object} params - Audit parameters
 */
async function logApiCall(params) {
  return createAuditLog({
    ...params,
    eventType: EVENT_TYPES.API_CALL,
    eventCategory: EVENT_CATEGORIES.SYSTEM_EVENT,
  });
}

/**
 * Express middleware to add correlation ID to requests
 */
function correlationMiddleware(req, res, next) {
  // Use existing requestId from logger or generate new one
  req.correlationId = req.requestId || logger.generateRequestId();
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
}

/**
 * Initialize audit service (run on startup)
 */
async function initialize() {
  await ensureLogDirectory();
  await cleanOldLogs();
  logger.info('Dashboard audit service initialized', {
    logDir: LOG_DIR,
    retentionDays: LOG_RETENTION_DAYS,
  });
}

module.exports = {
  // Core functions
  createAuditLog,
  
  // Convenience functions
  logDataFetch,
  logUserInteraction,
  logErrorResponse,
  logCacheHit,
  logCacheMiss,
  logApiCall,
  
  // Middleware
  correlationMiddleware,
  
  // Initialization
  initialize,
  
  // Constants
  EVENT_TYPES,
  EVENT_CATEGORIES,
  STATUS,
  
  // Utilities
  sanitizeErrorMessage,
  sanitizeDataSummary,
  sanitizeMetadata,
};
