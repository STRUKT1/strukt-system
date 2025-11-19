/**
 * Meal Logging Routes
 * Voice-based meal logging with GPT-4 food parsing and nutrition lookup
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { parseFoodFromText } = require('../services/foodParsingService');
const { getNutritionForFoods, calculateTotals } = require('../services/nutritionDatabaseService');
const { supabaseAdmin } = require('../lib/supabaseServer');
const logger = require('../lib/logger');
const { createVoiceLogLimiter } = require('../lib/rateLimit');

const router = express.Router();
const voiceLimiter = createVoiceLogLimiter();

/**
 * POST /v1/meals/voice-log
 * Log a meal from voice transcription
 *
 * Request body:
 * {
 *   "transcription": "I had chicken and rice for lunch",
 *   "timestamp": "2024-11-16T12:30:00Z" (optional)
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "data": {
 *     "meal_id": "uuid",
 *     "meal": {
 *       "meal_type": "lunch",
 *       "timestamp": "2024-11-16T12:30:00Z",
 *       "foods": [...],
 *       "totals": { calories, protein, carbs, fat }
 *     },
 *     "message": "Logged! 425 cal, 36g protein. Great lunch!"
 *   }
 * }
 */
router.post('/v1/meals/voice-log', authenticateJWT, voiceLimiter, async (req, res) => {
  try {
    const { transcription, timestamp } = req.body;

    // Validate input
    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        code: 'ERR_INVALID_TRANSCRIPTION',
        message: 'Transcription is required and must be a non-empty string',
      });
    }

    logger.info('Voice meal logging requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      transcriptionLength: transcription.length,
      timestamp,
    });

    // Step 1: Parse food from transcription using GPT-4
    const parsedMeal = await parseFoodFromText(req.userId, transcription, {
      timestamp: timestamp || new Date().toISOString(),
    });

    if (!parsedMeal.foods || parsedMeal.foods.length === 0) {
      return res.status(400).json({
        ok: false,
        code: 'ERR_NO_FOODS_FOUND',
        message: 'Could not identify any food items in the transcription. Please try again with more details.',
      });
    }

    logger.info('Food parsing successful', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      mealType: parsedMeal.meal_type,
      foodCount: parsedMeal.foods.length,
      confidence: parsedMeal.confidence,
    });

    // Step 2: Look up nutrition data for each food
    const foodsWithNutrition = await getNutritionForFoods(parsedMeal.foods);

    logger.info('Nutrition lookup complete', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      foodCount: foodsWithNutrition.length,
    });

    // Step 3: Calculate totals
    const totals = calculateTotals(foodsWithNutrition);

    // Step 4: Save to database
    const mealTimestamp = timestamp || new Date().toISOString();
    const mealDate = mealTimestamp.split('T')[0];

    const mealPayload = {
      user_id: req.userId,
      meal_type: parsedMeal.meal_type,
      timestamp: mealTimestamp,
      date: mealDate,
      foods: foodsWithNutrition,
      source: 'voice',
      confidence: parsedMeal.confidence,
      transcription: transcription,
      // Legacy fields for backward compatibility
      description: transcription,
      calories: totals.calories,
      macros: {
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        fiber: totals.fiber,
      },
      notes: parsedMeal.notes,
    };

    const { data: savedMeal, error } = await supabaseAdmin
      .from('meals')
      .insert(mealPayload)
      .select()
      .single();

    if (error) {
      logger.error('Failed to save meal to database', {
        requestId: req.requestId,
        userIdMasked: logger.maskUserId(req.userId),
        error: error.message,
      });
      throw error;
    }

    logger.info('Meal logged successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      mealId: savedMeal.id,
      mealType: parsedMeal.meal_type,
      totalCalories: totals.calories,
    });

    // Step 5: Generate confirmation message
    const confirmationMessage = generateConfirmationMessage(
      parsedMeal.meal_type,
      totals,
      parsedMeal.confidence
    );

    // Step 6: Return success response
    res.json({
      ok: true,
      data: {
        meal_id: savedMeal.id,
        meal: {
          meal_type: parsedMeal.meal_type,
          timestamp: mealTimestamp,
          foods: foodsWithNutrition,
          totals,
          confidence: parsedMeal.confidence,
        },
        message: confirmationMessage,
      },
    });
  } catch (error) {
    logger.error('Voice meal logging failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });

    // Handle specific error types
    if (error.status === 429) {
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

    res.status(500).json({
      ok: false,
      code: 'ERR_MEAL_LOGGING_FAILED',
      message: 'Failed to log meal. Please try again.',
    });
  }
});

/**
 * GET /v1/meals
 * Get user's meal history
 */
router.get('/v1/meals', authenticateJWT, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    logger.info('Meal history requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      limit,
      offset,
    });

    const { data: meals, error } = await supabaseAdmin
      .from('meals')
      .select('*')
      .eq('user_id', req.userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch meal history', {
        requestId: req.requestId,
        userIdMasked: logger.maskUserId(req.userId),
        error: error.message,
      });
      throw error;
    }

    res.json({
      ok: true,
      data: meals || [],
    });
  } catch (error) {
    logger.error('Meal history fetch failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_MEAL_HISTORY_FAILED',
      message: 'Failed to retrieve meal history',
    });
  }
});

/**
 * DELETE /v1/meals/:mealId
 * Delete a meal
 */
router.delete('/v1/meals/:mealId', authenticateJWT, async (req, res) => {
  try {
    const { mealId } = req.params;

    logger.info('Meal deletion requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      mealId,
    });

    const { error } = await supabaseAdmin
      .from('meals')
      .delete()
      .eq('id', mealId)
      .eq('user_id', req.userId); // Ensure user owns the meal

    if (error) {
      logger.error('Failed to delete meal', {
        requestId: req.requestId,
        userIdMasked: logger.maskUserId(req.userId),
        mealId,
        error: error.message,
      });
      throw error;
    }

    res.json({
      ok: true,
      message: 'Meal deleted successfully',
    });
  } catch (error) {
    logger.error('Meal deletion failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_MEAL_DELETE_FAILED',
      message: 'Failed to delete meal',
    });
  }
});

/**
 * Generate a friendly confirmation message
 * @param {string} mealType - Type of meal
 * @param {Object} totals - Nutrition totals
 * @param {string} confidence - Parsing confidence
 * @returns {string} Confirmation message
 */
function generateConfirmationMessage(mealType, totals, confidence) {
  const encouragement = [
    'Great',
    'Awesome',
    'Nice',
    'Excellent',
    'Perfect',
  ];

  const randomEncouragement = encouragement[Math.floor(Math.random() * encouragement.length)];

  let message = `Logged! ${totals.calories} cal, ${totals.protein}g protein.`;

  if (confidence === 'high') {
    message += ` ${randomEncouragement} ${mealType}!`;
  } else if (confidence === 'medium') {
    message += ` ${randomEncouragement} ${mealType}! (Some portions were estimated)`;
  } else {
    message += ` ${mealType} logged, but please double-check the portions.`;
  }

  return message;
}

module.exports = router;
