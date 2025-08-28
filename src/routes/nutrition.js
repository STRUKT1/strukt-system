/**
 * Nutrition endpoints
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { validateNutritionSummaryMiddleware } = require('../validation/nutrition');
const { getNutritionSummary } = require('../services/nutritionService');
const logger = require('../lib/logger');

const router = express.Router();

/**
 * GET /v1/nutrition/summary
 * Get nutrition summary with aggregated data and targets
 */
router.get('/v1/nutrition/summary', authenticateJWT, validateNutritionSummaryMiddleware, async (req, res) => {
  try {
    const { range, tz } = req.validatedQuery;
    
    logger.info('Nutrition summary requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      range,
      timezone: tz,
    });
    
    const summary = await getNutritionSummary(req.userId, range, tz);
    
    logger.info('Nutrition summary retrieved successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      range,
      daysCount: summary.byDay.length,
      hasTargets: !!summary.targets,
    });
    
    res.json({
      ok: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Nutrition summary failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      range: req.validatedQuery?.range,
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_NUTRITION_SUMMARY_FAILED',
      message: 'Failed to retrieve nutrition summary',
    });
  }
});

module.exports = router;