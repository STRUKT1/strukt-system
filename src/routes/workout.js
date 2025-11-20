/**
 * Workout Logging Routes
 * Handles workout logging with exercises, sets, reps, and tracking
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { validateWorkout, validateWorkoutUpdate } = require('../validation/workout');
const {
  logWorkout,
  getUserWorkouts,
  getWorkout,
  updateWorkout,
  deleteWorkout,
} = require('../services/logs/workouts');
const logger = require('../lib/logger');

const router = express.Router();

/**
 * POST /v1/logs/workout
 * Log a new workout
 *
 * Request body:
 * {
 *   "exercises": [
 *     { "name": "Bench Press", "sets": 3, "reps": 10, "weight": 135, "weight_unit": "lbs" }
 *   ],
 *   "duration_minutes": 45,
 *   "workout_type": "strength",
 *   "notes": "Great workout!",
 *   "perceived_exertion": 7,
 *   "workout_date": "2024-11-20T10:00:00Z" (optional)
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "message": "Workout logged successfully",
 *   "workout": { ... }
 * }
 */
router.post('/v1/logs/workout', authenticateJWT, async (req, res) => {
  try {
    const userId = req.userId;

    // Validate input
    const validation = validateWorkout(req.body);
    if (!validation.success) {
      logger.warn('Workout validation failed', {
        requestId: req.requestId,
        userIdMasked: logger.maskUserId(userId),
        errors: validation.error.details,
      });

      return res.status(400).json({
        ok: false,
        code: 'ERR_VALIDATION_FAILED',
        message: validation.error.message,
        errors: validation.error.details,
      });
    }

    logger.info('Workout logging requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      exerciseCount: validation.data.exercises?.length,
    });

    // Log workout
    const workout = await logWorkout(userId, validation.data);

    logger.info('Workout logged successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      workoutId: workout.id,
    });

    res.status(201).json({
      ok: true,
      message: 'Workout logged successfully',
      workout,
    });
  } catch (error) {
    logger.error('Workout logging endpoint error', {
      requestId: req.requestId,
      userIdMasked: req.userId ? logger.maskUserId(req.userId) : undefined,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_WORKOUT_LOG_FAILED',
      message: 'Failed to log workout',
    });
  }
});

/**
 * GET /v1/logs/workouts
 * Get user's workouts
 *
 * Query parameters:
 * - limit: Number of workouts to return (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * - start_date: Filter workouts from this date
 * - end_date: Filter workouts until this date
 *
 * Response:
 * {
 *   "ok": true,
 *   "workouts": [...],
 *   "count": 10
 * }
 */
router.get('/v1/logs/workouts', authenticateJWT, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    logger.info('Get workouts requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      limit,
    });

    const workouts = await getUserWorkouts(userId, limit);

    res.status(200).json({
      ok: true,
      workouts,
      count: workouts.length,
    });
  } catch (error) {
    logger.error('Get workouts endpoint error', {
      requestId: req.requestId,
      userIdMasked: req.userId ? logger.maskUserId(req.userId) : undefined,
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_GET_WORKOUTS_FAILED',
      message: 'Failed to retrieve workouts',
    });
  }
});

/**
 * GET /v1/logs/workout/:id
 * Get a specific workout
 *
 * Response:
 * {
 *   "ok": true,
 *   "workout": { ... }
 * }
 */
router.get('/v1/logs/workout/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.userId;
    const workoutId = req.params.id;

    logger.info('Get workout requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      workoutId,
    });

    const workout = await getWorkout(userId, workoutId);

    if (!workout) {
      return res.status(404).json({
        ok: false,
        code: 'ERR_WORKOUT_NOT_FOUND',
        message: 'Workout not found',
      });
    }

    res.status(200).json({
      ok: true,
      workout,
    });
  } catch (error) {
    logger.error('Get workout endpoint error', {
      requestId: req.requestId,
      userIdMasked: req.userId ? logger.maskUserId(req.userId) : undefined,
      workoutId: req.params.id,
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_GET_WORKOUT_FAILED',
      message: 'Failed to retrieve workout',
    });
  }
});

/**
 * PUT /v1/logs/workout/:id
 * Update a workout
 *
 * Request body: Same as POST but all fields optional
 *
 * Response:
 * {
 *   "ok": true,
 *   "message": "Workout updated successfully",
 *   "workout": { ... }
 * }
 */
router.put('/v1/logs/workout/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.userId;
    const workoutId = req.params.id;

    // Validate input (allow partial updates)
    const validation = validateWorkoutUpdate(req.body);
    if (!validation.success) {
      logger.warn('Workout update validation failed', {
        requestId: req.requestId,
        userIdMasked: logger.maskUserId(userId),
        workoutId,
        errors: validation.error.details,
      });

      return res.status(400).json({
        ok: false,
        code: 'ERR_VALIDATION_FAILED',
        message: validation.error.message,
        errors: validation.error.details,
      });
    }

    logger.info('Workout update requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      workoutId,
    });

    const workout = await updateWorkout(userId, workoutId, validation.data);

    if (!workout) {
      return res.status(404).json({
        ok: false,
        code: 'ERR_WORKOUT_NOT_FOUND',
        message: 'Workout not found',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Workout updated successfully',
      workout,
    });
  } catch (error) {
    logger.error('Update workout endpoint error', {
      requestId: req.requestId,
      userIdMasked: req.userId ? logger.maskUserId(req.userId) : undefined,
      workoutId: req.params.id,
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_UPDATE_WORKOUT_FAILED',
      message: 'Failed to update workout',
    });
  }
});

/**
 * DELETE /v1/logs/workout/:id
 * Delete a workout
 *
 * Response:
 * {
 *   "ok": true,
 *   "message": "Workout deleted successfully"
 * }
 */
router.delete('/v1/logs/workout/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.userId;
    const workoutId = req.params.id;

    logger.info('Workout deletion requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      workoutId,
    });

    await deleteWorkout(userId, workoutId);

    res.status(200).json({
      ok: true,
      message: 'Workout deleted successfully',
    });
  } catch (error) {
    logger.error('Delete workout endpoint error', {
      requestId: req.requestId,
      userIdMasked: req.userId ? logger.maskUserId(req.userId) : undefined,
      workoutId: req.params.id,
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_DELETE_WORKOUT_FAILED',
      message: 'Failed to delete workout',
    });
  }
});

module.exports = router;
