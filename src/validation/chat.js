/**
 * Chat validation schemas
 */

const { z } = require('zod');

// Chat interaction schema
const chatInteractionSchema = z.object({
  message: z.string().min(1).max(10000),
  response: z.string().max(20000).optional(),
  context: z.record(z.any()).optional(),
  timestamp: z.string().datetime().optional(),
}).strict();

// Chat query schema
const chatQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(5),
}).strict();

/**
 * Validate chat interaction data
 */
function validateChatInteraction(data) {
  try {
    return {
      success: true,
      data: chatInteractionSchema.parse(data),
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors,
    };
  }
}

/**
 * Validate chat query parameters
 */
function validateChatQuery(data) {
  try {
    return {
      success: true,
      data: chatQuerySchema.parse(data),
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors,
    };
  }
}

/**
 * Validation middleware for chat interactions
 */
function validateChatMiddleware(req, res, next) {
  const result = validateChatInteraction(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      ok: false,
      code: 'ERR_VALIDATION_FAILED',
      message: 'Invalid chat data',
      details: result.error,
    });
  }
  
  req.validatedData = result.data;
  next();
}

/**
 * Validation middleware for chat queries
 */
function validateChatQueryMiddleware(req, res, next) {
  const result = validateChatQuery(req.query);
  
  if (!result.success) {
    return res.status(400).json({
      ok: false,
      code: 'ERR_VALIDATION_FAILED',
      message: 'Invalid query parameters',
      details: result.error,
    });
  }
  
  req.validatedQuery = result.data;
  next();
}

module.exports = {
  chatInteractionSchema,
  chatQuerySchema,
  validateChatInteraction,
  validateChatQuery,
  validateChatMiddleware,
  validateChatQueryMiddleware,
};