/**
 * Dashboard Metrics Service
 * 
 * Captures and exposes performance metrics for dashboard operations.
 * Supports Prometheus-compatible output format.
 * 
 * Metrics collected:
 * - Query latency (average, p95, max)
 * - Error rate (%)
 * - API response size (bytes)
 * - Cache hit ratio
 */

const logger = require('../lib/logger');

// Metrics storage
const metrics = {
  queries: [],
  errors: [],
  cacheHits: 0,
  cacheMisses: 0,
  responseSizes: [],
  startTime: Date.now(),
};

// Configuration
const METRICS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes rolling window
const MAX_SAMPLES = 10000; // Maximum samples to keep in memory

/**
 * Record a query execution
 * @param {Object} params - Query parameters
 */
function recordQuery({ durationMs, success = true, operation = 'unknown', responseSize = 0 }) {
  const now = Date.now();
  
  metrics.queries.push({
    timestamp: now,
    durationMs,
    success,
    operation,
  });

  if (responseSize > 0) {
    metrics.responseSizes.push({
      timestamp: now,
      size: responseSize,
    });
  }

  if (!success) {
    metrics.errors.push({
      timestamp: now,
      operation,
    });
  }

  // Cleanup old data
  cleanupOldMetrics();
}

/**
 * Record a cache hit
 * @param {string} operation - Operation name
 */
function recordCacheHit(operation = 'unknown') {
  metrics.cacheHits++;
  logger.debug('Cache hit recorded', { operation, total: metrics.cacheHits });
}

/**
 * Record a cache miss
 * @param {string} operation - Operation name
 */
function recordCacheMiss(operation = 'unknown') {
  metrics.cacheMisses++;
  logger.debug('Cache miss recorded', { operation, total: metrics.cacheMisses });
}

/**
 * Clean up metrics older than the rolling window
 */
function cleanupOldMetrics() {
  const cutoff = Date.now() - METRICS_WINDOW_MS;

  // Clean queries
  metrics.queries = metrics.queries.filter(q => q.timestamp > cutoff);
  
  // Clean errors
  metrics.errors = metrics.errors.filter(e => e.timestamp > cutoff);
  
  // Clean response sizes
  metrics.responseSizes = metrics.responseSizes.filter(r => r.timestamp > cutoff);

  // Enforce max samples limit
  if (metrics.queries.length > MAX_SAMPLES) {
    metrics.queries = metrics.queries.slice(-MAX_SAMPLES);
  }
  if (metrics.responseSizes.length > MAX_SAMPLES) {
    metrics.responseSizes = metrics.responseSizes.slice(-MAX_SAMPLES);
  }
}

/**
 * Calculate percentile value from sorted array
 * @param {Array} sortedValues - Sorted array of numbers
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} Percentile value
 */
function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Get current metrics summary
 * @returns {Object} Metrics summary
 */
function getMetrics() {
  cleanupOldMetrics();

  const now = Date.now();
  const uptimeMs = now - metrics.startTime;

  // Query latency calculations
  const queryDurations = metrics.queries.map(q => q.durationMs);
  const sortedDurations = [...queryDurations].sort((a, b) => a - b);
  
  const totalQueries = metrics.queries.length;
  const successfulQueries = metrics.queries.filter(q => q.success).length;
  const failedQueries = totalQueries - successfulQueries;
  
  const avgLatency = queryDurations.length > 0
    ? Math.round(queryDurations.reduce((a, b) => a + b, 0) / queryDurations.length)
    : 0;
  
  const p95Latency = calculatePercentile(sortedDurations, 95);
  const maxLatency = sortedDurations.length > 0 ? sortedDurations[sortedDurations.length - 1] : 0;

  // Error rate calculation
  const errorRate = totalQueries > 0 ? (failedQueries / totalQueries) * 100 : 0;

  // Response size calculations
  const sizes = metrics.responseSizes.map(r => r.size);
  const avgResponseSize = sizes.length > 0
    ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length)
    : 0;

  // Cache hit ratio
  const totalCacheAccess = metrics.cacheHits + metrics.cacheMisses;
  const cacheHitRatio = totalCacheAccess > 0
    ? (metrics.cacheHits / totalCacheAccess) * 100
    : 0;

  return {
    uptime: {
      milliseconds: uptimeMs,
      seconds: Math.round(uptimeMs / 1000),
      formatted: formatUptime(uptimeMs),
    },
    queries: {
      total: totalQueries,
      successful: successfulQueries,
      failed: failedQueries,
      windowMs: METRICS_WINDOW_MS,
    },
    latency: {
      average_ms: avgLatency,
      p95_ms: Math.round(p95Latency),
      max_ms: maxLatency,
    },
    errorRate: {
      percentage: Math.round(errorRate * 100) / 100,
      count: failedQueries,
    },
    responseSize: {
      average_bytes: avgResponseSize,
      total_bytes: sizes.reduce((a, b) => a + b, 0),
    },
    cache: {
      hits: metrics.cacheHits,
      misses: metrics.cacheMisses,
      hitRatio: Math.round(cacheHitRatio * 100) / 100,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get metrics in Prometheus format
 * @returns {string} Prometheus-formatted metrics
 */
function getPrometheusMetrics() {
  const summary = getMetrics();
  const labels = 'service="strukt-dashboard"';

  const lines = [
    '# HELP dashboard_uptime_seconds Service uptime in seconds',
    '# TYPE dashboard_uptime_seconds counter',
    `dashboard_uptime_seconds{${labels}} ${summary.uptime.seconds}`,
    '',
    '# HELP dashboard_queries_total Total number of queries',
    '# TYPE dashboard_queries_total counter',
    `dashboard_queries_total{${labels},status="success"} ${summary.queries.successful}`,
    `dashboard_queries_total{${labels},status="failed"} ${summary.queries.failed}`,
    '',
    '# HELP dashboard_latency_milliseconds Query latency in milliseconds',
    '# TYPE dashboard_latency_milliseconds gauge',
    `dashboard_latency_milliseconds{${labels},quantile="avg"} ${summary.latency.average_ms}`,
    `dashboard_latency_milliseconds{${labels},quantile="p95"} ${summary.latency.p95_ms}`,
    `dashboard_latency_milliseconds{${labels},quantile="max"} ${summary.latency.max_ms}`,
    '',
    '# HELP dashboard_error_rate_percentage Error rate as percentage',
    '# TYPE dashboard_error_rate_percentage gauge',
    `dashboard_error_rate_percentage{${labels}} ${summary.errorRate.percentage}`,
    '',
    '# HELP dashboard_response_size_bytes Average response size in bytes',
    '# TYPE dashboard_response_size_bytes gauge',
    `dashboard_response_size_bytes{${labels}} ${summary.responseSize.average_bytes}`,
    '',
    '# HELP dashboard_cache_hit_ratio_percentage Cache hit ratio as percentage',
    '# TYPE dashboard_cache_hit_ratio_percentage gauge',
    `dashboard_cache_hit_ratio_percentage{${labels}} ${summary.cache.hitRatio}`,
    '',
    '# HELP dashboard_cache_operations_total Total cache operations',
    '# TYPE dashboard_cache_operations_total counter',
    `dashboard_cache_operations_total{${labels},result="hit"} ${summary.cache.hits}`,
    `dashboard_cache_operations_total{${labels},result="miss"} ${summary.cache.misses}`,
  ];

  return lines.join('\n');
}

/**
 * Format uptime duration
 * @param {number} ms - Uptime in milliseconds
 * @returns {string} Formatted uptime
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Reset all metrics (for testing)
 */
function resetMetrics() {
  metrics.queries = [];
  metrics.errors = [];
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.responseSizes = [];
  metrics.startTime = Date.now();
  logger.info('Metrics reset');
}

/**
 * Get metrics breakdown by operation
 * @returns {Object} Metrics grouped by operation
 */
function getMetricsByOperation() {
  cleanupOldMetrics();

  const operationStats = {};

  metrics.queries.forEach(query => {
    const op = query.operation || 'unknown';
    if (!operationStats[op]) {
      operationStats[op] = {
        count: 0,
        totalDuration: 0,
        errors: 0,
      };
    }

    operationStats[op].count++;
    operationStats[op].totalDuration += query.durationMs;
    if (!query.success) {
      operationStats[op].errors++;
    }
  });

  // Calculate averages
  const result = {};
  Object.keys(operationStats).forEach(op => {
    const stats = operationStats[op];
    result[op] = {
      count: stats.count,
      avgLatency: Math.round(stats.totalDuration / stats.count),
      errorRate: Math.round((stats.errors / stats.count) * 100 * 100) / 100,
    };
  });

  return result;
}

/**
 * Middleware to track request metrics
 */
function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Capture original res.json
  const originalJson = res.json;
  res.json = function(data) {
    const durationMs = Date.now() - startTime;
    const success = res.statusCode >= 200 && res.statusCode < 400;
    const responseSize = JSON.stringify(data).length;

    recordQuery({
      durationMs,
      success,
      operation: `${req.method} ${req.path}`,
      responseSize,
    });

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Initialize metrics service
 */
function initialize() {
  logger.info('Dashboard metrics service initialized', {
    windowMs: METRICS_WINDOW_MS,
    maxSamples: MAX_SAMPLES,
  });
}

module.exports = {
  // Recording functions
  recordQuery,
  recordCacheHit,
  recordCacheMiss,
  
  // Retrieval functions
  getMetrics,
  getPrometheusMetrics,
  getMetricsByOperation,
  
  // Middleware
  metricsMiddleware,
  
  // Utilities
  resetMetrics,
  initialize,
};
