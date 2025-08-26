/**
 * Auto-log endpoint for meals, workouts, sleep, mood
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { validateAutoLogMiddleware } = require('../validation/autoLog');
const { createAutoLog } = require('../services/autoLogService');
const logger = require('../lib/logger');

const router = express.Router();

/**
 * POST /v1/auto-log
 * Log health/fitness data automatically
 */
router.post('/v1/auto-log', authenticateJWT, validateAutoLogMiddleware, async (req, res) => {
  try {
    logger.info('Auto-log requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      kind: req.validatedData.kind,
    });
    
    const result = await createAutoLog(req.userId, req.validatedData);
    
    logger.info('Auto-log created successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      kind: result.kind,
      id: result.id,
    });
    
    res.json({
      ok: true,
      id: result.id,
      kind: result.kind,
      created_at: result.created_at,
    });
  } catch (error) {
    logger.error('Auto-log failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      kind: req.validatedData?.kind,
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_AUTO_LOG_FAILED',
      message: 'Failed to create auto-log entry',
    });
  }
});

module.exports = router;