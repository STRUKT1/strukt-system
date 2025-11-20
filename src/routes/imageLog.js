/**
 * Image logging endpoints
 * Universal adapter for logging from photos/screenshots
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { analyzeWorkoutImage, analyzeMealImage } = require('../services/aiExtensions');
const { logMeal } = require('../services/logs/meals');
const { logWorkout } = require('../services/logs/workouts');
const logger = require('../lib/logger');
const { PHOTO_UPLOAD } = require('../config/constants');

const router = express.Router();

/**
 * POST /v1/log-image
 * Log data from an image using AI Vision
 */
router.post('/v1/log-image', authenticateJWT, async (req, res) => {
  try {
    const { imageUrl, imageBase64, logType } = req.body;
    
    // Validation
    if (!logType || !['meal', 'workout'].includes(logType)) {
      return res.status(400).json({
        ok: false,
        code: 'ERR_INVALID_LOG_TYPE',
        message: 'logType must be "meal" or "workout"',
      });
    }
    
    if (!imageUrl && !imageBase64) {
      return res.status(400).json({
        ok: false,
        code: 'ERR_MISSING_IMAGE',
        message: 'Either imageUrl or imageBase64 is required',
      });
    }

    // Validate imageBase64 if provided
    if (imageBase64) {
      try {
        // Check if it's a data URI or just base64
        let imageData = imageBase64;
        if (!imageBase64.startsWith('data:')) {
          // Assume it's raw base64, prepend data URI header
          imageData = `data:image/jpeg;base64,${imageBase64}`;
        }

        // Extract format from data URI
        const matches = imageData.match(/^data:image\/(jpeg|jpg|png|webp);base64,/);

        if (!matches) {
          return res.status(400).json({
            ok: false,
            code: 'ERR_INVALID_FORMAT',
            message: 'Invalid image format. Accepted formats: JPEG, PNG, WebP'
          });
        }

        const format = matches[1];

        // Check format is allowed
        if (!PHOTO_UPLOAD.ALLOWED_FORMATS.includes(format.toLowerCase())) {
          return res.status(400).json({
            ok: false,
            code: 'ERR_INVALID_FORMAT',
            message: `Invalid image format: ${format}. Accepted formats: JPEG, PNG, WebP`
          });
        }

        // Calculate size
        const base64Data = imageData.split(',')[1];
        const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > PHOTO_UPLOAD.MAX_SIZE_MB) {
          return res.status(400).json({
            ok: false,
            code: 'ERR_FILE_TOO_LARGE',
            message: `Image exceeds maximum size of ${PHOTO_UPLOAD.MAX_SIZE_MB}MB (current: ${sizeInMB.toFixed(2)}MB)`
          });
        }

        logger.info('Image upload validated', {
          format,
          sizeInMB: sizeInMB.toFixed(2),
          operation: 'image-validation'
        });

      } catch (error) {
        logger.error('Image validation error', {
          error: error.message,
          operation: 'image-validation'
        });

        return res.status(400).json({
          ok: false,
          code: 'ERR_VALIDATION_FAILED',
          message: 'Failed to validate image data'
        });
      }
    }

    logger.info('Image log requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      logType,
      hasUrl: !!imageUrl,
      hasBase64: !!imageBase64,
    });
    
    // Prepare image for AI Vision
    const imageInput = imageUrl || `data:image/jpeg;base64,${imageBase64}`;
    
    let logData;
    let extractedData;
    
    // Process based on log type
    if (logType === 'workout') {
      // Extract workout data from image
      extractedData = await analyzeWorkoutImage(imageInput);
      
      // Create workout log
      logData = await logWorkout(req.userId, {
        type: extractedData.type,
        duration_minutes: extractedData.duration_minutes,
        distance_km: extractedData.distance_km,
        calories: extractedData.calories,
        notes: 'Logged from image',
      });
      
    } else if (logType === 'meal') {
      // Extract meal data from image
      extractedData = await analyzeMealImage(imageInput);
      
      // Create meal log
      logData = await logMeal(req.userId, {
        description: extractedData.description,
        calories: extractedData.calories,
        macros: extractedData.macros,
        notes: 'Logged from image',
      });
    }
    
    logger.info('Image log created successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      logType,
      logId: logData.id,
    });
    
    res.json({
      ok: true,
      data: {
        log: logData,
        extracted: extractedData,
      },
    });
    
  } catch (error) {
    logger.error('Image log failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_IMAGE_LOG_FAILED',
      message: 'Failed to process image log',
      details: error.message,
    });
  }
});

module.exports = router;
