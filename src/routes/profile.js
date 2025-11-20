/**
 * Profile management endpoints
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { validateProfileMiddleware } = require('../validation/profile');
const { getProfile, upsertProfile } = require('../services/profileService');
const { exportUserData } = require('../services/dataExportService');
const { createUserRateLimit } = require('../lib/rateLimit');
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

// SAR requests limited to 5 per hour per user
const sarLimiter = createUserRateLimit(60 * 60 * 1000, 5, 'Too many data export requests. Please try again later.');

/**
 * GET /v1/profile/export
 * Subject Access Request (SAR) - GDPR Article 15
 * Returns ALL user data in JSON format
 */
router.get('/v1/profile/export', authenticateJWT, sarLimiter, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('SAR endpoint accessed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      ip: req.ip,
      operation: 'sar-request',
    });

    // Export all user data
    const exportData = await exportUserData(userId);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="strukt-data-export-${Date.now()}.json"`);

    // Return the export
    res.status(200).json({
      ok: true,
      message: 'Data export successful',
      export: exportData,
    });

  } catch (error) {
    logger.error('SAR endpoint error', {
      requestId: req.requestId,
      userIdMasked: req.userId ? logger.maskUserId(req.userId) : undefined,
      error: error.message,
      operation: 'sar-request',
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_EXPORT_FAILED',
      message: 'Failed to export data. Please try again later.',
    });
  }
});

module.exports = router;