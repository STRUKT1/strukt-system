/**
 * Photo Analysis Routes
 * GPT-4 Vision endpoints for analyzing workout screenshots and meal photos
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { createPhotoAnalysisLimiter } = require('../lib/rateLimit');
const { analyzeWorkoutPhoto, analyzeMealPhoto } = require('../services/photoAnalysisService');
const logger = require('../lib/logger');

const router = express.Router();

// Rate limiter: 20 photo analyses per hour per user
const photoAnalysisLimiter = createPhotoAnalysisLimiter();

/**
 * POST /v1/photos/analyze-workout
 * Analyze a workout screenshot using GPT-4 Vision
 *
 * Request body:
 * {
 *   "photo": "data:image/jpeg;base64,/9j/4AAQ...",
 *   "hint": "fitness_app_screenshot" (optional)
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "data": {
 *     "type": "workout",
 *     "confidence": "high|medium|low",
 *     "extracted": {
 *       "exercise": "Running",
 *       "duration": 28.75,
 *       "distance": 5.0,
 *       "calories": 320,
 *       "avgHeartRate": 152,
 *       "maxHeartRate": 178,
 *       "pace": "5:45",
 *       "elevationGain": 45,
 *       "date": "2024-11-16",
 *       "time": "07:30",
 *       "source": "Apple Fitness"
 *     },
 *     "message": "Found running workout! 5km in 28min. Ready to log?"
 *   }
 * }
 */
router.post('/v1/photos/analyze-workout', authenticateJWT, photoAnalysisLimiter, async (req, res) => {
  try {
    const { photo, hint } = req.body;

    // Validate input
    if (!photo || typeof photo !== 'string') {
      return res.status(400).json({
        ok: false,
        code: 'ERR_INVALID_PHOTO',
        message: 'Photo is required and must be a base64 encoded string',
      });
    }

    logger.info('Workout photo analysis requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      photoSize: photo.length,
      hint,
    });

    // Analyze the workout photo
    const result = await analyzeWorkoutPhoto(photo, req.userId, hint);

    logger.info('Workout photo analysis complete', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      confidence: result.confidence,
      hasData: Object.keys(result.extracted || {}).length > 0,
    });

    // Return success response
    res.json({
      ok: true,
      data: {
        type: 'workout',
        confidence: result.confidence,
        extracted: result.extracted,
        message: result.message,
      },
    });
  } catch (error) {
    logger.error('Workout photo analysis failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
      code: error.code,
    });

    // Handle specific error types
    if (error.code === 'INVALID_IMAGE') {
      return res.status(400).json({
        ok: false,
        code: 'ERR_INVALID_IMAGE',
        message: error.message,
      });
    }

    if (error.code === 'RATE_LIMIT_EXCEEDED' || error.status === 429) {
      return res.status(429).json({
        ok: false,
        code: 'ERR_RATE_LIMIT',
        message: 'Too many requests. Please try again in a moment.',
      });
    }

    if (error.message && error.message.includes('OpenAI')) {
      return res.status(503).json({
        ok: false,
        code: 'ERR_AI_SERVICE_UNAVAILABLE',
        message: 'AI service temporarily unavailable. Please try again.',
      });
    }

    // Generic error response
    res.status(500).json({
      ok: false,
      code: 'ERR_ANALYSIS_FAILED',
      message: 'Failed to analyze photo. Please try again.',
    });
  }
});

/**
 * POST /v1/photos/analyze-meal
 * Analyze a meal photo using GPT-4 Vision
 *
 * Request body:
 * {
 *   "photo": "data:image/jpeg;base64,/9j/4AAQ...",
 *   "mealType": "lunch" (optional: breakfast, lunch, dinner, snack)
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "data": {
 *     "type": "meal",
 *     "confidence": "high|medium|low",
 *     "mealType": "lunch",
 *     "foods": [
 *       {
 *         "name": "grilled chicken breast",
 *         "amount": "150g",
 *         "calories": 165,
 *         "protein": 31,
 *         "carbs": 0,
 *         "fat": 3.6,
 *         "fiber": 0
 *       },
 *       {
 *         "name": "brown rice",
 *         "amount": "200g",
 *         "calories": 218,
 *         "protein": 4.5,
 *         "carbs": 46,
 *         "fat": 1.6,
 *         "fiber": 3.5
 *       }
 *     ],
 *     "totals": {
 *       "calories": 383,
 *       "protein": 35.5,
 *       "carbs": 46,
 *       "fat": 5.2,
 *       "fiber": 3.5
 *     },
 *     "message": "Found 2 foods! 383 cal, 35.5g protein. Ready to log?"
 *   }
 * }
 */
router.post('/v1/photos/analyze-meal', authenticateJWT, photoAnalysisLimiter, async (req, res) => {
  try {
    const { photo, mealType } = req.body;

    // Validate input
    if (!photo || typeof photo !== 'string') {
      return res.status(400).json({
        ok: false,
        code: 'ERR_INVALID_PHOTO',
        message: 'Photo is required and must be a base64 encoded string',
      });
    }

    // Validate mealType if provided
    if (mealType && !['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
      return res.status(400).json({
        ok: false,
        code: 'ERR_INVALID_MEAL_TYPE',
        message: 'Meal type must be one of: breakfast, lunch, dinner, snack',
      });
    }

    logger.info('Meal photo analysis requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      photoSize: photo.length,
      mealType,
    });

    // Analyze the meal photo
    const result = await analyzeMealPhoto(photo, req.userId, mealType);

    logger.info('Meal photo analysis complete', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      confidence: result.confidence,
      foodCount: result.foods?.length || 0,
      totalCalories: result.totals?.calories,
    });

    // Return success response
    res.json({
      ok: true,
      data: {
        type: 'meal',
        confidence: result.confidence,
        mealType: result.mealType,
        foods: result.foods,
        totals: result.totals,
        notes: result.notes,
        message: result.message,
      },
    });
  } catch (error) {
    logger.error('Meal photo analysis failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
      code: error.code,
    });

    // Handle specific error types
    if (error.code === 'INVALID_IMAGE') {
      return res.status(400).json({
        ok: false,
        code: 'ERR_INVALID_IMAGE',
        message: error.message,
      });
    }

    if (error.code === 'RATE_LIMIT_EXCEEDED' || error.status === 429) {
      return res.status(429).json({
        ok: false,
        code: 'ERR_RATE_LIMIT',
        message: 'Too many requests. Please try again in a moment.',
      });
    }

    if (error.message && error.message.includes('OpenAI')) {
      return res.status(503).json({
        ok: false,
        code: 'ERR_AI_SERVICE_UNAVAILABLE',
        message: 'AI service temporarily unavailable. Please try again.',
      });
    }

    // Generic error response
    res.status(500).json({
      ok: false,
      code: 'ERR_ANALYSIS_FAILED',
      message: 'Failed to analyze photo. Please try again.',
    });
  }
});

module.exports = router;
