/**
 * Nutrition validation schemas
 */

const { z } = require('zod');

// Nutrition summary query schema
const nutritionSummaryQuerySchema = z.object({
  range: z.enum(['today', '7d']).optional().default('today'),
  tz: z.string().max(50).optional().default('UTC'), // IANA timezone
}).strict();

/**
 * Validate nutrition summary query parameters
 */
function validateNutritionSummaryQuery(data) {
  try {
    return {
      success: true,
      data: nutritionSummaryQuerySchema.parse(data),
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors,
    };
  }
}

/**
 * Validation middleware for nutrition summary queries
 */
function validateNutritionSummaryMiddleware(req, res, next) {
  const result = validateNutritionSummaryQuery(req.query);
  
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
  nutritionSummaryQuerySchema,
  validateNutritionSummaryQuery,
  validateNutritionSummaryMiddleware,
};