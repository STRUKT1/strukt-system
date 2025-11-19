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
const createUserRateLimit = (windowMs = config.rateLimit.windowMs, max = config.rateLimit.max, customMessage = 'Too many requests. Please try again later.') => {
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
        message: customMessage,
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

/**
 * AI Operation Rate Limiters
 * These protect expensive AI endpoints from abuse
 */

const createPlanGenerationLimiter = () => createUserRateLimit(
  60 * 60 * 1000, // 1 hour window
  5,              // 5 requests max
  'Too many plan generation requests. Please try again later.'
);

const createChatLimiter = () => createUserRateLimit(
  60 * 1000,      // 1 minute window
  20,             // 20 requests max
  'Too many chat messages. Please slow down.'
);

const createVoiceLogLimiter = () => createUserRateLimit(
  60 * 60 * 1000, // 1 hour window
  30,             // 30 requests max
  'Too many voice logs. Please try again later.'
);

const createPhotoAnalysisLimiter = () => createUserRateLimit(
  60 * 60 * 1000, // 1 hour window
  20,             // 20 requests max
  'Too many photo analysis requests. Please try again later.'
);

const createTemplateLimiter = () => createUserRateLimit(
  60 * 60 * 1000, // 1 hour window
  50,             // 50 requests max
  'Too many template operations. Please try again later.'
);

module.exports = {
  standardRateLimit,
  strictRateLimit,
  createUserRateLimit,
  createPlanGenerationLimiter,
  createChatLimiter,
  createVoiceLogLimiter,
  createPhotoAnalysisLimiter,
  createTemplateLimiter,
};