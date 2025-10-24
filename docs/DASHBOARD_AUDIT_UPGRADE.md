# Dashboard Audit Upgrade Documentation

## Overview

This document describes the production-grade audit logging and metrics system for the STRUKT dashboard. The system provides complete traceability, performance monitoring, and compliance reporting for all dashboard analytics operations.

## Table of Contents

1. [Architecture](#architecture)
2. [Audit Logging](#audit-logging)
3. [Performance Metrics](#performance-metrics)
4. [API Endpoints](#api-endpoints)
5. [Validation](#validation)
6. [Security Considerations](#security-considerations)
7. [Performance Guidelines](#performance-guidelines)
8. [Development Workflow](#development-workflow)

---

## Architecture

### Components

The dashboard audit system consists of three main components:

1. **Dashboard Audit Service** (`src/services/dashboardAuditService.js`)
   - Structured logging with PII masking
   - Correlation ID support for request tracing
   - Dual storage: local files (dev) and Supabase (production)
   - Automatic log rotation and cleanup

2. **Dashboard Metrics Service** (`src/services/dashboardMetricsService.js`)
   - Performance metrics collection
   - Rolling window calculations (5-minute default)
   - Prometheus-compatible output
   - Operation-level metrics

3. **Validation Script** (`scripts/validateDashboardAudit.js`)
   - Audit log compliance checking
   - Structure validation
   - PII detection
   - Size limits enforcement

### Data Flow

```
Request → Correlation Middleware → Application Logic
                                          ↓
                              ┌───────────┴───────────┐
                              ↓                       ↓
                      Audit Service            Metrics Service
                              ↓                       ↓
                    ┌─────────┴─────────┐            ↓
                    ↓                   ↓       In-Memory Store
            Local File (dev)    Supabase (prod)      ↓
                                                  API Endpoint
```

---

## Audit Logging

### Log Structure

All audit logs follow this standardized format:

```json
{
  "timestamp": "2025-10-24T11:00:00.000Z",
  "userId": "abc12345...",
  "correlationId": "a1b2c3d4e5f6g7h8",
  "requestId": "req-12345",
  "eventType": "data_fetch",
  "eventCategory": "data_fetch",
  "operation": "fetch_user_profile",
  "status": "success",
  "statusCode": 200,
  "errorMessage": null,
  "durationMs": 150,
  "dataSizeBytes": 2048,
  "dataSummary": {
    "recordCount": 1,
    "fields": ["name", "email", "preferences"]
  },
  "metadata": {
    "source": "dashboard",
    "version": "1.0.0"
  }
}
```

### Event Types

| Event Type | Description | Example |
|------------|-------------|---------|
| `data_fetch` | Data retrieval operations | Fetching user profile |
| `user_interaction` | User-initiated actions | Button clicks, form submissions |
| `error_response` | Error conditions | Database errors, validation failures |
| `cache_hit` | Cache hit events | Redis/memory cache hits |
| `cache_miss` | Cache miss events | Cache lookup failures |
| `api_call` | External API calls | Third-party service requests |
| `metric_collection` | Metrics gathering | Performance sampling |

### Event Categories

- `data_fetch` - Data retrieval operations
- `user_action` - User interactions
- `system_event` - System-level events
- `performance` - Performance-related events
- `error` - Error conditions

### Status Values

- `success` - Operation completed successfully
- `error` - Operation failed
- `warning` - Operation completed with warnings

### Usage Examples

#### Basic Audit Logging

```javascript
const { logDataFetch } = require('../services/dashboardAuditService');

// Log a data fetch operation
await logDataFetch({
  correlationId: req.correlationId,
  operation: 'fetch_workout_history',
  userId: req.userId,
  durationMs: 145,
  dataSizeBytes: 4096,
  dataSummary: {
    recordCount: 30,
    dateRange: '2025-10-01 to 2025-10-24'
  }
});
```

#### Error Logging

```javascript
const { logErrorResponse } = require('../services/dashboardAuditService');

try {
  // Some operation
} catch (error) {
  await logErrorResponse({
    correlationId: req.correlationId,
    operation: 'update_user_preferences',
    userId: req.userId,
    errorMessage: error.message,
    statusCode: 500,
    durationMs: Date.now() - startTime
  });
}
```

#### Cache Operations

```javascript
const { logCacheHit, logCacheMiss } = require('../services/dashboardAuditService');

const cachedData = cache.get(key);
if (cachedData) {
  await logCacheHit({
    correlationId: req.correlationId,
    operation: 'profile_cache_lookup'
  });
} else {
  await logCacheMiss({
    correlationId: req.correlationId,
    operation: 'profile_cache_lookup'
  });
}
```

### Storage

#### Development (Local Files)

- Location: `src/logs/dashboard-audit.log`
- Format: JSON lines (one JSON object per line)
- Rotation: Automatic at 10MB
- Retention: 7 days
- Archive naming: `dashboard-audit-{timestamp}.log`

#### Production (Supabase)

- Table: `dashboard_audit`
- Write mode: Asynchronous (non-blocking)
- Retention: 7 days (configurable via scheduled cleanup)
- RLS: Users can only read their own logs

### PII Protection

The audit system automatically removes sensitive information:

- Email addresses
- Passwords and tokens
- Authorization headers
- Credit card numbers
- Social security numbers
- Session cookies

Example:

```javascript
// Before sanitization
errorMessage: "Auth failed with token=abc123def456"

// After sanitization
errorMessage: "Auth failed with token=[REDACTED]"
```

---

## Performance Metrics

### Metrics Collected

#### Query Metrics

- **Total queries**: Count of all operations
- **Successful queries**: Count of successful operations
- **Failed queries**: Count of failed operations
- **Average latency**: Mean response time in milliseconds
- **P95 latency**: 95th percentile response time
- **Max latency**: Maximum response time observed

#### Error Metrics

- **Error rate**: Percentage of failed operations
- **Error count**: Total number of errors

#### Response Size Metrics

- **Average size**: Mean response size in bytes
- **Total bytes**: Cumulative response data size

#### Cache Metrics

- **Cache hits**: Number of cache hits
- **Cache misses**: Number of cache misses
- **Hit ratio**: Percentage of cache hits

### Usage Examples

#### Recording Query Metrics

```javascript
const { recordQuery } = require('../services/dashboardMetricsService');

const startTime = Date.now();
try {
  const data = await fetchData();
  const durationMs = Date.now() - startTime;
  
  recordQuery({
    durationMs,
    success: true,
    operation: 'fetch_dashboard_data',
    responseSize: JSON.stringify(data).length
  });
} catch (error) {
  const durationMs = Date.now() - startTime;
  recordQuery({
    durationMs,
    success: false,
    operation: 'fetch_dashboard_data'
  });
}
```

#### Recording Cache Operations

```javascript
const { recordCacheHit, recordCacheMiss } = require('../services/dashboardMetricsService');

if (cachedValue) {
  recordCacheHit('user_profile');
} else {
  recordCacheMiss('user_profile');
}
```

### Metrics Window

- Default window: 5 minutes (rolling)
- Max samples: 10,000 in memory
- Automatic cleanup: Old data removed continuously

---

## API Endpoints

### GET /api/metrics/dashboard

Returns current dashboard metrics in JSON format.

**Query Parameters:**
- `format` (optional): Output format, either `json` (default) or `prometheus`

**Response (JSON):**

```json
{
  "ok": true,
  "metrics": {
    "uptime": {
      "milliseconds": 3600000,
      "seconds": 3600,
      "formatted": "1h 0m 0s"
    },
    "queries": {
      "total": 1250,
      "successful": 1225,
      "failed": 25,
      "windowMs": 300000
    },
    "latency": {
      "average_ms": 145,
      "p95_ms": 320,
      "max_ms": 1200
    },
    "errorRate": {
      "percentage": 2.0,
      "count": 25
    },
    "responseSize": {
      "average_bytes": 4096,
      "total_bytes": 5120000
    },
    "cache": {
      "hits": 850,
      "misses": 150,
      "hitRatio": 85.0
    },
    "timestamp": "2025-10-24T11:00:00.000Z"
  }
}
```

**Response (Prometheus):**

Use `?format=prometheus` to get Prometheus-compatible metrics:

```
# HELP dashboard_uptime_seconds Service uptime in seconds
# TYPE dashboard_uptime_seconds counter
dashboard_uptime_seconds{service="strukt-dashboard"} 3600

# HELP dashboard_queries_total Total number of queries
# TYPE dashboard_queries_total counter
dashboard_queries_total{service="strukt-dashboard",status="success"} 1225
dashboard_queries_total{service="strukt-dashboard",status="failed"} 25

# HELP dashboard_latency_milliseconds Query latency in milliseconds
# TYPE dashboard_latency_milliseconds gauge
dashboard_latency_milliseconds{service="strukt-dashboard",quantile="avg"} 145
dashboard_latency_milliseconds{service="strukt-dashboard",quantile="p95"} 320
dashboard_latency_milliseconds{service="strukt-dashboard",quantile="max"} 1200
```

### GET /api/metrics/dashboard/operations

Returns metrics grouped by operation type.

**Response:**

```json
{
  "ok": true,
  "operations": {
    "fetch_user_profile": {
      "count": 450,
      "avgLatency": 120,
      "errorRate": 1.5
    },
    "fetch_workout_history": {
      "count": 300,
      "avgLatency": 180,
      "errorRate": 2.0
    },
    "update_preferences": {
      "count": 150,
      "avgLatency": 95,
      "errorRate": 0.5
    }
  }
}
```

---

## Validation

### Running Validation

```bash
# Validate audit logs
npm run test:audit-validation

# Run full dashboard audit test suite
npm run test:dashboard-audit
```

### Validation Checks

The validation script checks:

1. **Required Fields**: All logs must have `timestamp`, `correlationId`, `eventType`, `operation`, `status`
2. **Correlation ID Format**: Valid UUID or hex string
3. **Status Values**: Must be `success`, `error`, or `warning`
4. **Timestamp Format**: Valid ISO 8601 timestamp
5. **PII Detection**: No sensitive data in logs
6. **Log Size**: Individual logs under 5KB
7. **Duration Metrics**: Valid and reasonable duration values

### Validation Output

```
🔍 Dashboard Audit Validation

==================================================

📄 Found 1250 log entries

✅ Line 1 has required fields
✅ Line 1 has valid status
✅ Line 1 has valid timestamp
✅ Line 1 contains no PII
✅ Line 1 size is within limits
...

==================================================
📊 Validation Summary

✅ Passed: 6250
❌ Failed: 0
⚠️  Warnings: 3
📝 Total log entries: 1250

==================================================

🎉 All validation checks passed!
   Note: 3 warning(s) detected
```

---

## Security Considerations

### PII Masking

- **User IDs**: Masked in file logs (first 8 chars + "...")
- **Email addresses**: Removed from data summaries
- **Passwords**: Automatically redacted
- **Tokens**: Replaced with `[REDACTED]`
- **Authorization headers**: Stripped from metadata

### Access Control

- **Supabase RLS**: Users can only read their own audit logs
- **Service role**: Full access for system operations
- **API endpoints**: Protected by authentication middleware

### Data Retention

- **Development**: 7-day file rotation
- **Production**: 7-day Supabase retention
- **Automatic cleanup**: Scheduled jobs remove old data

### Compliance

The audit system supports:

- **SOC 2**: Complete audit trail
- **GDPR**: PII masking and data retention controls
- **HIPAA**: Secure logging with access controls

---

## Performance Guidelines

### Overhead

The audit system is designed for minimal performance impact:

- **Async writes**: Supabase writes are non-blocking
- **Memory efficient**: Rolling window with max samples limit
- **CPU efficient**: Simple calculations, no heavy processing
- **Target overhead**: <5% of dashboard load time

### Best Practices

1. **Use correlation IDs**: Always propagate `req.correlationId`
2. **Log selectively**: Don't log every minor operation
3. **Aggregate data**: Use summaries instead of full payloads
4. **Batch operations**: Group related logs when possible
5. **Monitor metrics**: Track overhead via `/api/metrics/dashboard`

### Performance Monitoring

```javascript
// Check metrics overhead
const metrics = await fetch('/api/metrics/dashboard');
const data = await metrics.json();

console.log('Avg latency:', data.metrics.latency.average_ms);
console.log('P95 latency:', data.metrics.latency.p95_ms);
console.log('Error rate:', data.metrics.errorRate.percentage);
```

---

## Development Workflow

### Local Development

1. **Start server**:
   ```bash
   npm run dev
   ```

2. **Generate audit logs**:
   - Use the application normally
   - Logs appear in `src/logs/dashboard-audit.log`

3. **View logs**:
   ```bash
   tail -f src/logs/dashboard-audit.log | jq .
   ```

4. **Run validation**:
   ```bash
   npm run test:audit-validation
   ```

5. **Run tests**:
   ```bash
   npm run test:dashboard-audit
   ```

### CI/CD Integration

The validation script is automatically run in CI:

```yaml
# .github/workflows/test.yml
- name: Validate Dashboard Audit
  run: npm run test:audit-validation
```

### Debugging

#### View correlation across services

```bash
# Search logs by correlation ID
grep "correlation-id-123" src/logs/dashboard-audit.log
```

#### Check metrics

```bash
# Get current metrics
curl http://localhost:4000/api/metrics/dashboard | jq .

# Get Prometheus format
curl http://localhost:4000/api/metrics/dashboard?format=prometheus

# Get operation breakdown
curl http://localhost:4000/api/metrics/dashboard/operations | jq .
```

#### Inspect Supabase logs

```sql
-- Query recent audit logs
SELECT * FROM dashboard_audit
ORDER BY created_at DESC
LIMIT 100;

-- Query by correlation ID
SELECT * FROM dashboard_audit
WHERE correlation_id = 'your-correlation-id'
ORDER BY created_at;

-- Check error rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM dashboard_audit
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;
```

---

## Troubleshooting

### Common Issues

**Issue**: Logs not appearing in file

**Solution**: 
- Check `NODE_ENV` is set to `development`
- Verify `src/logs/` directory exists
- Check file permissions

**Issue**: Supabase writes failing

**Solution**:
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check `dashboard_audit` table exists
- Review RLS policies

**Issue**: High memory usage

**Solution**:
- Reduce `METRICS_WINDOW_MS` in `dashboardMetricsService.js`
- Lower `MAX_SAMPLES` limit
- More frequent metric resets

**Issue**: Missing correlation IDs

**Solution**:
- Ensure `correlationMiddleware` is registered in `server.js`
- Check middleware ordering
- Verify `req.correlationId` is passed to audit functions

---

## Migration from Legacy Systems

If migrating from existing audit systems:

1. **Map existing log formats** to new structure
2. **Update logging calls** to use new service
3. **Test validation** on historical data
4. **Run both systems** in parallel during transition
5. **Monitor metrics** for discrepancies

---

## Support

For questions or issues:

- Review this documentation
- Check the test files for usage examples
- Consult the source code comments
- Contact the STRUKT development team

---

## Version History

- **v1.0.0** (2025-10-24): Initial production release
  - Complete audit logging system
  - Performance metrics with Prometheus support
  - Validation tooling
  - Comprehensive documentation
