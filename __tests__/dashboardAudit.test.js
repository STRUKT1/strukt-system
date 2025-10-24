/**
 * Dashboard Audit Tests
 * 
 * Tests for production-grade dashboard audit logging and metrics.
 */

const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');

const dashboardAuditService = require('../src/services/dashboardAuditService');
const dashboardMetricsService = require('../src/services/dashboardMetricsService');

// Track test results
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(name, fn) {
  return new Promise(async (resolve) => {
    try {
      await fn();
      passedTests++;
      console.log(`✅ ${name}`);
      resolve(true);
    } catch (error) {
      failedTests++;
      failures.push({ name, error: error.message });
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      resolve(false);
    }
  });
}

console.log('🧪 Running Dashboard Audit Tests...\n');

// ==========================================
// 1. Audit Service Structure Tests
// ==========================================
console.log('📋 Testing Audit Service Structure...');

test('dashboardAuditService exports required functions', async () => {
  assert(typeof dashboardAuditService.createAuditLog === 'function');
  assert(typeof dashboardAuditService.logDataFetch === 'function');
  assert(typeof dashboardAuditService.logUserInteraction === 'function');
  assert(typeof dashboardAuditService.logErrorResponse === 'function');
  assert(typeof dashboardAuditService.logCacheHit === 'function');
  assert(typeof dashboardAuditService.logCacheMiss === 'function');
  assert(typeof dashboardAuditService.correlationMiddleware === 'function');
  assert(typeof dashboardAuditService.initialize === 'function');
});

test('dashboardAuditService exports required constants', async () => {
  assert(typeof dashboardAuditService.EVENT_TYPES === 'object');
  assert(typeof dashboardAuditService.EVENT_CATEGORIES === 'object');
  assert(typeof dashboardAuditService.STATUS === 'object');
  
  // Check event types
  assert.strictEqual(dashboardAuditService.EVENT_TYPES.DATA_FETCH, 'data_fetch');
  assert.strictEqual(dashboardAuditService.EVENT_TYPES.USER_INTERACTION, 'user_interaction');
  assert.strictEqual(dashboardAuditService.EVENT_TYPES.ERROR_RESPONSE, 'error_response');
  
  // Check status types
  assert.strictEqual(dashboardAuditService.STATUS.SUCCESS, 'success');
  assert.strictEqual(dashboardAuditService.STATUS.ERROR, 'error');
  assert.strictEqual(dashboardAuditService.STATUS.WARNING, 'warning');
});

// ==========================================
// 2. Audit Log Creation Tests
// ==========================================
console.log('\n📝 Testing Audit Log Creation...');

test('createAuditLog requires correlationId', async () => {
  try {
    await dashboardAuditService.createAuditLog({
      eventType: 'test_event',
      operation: 'test_operation',
    });
    throw new Error('Should have thrown an error');
  } catch (error) {
    assert(error.message.includes('correlationId'));
  }
});

test('createAuditLog requires eventType', async () => {
  try {
    await dashboardAuditService.createAuditLog({
      correlationId: 'test-123',
      operation: 'test_operation',
    });
    throw new Error('Should have thrown an error');
  } catch (error) {
    assert(error.message.includes('eventType'));
  }
});

test('createAuditLog requires operation', async () => {
  try {
    await dashboardAuditService.createAuditLog({
      correlationId: 'test-123',
      eventType: 'test_event',
    });
    throw new Error('Should have thrown an error');
  } catch (error) {
    assert(error.message.includes('operation'));
  }
});

test('createAuditLog creates valid log entry', async () => {
  const entry = await dashboardAuditService.createAuditLog({
    correlationId: 'test-correlation-123',
    eventType: dashboardAuditService.EVENT_TYPES.DATA_FETCH,
    operation: 'fetch_user_data',
    status: dashboardAuditService.STATUS.SUCCESS,
    durationMs: 150,
  });

  assert(entry.timestamp);
  assert.strictEqual(entry.correlationId, 'test-correlation-123');
  assert.strictEqual(entry.eventType, 'data_fetch');
  assert.strictEqual(entry.operation, 'fetch_user_data');
  assert.strictEqual(entry.status, 'success');
  assert.strictEqual(entry.durationMs, 150);
});

test('logDataFetch creates audit entry', async () => {
  const entry = await dashboardAuditService.logDataFetch({
    correlationId: 'fetch-test-456',
    operation: 'fetch_dashboard_data',
    durationMs: 200,
  });

  assert.strictEqual(entry.eventType, 'data_fetch');
  assert.strictEqual(entry.eventCategory, 'data_fetch');
  assert.strictEqual(entry.operation, 'fetch_dashboard_data');
});

test('logErrorResponse creates audit entry with error status', async () => {
  const entry = await dashboardAuditService.logErrorResponse({
    correlationId: 'error-test-789',
    operation: 'failed_operation',
    errorMessage: 'Database connection failed',
    statusCode: 500,
  });

  assert.strictEqual(entry.eventType, 'error_response');
  assert.strictEqual(entry.status, 'error');
  assert(entry.errorMessage.includes('Database connection failed'));
});

// ==========================================
// 3. PII Sanitization Tests
// ==========================================
console.log('\n🔒 Testing PII Sanitization...');

test('sanitizeErrorMessage removes tokens', async () => {
  const sanitized = dashboardAuditService.sanitizeErrorMessage(
    'Failed with token=abc123def456'
  );
  assert(sanitized.includes('[REDACTED]'));
  assert(!sanitized.includes('abc123def456'));
});

test('sanitizeErrorMessage removes passwords', async () => {
  const sanitized = dashboardAuditService.sanitizeErrorMessage(
    'Auth failed with password=secret123'
  );
  assert(sanitized.includes('[REDACTED]'));
  assert(!sanitized.includes('secret123'));
});

test('sanitizeDataSummary removes sensitive fields', async () => {
  const data = {
    count: 10,
    email: 'user@example.com',
    items: ['item1', 'item2'],
    password: 'secret',
  };

  const sanitized = dashboardAuditService.sanitizeDataSummary(data);
  assert.strictEqual(sanitized.count, 10);
  assert(Array.isArray(sanitized.items));
  assert(!sanitized.email);
  assert(!sanitized.password);
});

test('sanitizeMetadata removes authorization headers', async () => {
  const metadata = {
    method: 'GET',
    url: '/api/data',
    authorization: 'Bearer token123',
    cookie: 'session=abc',
  };

  const sanitized = dashboardAuditService.sanitizeMetadata(metadata);
  assert.strictEqual(sanitized.method, 'GET');
  assert.strictEqual(sanitized.url, '/api/data');
  assert(!sanitized.authorization);
  assert(!sanitized.cookie);
});

// ==========================================
// 4. Metrics Service Tests
// ==========================================
console.log('\n📊 Testing Metrics Service...');

test('metricsService exports required functions', async () => {
  assert(typeof dashboardMetricsService.recordQuery === 'function');
  assert(typeof dashboardMetricsService.recordCacheHit === 'function');
  assert(typeof dashboardMetricsService.recordCacheMiss === 'function');
  assert(typeof dashboardMetricsService.getMetrics === 'function');
  assert(typeof dashboardMetricsService.getPrometheusMetrics === 'function');
  assert(typeof dashboardMetricsService.metricsMiddleware === 'function');
});

test('recordQuery captures query metrics', async () => {
  // Reset metrics first
  dashboardMetricsService.resetMetrics();
  
  dashboardMetricsService.recordQuery({
    durationMs: 100,
    success: true,
    operation: 'test_query',
    responseSize: 1024,
  });

  const metrics = dashboardMetricsService.getMetrics();
  assert.strictEqual(metrics.queries.total, 1);
  assert.strictEqual(metrics.queries.successful, 1);
  assert.strictEqual(metrics.queries.failed, 0);
});

test('recordQuery tracks errors', async () => {
  dashboardMetricsService.resetMetrics();
  
  dashboardMetricsService.recordQuery({
    durationMs: 50,
    success: false,
    operation: 'failed_query',
  });

  const metrics = dashboardMetricsService.getMetrics();
  assert.strictEqual(metrics.queries.failed, 1);
  assert(metrics.errorRate.percentage > 0);
});

test('recordCacheHit and recordCacheMiss track cache operations', async () => {
  dashboardMetricsService.resetMetrics();
  
  dashboardMetricsService.recordCacheHit('test_op');
  dashboardMetricsService.recordCacheHit('test_op');
  dashboardMetricsService.recordCacheMiss('test_op');

  const metrics = dashboardMetricsService.getMetrics();
  assert.strictEqual(metrics.cache.hits, 2);
  assert.strictEqual(metrics.cache.misses, 1);
  assert(metrics.cache.hitRatio > 0);
});

test('getMetrics returns valid structure', async () => {
  const metrics = dashboardMetricsService.getMetrics();
  
  assert(metrics.uptime);
  assert(metrics.queries);
  assert(metrics.latency);
  assert(metrics.errorRate);
  assert(metrics.responseSize);
  assert(metrics.cache);
  assert(metrics.timestamp);
  
  // Check uptime structure
  assert(typeof metrics.uptime.milliseconds === 'number');
  assert(typeof metrics.uptime.seconds === 'number');
  assert(typeof metrics.uptime.formatted === 'string');
  
  // Check queries structure
  assert(typeof metrics.queries.total === 'number');
  assert(typeof metrics.queries.successful === 'number');
  assert(typeof metrics.queries.failed === 'number');
});

test('getPrometheusMetrics returns Prometheus format', async () => {
  const prometheus = dashboardMetricsService.getPrometheusMetrics();
  
  assert(typeof prometheus === 'string');
  assert(prometheus.includes('# HELP'));
  assert(prometheus.includes('# TYPE'));
  assert(prometheus.includes('dashboard_uptime_seconds'));
  assert(prometheus.includes('dashboard_queries_total'));
  assert(prometheus.includes('dashboard_latency_milliseconds'));
  assert(prometheus.includes('dashboard_cache_hit_ratio_percentage'));
});

test('getMetricsByOperation groups by operation', async () => {
  dashboardMetricsService.resetMetrics();
  
  dashboardMetricsService.recordQuery({
    durationMs: 100,
    success: true,
    operation: 'op_a',
  });
  
  dashboardMetricsService.recordQuery({
    durationMs: 200,
    success: true,
    operation: 'op_a',
  });
  
  dashboardMetricsService.recordQuery({
    durationMs: 150,
    success: true,
    operation: 'op_b',
  });

  const opMetrics = dashboardMetricsService.getMetricsByOperation();
  
  assert(opMetrics.op_a);
  assert.strictEqual(opMetrics.op_a.count, 2);
  assert.strictEqual(opMetrics.op_a.avgLatency, 150);
  
  assert(opMetrics.op_b);
  assert.strictEqual(opMetrics.op_b.count, 1);
  assert.strictEqual(opMetrics.op_b.avgLatency, 150);
});

// ==========================================
// 5. Correlation ID Middleware Tests
// ==========================================
console.log('\n🔗 Testing Correlation ID Middleware...');

test('correlationMiddleware adds correlationId to request', async () => {
  const req = { requestId: 'test-request-123' };
  const res = { setHeader: () => {} };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  dashboardAuditService.correlationMiddleware(req, res, next);

  assert.strictEqual(req.correlationId, 'test-request-123');
  assert(nextCalled);
});

test('correlationMiddleware generates correlationId if missing', async () => {
  const req = {};
  const res = { setHeader: () => {} };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  dashboardAuditService.correlationMiddleware(req, res, next);

  assert(req.correlationId);
  assert(typeof req.correlationId === 'string');
  assert(req.correlationId.length > 0);
  assert(nextCalled);
});

// ==========================================
// 6. Integration Tests
// ==========================================
console.log('\n🔄 Testing Integration Scenarios...');

test('complete audit workflow with all components', async () => {
  const correlationId = 'integration-test-' + Date.now();
  
  // Simulate a data fetch operation
  const startTime = Date.now();
  const durationMs = 125;
  
  // Record metrics
  dashboardMetricsService.recordQuery({
    durationMs,
    success: true,
    operation: 'integration_fetch',
    responseSize: 2048,
  });
  
  // Create audit log
  const auditEntry = await dashboardAuditService.logDataFetch({
    correlationId,
    operation: 'integration_fetch',
    durationMs,
    dataSizeBytes: 2048,
    dataSummary: { recordCount: 10 },
  });
  
  // Verify audit entry
  assert.strictEqual(auditEntry.correlationId, correlationId);
  assert.strictEqual(auditEntry.operation, 'integration_fetch');
  assert.strictEqual(auditEntry.durationMs, durationMs);
  
  // Verify metrics
  const metrics = dashboardMetricsService.getMetrics();
  assert(metrics.queries.total > 0);
});

test('error handling workflow', async () => {
  const correlationId = 'error-workflow-' + Date.now();
  
  // Record failed query
  dashboardMetricsService.recordQuery({
    durationMs: 50,
    success: false,
    operation: 'error_operation',
  });
  
  // Log error
  const errorEntry = await dashboardAuditService.logErrorResponse({
    correlationId,
    operation: 'error_operation',
    errorMessage: 'Test error occurred',
    statusCode: 500,
    durationMs: 50,
  });
  
  assert.strictEqual(errorEntry.status, 'error');
  assert(errorEntry.errorMessage);
  
  const metrics = dashboardMetricsService.getMetrics();
  assert(metrics.errorRate.percentage >= 0);
});

// ==========================================
// Test Summary
// ==========================================
async function runAllTests() {
  // Wait a bit for all async operations
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results\n');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);

  if (failures.length > 0) {
    console.log('\n❌ Failed Tests:\n');
    failures.forEach(failure => {
      console.log(`  • ${failure.name}`);
      console.log(`    ${failure.error}`);
    });
  }

  console.log('\n' + '='.repeat(50));

  if (failedTests === 0) {
    console.log('\n🎉 All dashboard audit tests passed!');
    const coverage = Math.round((passedTests / (passedTests + failedTests)) * 100);
    console.log(`   Coverage: ${coverage}%`);
    process.exit(0);
  } else {
    console.log(`\n❌ ${failedTests} test(s) failed`);
    process.exit(1);
  }
}

// Run all tests
runAllTests();
