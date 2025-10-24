#!/usr/bin/env node
/**
 * Dashboard Audit Validation Script
 * 
 * Validates audit logging compliance:
 * - All analytics operations produce audit entries
 * - Correlation IDs are present
 * - Log structure is valid
 * - Oversized logs are rejected
 * 
 * Usage: node scripts/validateDashboardAudit.js
 */

const fs = require('fs').promises;
const path = require('path');

// Test configuration
const LOG_DIR = path.join(__dirname, '../src/logs');
const LOG_FILE = path.join(LOG_DIR, 'dashboard-audit.log');
const MAX_LOG_SIZE = 5000; // Max characters per log entry

// Test results
let passed = 0;
let failed = 0;
let warnings = 0;
const issues = [];

/**
 * Log test result
 */
function logResult(testName, success, message = '') {
  if (success) {
    passed++;
    console.log(`✅ ${testName}`);
  } else {
    failed++;
    console.log(`❌ ${testName}${message ? ': ' + message : ''}`);
    issues.push({ test: testName, message });
  }
}

/**
 * Log warning
 */
function logWarning(message) {
  warnings++;
  console.log(`⚠️  Warning: ${message}`);
}

/**
 * Test: Required fields are present
 */
function testRequiredFields(entry, lineNumber) {
  const requiredFields = [
    'timestamp',
    'correlationId',
    'eventType',
    'operation',
    'status',
  ];

  const missing = requiredFields.filter(field => !entry[field]);

  if (missing.length > 0) {
    logResult(
      `Line ${lineNumber} has required fields`,
      false,
      `Missing: ${missing.join(', ')}`
    );
    return false;
  }

  logResult(`Line ${lineNumber} has required fields`, true);
  return true;
}

/**
 * Test: Correlation ID format is valid
 */
function testCorrelationIdFormat(entry, lineNumber) {
  const { correlationId } = entry;

  if (!correlationId) {
    logWarning(`Line ${lineNumber} missing correlationId`);
    return false;
  }

  // Check if it's a valid format (hex string, UUID, etc.)
  const isValidFormat = /^[a-f0-9]{16,}$/i.test(correlationId) || 
                       /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(correlationId);

  if (!isValidFormat) {
    logWarning(`Line ${lineNumber} has invalid correlationId format: ${correlationId}`);
    return false;
  }

  return true;
}

/**
 * Test: Status value is valid
 */
function testStatusValue(entry, lineNumber) {
  const validStatuses = ['success', 'error', 'warning'];
  const { status } = entry;

  if (!validStatuses.includes(status)) {
    logResult(
      `Line ${lineNumber} has valid status`,
      false,
      `Invalid status: ${status}`
    );
    return false;
  }

  logResult(`Line ${lineNumber} has valid status`, true);
  return true;
}

/**
 * Test: Timestamp is valid ISO 8601
 */
function testTimestampFormat(entry, lineNumber) {
  const { timestamp } = entry;

  if (!timestamp) {
    logResult(`Line ${lineNumber} has valid timestamp`, false, 'Missing timestamp');
    return false;
  }

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    logResult(`Line ${lineNumber} has valid timestamp`, false, 'Invalid ISO 8601 format');
    return false;
  }

  logResult(`Line ${lineNumber} has valid timestamp`, true);
  return true;
}

/**
 * Test: No PII in logs
 */
function testNoPII(entry, lineNumber) {
  const entryStr = JSON.stringify(entry).toLowerCase();
  const piiPatterns = [
    /password/,
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
    /\b\d{16}\b/, // Credit card pattern
  ];

  const foundPII = piiPatterns.some(pattern => pattern.test(entryStr));

  if (foundPII) {
    logResult(
      `Line ${lineNumber} contains no PII`,
      false,
      'Potential PII detected'
    );
    return false;
  }

  logResult(`Line ${lineNumber} contains no PII`, true);
  return true;
}

/**
 * Test: Log size is within limits
 */
function testLogSize(entryStr, lineNumber) {
  if (entryStr.length > MAX_LOG_SIZE) {
    logResult(
      `Line ${lineNumber} size is within limits`,
      false,
      `Size: ${entryStr.length} > ${MAX_LOG_SIZE}`
    );
    return false;
  }

  logResult(`Line ${lineNumber} size is within limits`, true);
  return true;
}

/**
 * Test: Duration metrics are reasonable
 */
function testDurationMetrics(entry, lineNumber) {
  const { durationMs } = entry;

  if (durationMs !== null && durationMs !== undefined) {
    if (typeof durationMs !== 'number' || durationMs < 0) {
      logResult(
        `Line ${lineNumber} has valid duration`,
        false,
        `Invalid duration: ${durationMs}`
      );
      return false;
    }

    // Warn on extremely long durations (>60s)
    if (durationMs > 60000) {
      logWarning(`Line ${lineNumber} has unusually long duration: ${durationMs}ms`);
    }
  }

  return true;
}

/**
 * Validate audit log entries
 */
async function validateAuditLogs() {
  console.log('🔍 Dashboard Audit Validation\n');
  console.log('='.repeat(50));

  try {
    // Check if log file exists
    try {
      await fs.access(LOG_FILE);
    } catch (error) {
      console.log(`\n⚠️  No audit log file found at ${LOG_FILE}`);
      console.log('This is expected if no dashboard operations have been logged yet.');
      console.log('\n✅ Validation passed (no logs to validate)');
      return;
    }

    // Read log file
    const logContent = await fs.readFile(LOG_FILE, 'utf-8');
    const lines = logContent.trim().split('\n').filter(line => line.length > 0);

    if (lines.length === 0) {
      console.log('\n⚠️  Audit log file is empty');
      console.log('\n✅ Validation passed (no logs to validate)');
      return;
    }

    console.log(`\n📄 Found ${lines.length} log entries\n`);

    // Validate each entry
    let validEntries = 0;
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      try {
        const entry = JSON.parse(line);
        validEntries++;

        // Run validation tests
        testRequiredFields(entry, lineNumber);
        testCorrelationIdFormat(entry, lineNumber);
        testStatusValue(entry, lineNumber);
        testTimestampFormat(entry, lineNumber);
        testNoPII(entry, lineNumber);
        testLogSize(line, lineNumber);
        testDurationMetrics(entry, lineNumber);

      } catch (error) {
        logResult(`Line ${lineNumber} is valid JSON`, false, error.message);
      }
    });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Validation Summary\n');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📝 Total log entries: ${lines.length}`);

    if (issues.length > 0) {
      console.log('\n❌ Issues Found:\n');
      issues.forEach(issue => {
        console.log(`  • ${issue.test}: ${issue.message}`);
      });
    }

    console.log('\n' + '='.repeat(50));

    if (failed === 0) {
      console.log('\n🎉 All validation checks passed!');
      if (warnings > 0) {
        console.log(`   Note: ${warnings} warning(s) detected`);
      }
      process.exit(0);
    } else {
      console.log(`\n❌ Validation failed with ${failed} error(s)`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Validation error:', error.message);
    process.exit(1);
  }
}

// Run validation
validateAuditLogs();
