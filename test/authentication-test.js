#!/usr/bin/env node

/**
 * Authentication Testing Script
 * Tests JWT authentication and authorization mechanisms
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function pass(testName) {
  totalTests++;
  passedTests++;
  log(COLORS.green, `✅ PASS: ${testName}`);
}

function fail(testName, reason) {
  totalTests++;
  failedTests++;
  log(COLORS.red, `❌ FAIL: ${testName}`);
  log(COLORS.red, `   Reason: ${reason}`);
}

function skip(testName, reason) {
  totalTests++;
  skippedTests++;
  log(COLORS.yellow, `⏭️  SKIP: ${testName}`);
  log(COLORS.yellow, `   Reason: ${reason}`);
}

// Test protected endpoints
const PROTECTED_ENDPOINTS = [
  { method: 'GET', path: '/v1/profile' },
  { method: 'GET', path: '/v1/profile/export' },
  { method: 'DELETE', path: '/v1/profile' },
  { method: 'POST', path: '/v1/chat' },
  { method: 'POST', path: '/v1/plans/generate' },
  { method: 'POST', path: '/v1/photos/analyze-workout' },
  { method: 'POST', path: '/v1/photos/analyze-meal' },
];

async function testMissingAuth() {
  log(COLORS.blue, '\n📋 Test Group 1: Missing Authentication');

  for (const endpoint of PROTECTED_ENDPOINTS) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        validateStatus: () => true, // Don't throw on any status
      });

      if (response.status === 401 || response.status === 503) {
        pass(`${endpoint.method} ${endpoint.path} - Rejects missing auth`);
      } else {
        fail(
          `${endpoint.method} ${endpoint.path} - Should reject missing auth`,
          `Got status ${response.status} instead of 401/503`
        );
      }
    } catch (error) {
      fail(`${endpoint.method} ${endpoint.path}`, error.message);
    }
  }
}

async function testInvalidAuth() {
  log(COLORS.blue, '\n📋 Test Group 2: Invalid Authentication');

  const invalidTokens = [
    { name: 'Malformed token', value: 'not-a-real-jwt-token' },
    { name: 'Empty token', value: '' },
    { name: 'Invalid format', value: 'Bearer' },
  ];

  for (const tokenTest of invalidTokens) {
    try {
      const response = await axios({
        method: 'GET',
        url: `${BASE_URL}/v1/profile`,
        headers: {
          Authorization: `Bearer ${tokenTest.value}`,
        },
        validateStatus: () => true,
      });

      if (response.status === 401 || response.status === 503) {
        pass(`Rejects ${tokenTest.name}`);
      } else {
        fail(
          `Should reject ${tokenTest.name}`,
          `Got status ${response.status}`
        );
      }
    } catch (error) {
      fail(`Invalid token test: ${tokenTest.name}`, error.message);
    }
  }
}

async function testErrorMessages() {
  log(COLORS.blue, '\n📋 Test Group 3: Error Message Security');

  try {
    const response = await axios({
      method: 'GET',
      url: `${BASE_URL}/v1/profile`,
      validateStatus: () => true,
    });

    const errorMessage = response.data?.message || '';

    // Check error message doesn't leak sensitive info
    const sensitivePatterns = [
      /secret/i,
      /key/i,
      /password/i,
      /token.*expired/i, // Should not reveal token structure
      /database/i,
      /sql/i,
    ];

    let leaksSensitiveInfo = false;
    for (const pattern of sensitivePatterns) {
      if (pattern.test(errorMessage)) {
        leaksSensitiveInfo = true;
        break;
      }
    }

    if (!leaksSensitiveInfo) {
      pass('Error messages do not leak sensitive information');
    } else {
      fail('Error message security', 'Message contains sensitive patterns');
    }

    // Check error response structure
    if (response.data?.code && response.data?.message) {
      pass('Error responses have proper structure (code + message)');
    } else {
      fail('Error response structure', 'Missing code or message field');
    }
  } catch (error) {
    fail('Error message test', error.message);
  }
}

async function testRateLimitingWithAuth() {
  log(COLORS.blue, '\n📋 Test Group 4: Rate Limiting Behavior');

  // Test that rate limiting triggers even without auth
  try {
    // Make multiple requests to a rate-limited endpoint
    const requests = [];
    for (let i = 0; i < 3; i++) {
      requests.push(
        axios({
          method: 'GET',
          url: `${BASE_URL}/v1/profile/export`,
          validateStatus: () => true,
        })
      );
    }

    const responses = await Promise.all(requests);

    // All should fail auth (401/503), but endpoint should exist
    const allRejectAuth = responses.every(
      r => r.status === 401 || r.status === 503
    );

    if (allRejectAuth) {
      pass('Rate limiting endpoints reject unauthenticated requests');
    } else {
      fail('Rate limiting auth behavior', 'Some requests not properly rejected');
    }
  } catch (error) {
    fail('Rate limiting test', error.message);
  }
}

async function testAuthMiddlewareConsistency() {
  log(COLORS.blue, '\n📋 Test Group 5: Middleware Consistency');

  try {
    // Test that all protected endpoints respond consistently
    const responses = await Promise.all(
      PROTECTED_ENDPOINTS.slice(0, 3).map(endpoint =>
        axios({
          method: endpoint.method,
          url: `${BASE_URL}${endpoint.path}`,
          validateStatus: () => true,
        })
      )
    );

    const statuses = responses.map(r => r.status);
    const allSameStatus = statuses.every(s => s === statuses[0]);

    if (allSameStatus) {
      pass('All protected endpoints have consistent auth behavior');
    } else {
      fail(
        'Auth middleware consistency',
        `Got varying statuses: ${statuses.join(', ')}`
      );
    }
  } catch (error) {
    fail('Middleware consistency test', error.message);
  }
}

async function runAllTests() {
  log(COLORS.blue, '\n' + '='.repeat(80));
  log(COLORS.blue, '🔐 AUTHENTICATION TESTING - STRUKT-SYSTEM');
  log(COLORS.blue, '='.repeat(80) + '\n');

  await testMissingAuth();
  await testInvalidAuth();
  await testErrorMessages();
  await testRateLimitingWithAuth();
  await testAuthMiddlewareConsistency();

  // Summary
  log(COLORS.blue, '\n' + '='.repeat(80));
  log(COLORS.blue, '📊 TEST SUMMARY');
  log(COLORS.blue, '='.repeat(80));
  log(COLORS.blue, `Total Tests: ${totalTests}`);
  log(COLORS.green, `Passed: ${passedTests}`);
  log(COLORS.red, `Failed: ${failedTests}`);
  log(COLORS.yellow, `Skipped: ${skippedTests}`);

  const passRate = totalTests > 0
    ? ((passedTests / totalTests) * 100).toFixed(1)
    : 0;
  log(COLORS.blue, `Pass Rate: ${passRate}%`);

  if (failedTests === 0) {
    log(COLORS.green, '\n✅ ALL TESTS PASSED!');
  } else {
    log(COLORS.red, `\n❌ ${failedTests} TEST(S) FAILED`);
  }
  log(COLORS.blue, '='.repeat(80) + '\n');

  process.exit(failedTests > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  log(COLORS.red, `\n❌ Test execution failed: ${error.message}`);
  process.exit(1);
});
