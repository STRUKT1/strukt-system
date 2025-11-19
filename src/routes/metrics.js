/**
 * Dashboard Metrics API Route
 * 
 * Exposes performance metrics for monitoring and observability.
 * Supports both JSON and Prometheus formats.
 */

const express = require('express');
const logger = require('../lib/logger');
const metricsService = require('../services/dashboardMetricsService');
const { authenticateJWT } = require('../lib/auth');

const router = express.Router();

/**
 * GET /api/metrics/dashboard
 * Returns dashboard performance metrics in JSON format
 */
router.get('/api/metrics/dashboard', authenticateJWT, async (req, res) => {
  try {
    const format = req.query.format || 'json';
    
    if (format === 'prometheus') {
      // Return Prometheus format
      const prometheusMetrics = metricsService.getPrometheusMetrics();
      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      res.send(prometheusMetrics);
    } else {
      // Return JSON format (default)
      const metrics = metricsService.getMetrics();
      res.json({
        ok: true,
        metrics,
      });
    }
  } catch (error) {
    logger.error('Error retrieving dashboard metrics', {
      error: error.message,
      requestId: req.requestId,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_METRICS_FAILED',
      message: 'Failed to retrieve metrics',
    });
  }
});

/**
 * GET /api/metrics/dashboard/operations
 * Returns metrics breakdown by operation
 */
router.get('/api/metrics/dashboard/operations', authenticateJWT, async (req, res) => {
  try {
    const operationMetrics = metricsService.getMetricsByOperation();
    
    res.json({
      ok: true,
      operations: operationMetrics,
    });
  } catch (error) {
    logger.error('Error retrieving operation metrics', {
      error: error.message,
      requestId: req.requestId,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_METRICS_FAILED',
      message: 'Failed to retrieve operation metrics',
    });
  }
});

module.exports = router;
