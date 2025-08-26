/**
 * Rate limiting middleware
 * Implements user-based rate limiting for authenticated endpoints
 */

const rateLimit = require('express-rate-limit');
const { config } = require('../config');
const logger = require('./logger');

// Store for tracking user-specific rate limits
const userLimits = new Map();

/**
 * Create rate limiter for authenticated users
 */
const createUserRateLimit = (windowMs = config.rateLimit.windowMs, max = config.rateLimit.max) => {
  return rateLimit({
    windowMs,
    max,
    
    // Use userId as the key for authenticated requests
    keyGenerator: (req) => {
      return req.userId || req.ip;
    },
    
    // Custom response for rate limit exceeded
    handler: (req, res) => {
      const retryAfter = Math.round(windowMs / 1000);
      
      logger.warn('Rate limit exceeded', {
        requestId: req.requestId,
        userIdMasked: req.userId ? logger.maskUserId(req.userId) : undefined,
        ip: req.ip,
        url: req.url,
        retryAfter,
      });
      
      res.status(429).json({
        ok: false,
        code: 'ERR_RATE_LIMIT',
        message: 'Too many requests. Please try again later.',
        details: {
          retryAfter,
        },
      });
    },
    
    // Add retry-after header
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Standard rate limiter for all endpoints
 */
const standardRateLimit = createUserRateLimit();

/**
 * Stricter rate limiter for sensitive operations
 */
const strictRateLimit = createUserRateLimit(5 * 60 * 1000, 10); // 10 requests per 5 minutes

module.exports = {
  standardRateLimit,
  strictRateLimit,
  createUserRateLimit,
};