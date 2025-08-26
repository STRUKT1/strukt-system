/**
 * Health check endpoint
 */

const express = require('express');
const { config } = require('../config');
const logger = require('../lib/logger');

const router = express.Router();

/**
 * GET /health
 * Returns system health status
 */
router.get('/health', (req, res) => {
  logger.info('Health check requested', { requestId: req.requestId });
  
  res.json({
    ok: true,
    version: require('../../package.json').version,
    env: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;