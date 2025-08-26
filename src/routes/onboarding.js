/**
 * Onboarding endpoints
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { completeOnboarding } = require('../services/profileService');
const logger = require('../lib/logger');

const router = express.Router();

/**
 * POST /v1/onboarding/complete
 * Mark user's onboarding as completed
 */
router.post('/v1/onboarding/complete', authenticateJWT, async (req, res) => {
  try {
    logger.info('Onboarding completion requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    const profile = await completeOnboarding(req.userId);
    
    logger.info('Onboarding completed successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    res.json({
      ok: true,
      data: profile,
    });
  } catch (error) {
    logger.error('Onboarding completion failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_ONBOARDING_FAILED',
      message: 'Failed to complete onboarding',
    });
  }
});

module.exports = router;