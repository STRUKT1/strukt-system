/**
 * Profile management endpoints
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { validateProfileMiddleware } = require('../validation/profile');
const { getProfile, upsertProfile } = require('../services/profileService');
const logger = require('../lib/logger');

const router = express.Router();

/**
 * GET /v1/profile
 * Get current user's profile
 */
router.get('/v1/profile', authenticateJWT, async (req, res) => {
  try {
    logger.info('Profile get requested', { 
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    const profile = await getProfile(req.userId);
    
    res.json(profile || {});
  } catch (error) {
    logger.error('Profile get failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_PROFILE_GET_FAILED',
      message: 'Failed to retrieve profile',
    });
  }
});

/**
 * PATCH /v1/profile
 * Update current user's profile
 */
router.patch('/v1/profile', authenticateJWT, validateProfileMiddleware, async (req, res) => {
  try {
    logger.info('Profile update requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      fieldsCount: Object.keys(req.validatedData).length,
    });
    
    const profile = await upsertProfile(req.userId, req.validatedData);
    
    logger.info('Profile updated successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    res.json({
      ok: true,
      data: profile,
    });
  } catch (error) {
    logger.error('Profile update failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_PROFILE_UPDATE_FAILED',
      message: 'Failed to update profile',
    });
  }
});

module.exports = router;