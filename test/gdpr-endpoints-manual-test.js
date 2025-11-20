#!/usr/bin/env node

/**
 * Manual Test Script for GDPR Endpoints (HIGH-006, HIGH-007)
 *
 * This script tests both SAR and Account Deletion endpoints
 * to verify GDPR compliance before TestFlight launch.
 *
 * CRITICAL: These endpoints MUST work for legal compliance!
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logTest(testName, status, details = '') {
  const symbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';

  log(`${symbol} ${testName}`, color);
  if (details) {
    log(`   ${details}`, 'reset');
  }

  results.tests.push({ testName, status, details });

  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else results.skipped++;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * TEST SUITE 1: SAR ENDPOINT (Subject Access Request)
 * GET /v1/profile/export
 */
async function testSAREndpoint() {
  log('\n=== TEST SUITE 1: SAR ENDPOINT (GET /v1/profile/export) ===', 'blue');

  // Test 1.1: Without authentication (should fail with 401 or 503)
  try {
    log('\nTest 1.1: SAR without authentication', 'magenta');
    const response = await axios.get(`${BASE_URL}/v1/profile/export`, {
      validateStatus: () => true, // Don't throw on non-2xx
    });

    if (response.status === 401 || response.status === 503) {
      logTest('Test 1.1: SAR without auth', 'PASS',
        `Status: ${response.status}, Code: ${response.data.code}`);
      log(`   Response: ${JSON.stringify(response.data)}`, 'reset');
    } else {
      logTest('Test 1.1: SAR without auth', 'FAIL',
        `Expected 401 or 503, got ${response.status}`);
    }
  } catch (error) {
    logTest('Test 1.1: SAR without auth', 'FAIL', error.message);
  }

  // Test 1.2: With invalid token (should fail with 401)
  try {
    log('\nTest 1.2: SAR with invalid token', 'magenta');
    const response = await axios.get(`${BASE_URL}/v1/profile/export`, {
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
      },
      validateStatus: () => true,
    });

    if (response.status === 401 || response.status === 503) {
      logTest('Test 1.2: SAR with invalid token', 'PASS',
        `Status: ${response.status}, Code: ${response.data.code}`);
      log(`   Response: ${JSON.stringify(response.data)}`, 'reset');
    } else {
      logTest('Test 1.2: SAR with invalid token', 'FAIL',
        `Expected 401 or 503, got ${response.status}`);
    }
  } catch (error) {
    logTest('Test 1.2: SAR with invalid token', 'FAIL', error.message);
  }

  // Test 1.3: With malformed auth header (should fail)
  try {
    log('\nTest 1.3: SAR with malformed auth header', 'magenta');
    const response = await axios.get(`${BASE_URL}/v1/profile/export`, {
      headers: {
        'Authorization': 'NotBearer token',
      },
      validateStatus: () => true,
    });

    if (response.status === 401 || response.status === 503) {
      logTest('Test 1.3: SAR with malformed auth', 'PASS',
        `Status: ${response.status}, Code: ${response.data.code}`);
    } else {
      logTest('Test 1.3: SAR with malformed auth', 'FAIL',
        `Expected 401 or 503, got ${response.status}`);
    }
  } catch (error) {
    logTest('Test 1.3: SAR with malformed auth', 'FAIL', error.message);
  }

  // Test 1.4: Rate limiting (needs valid token - SKIP for now)
  logTest('Test 1.4: SAR rate limiting (5 req/hour)', 'SKIP',
    'Requires valid Supabase JWT token');

  // Test 1.5: Valid request (needs valid token - SKIP for now)
  logTest('Test 1.5: SAR valid request with token', 'SKIP',
    'Requires valid Supabase JWT token and test data');
}

/**
 * TEST SUITE 2: ACCOUNT DELETION ENDPOINT
 * DELETE /v1/profile
 */
async function testDeletionEndpoint() {
  log('\n=== TEST SUITE 2: ACCOUNT DELETION ENDPOINT (DELETE /v1/profile) ===', 'blue');

  // Test 2.1: Without authentication (should fail with 401 or 503)
  try {
    log('\nTest 2.1: Deletion without authentication', 'magenta');
    const response = await axios.delete(`${BASE_URL}/v1/profile`, {
      data: { confirmation: 'DELETE_MY_ACCOUNT_PERMANENTLY' },
      validateStatus: () => true,
    });

    if (response.status === 401 || response.status === 503) {
      logTest('Test 2.1: Deletion without auth', 'PASS',
        `Status: ${response.status}, Code: ${response.data.code}`);
      log(`   Response: ${JSON.stringify(response.data)}`, 'reset');
    } else {
      logTest('Test 2.1: Deletion without auth', 'FAIL',
        `Expected 401 or 503, got ${response.status}`);
    }
  } catch (error) {
    logTest('Test 2.1: Deletion without auth', 'FAIL', error.message);
  }

  // Test 2.2: With invalid token (should fail with 401)
  try {
    log('\nTest 2.2: Deletion with invalid token', 'magenta');
    const response = await axios.delete(`${BASE_URL}/v1/profile`, {
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
      },
      data: { confirmation: 'DELETE_MY_ACCOUNT_PERMANENTLY' },
      validateStatus: () => true,
    });

    if (response.status === 401 || response.status === 503) {
      logTest('Test 2.2: Deletion with invalid token', 'PASS',
        `Status: ${response.status}, Code: ${response.data.code}`);
    } else {
      logTest('Test 2.2: Deletion with invalid token', 'FAIL',
        `Expected 401 or 503, got ${response.status}`);
    }
  } catch (error) {
    logTest('Test 2.2: Deletion with invalid token', 'FAIL', error.message);
  }

  // Test 2.3-2.6: Need valid auth - SKIP for now
  logTest('Test 2.3: Deletion without confirmation token', 'SKIP',
    'Requires valid Supabase JWT token');
  logTest('Test 2.4: Deletion with wrong confirmation', 'SKIP',
    'Requires valid Supabase JWT token');
  logTest('Test 2.5: Valid deletion (DESTRUCTIVE)', 'SKIP',
    'Requires valid Supabase JWT token and TEST ACCOUNT');
  logTest('Test 2.6: Verify deletion completeness', 'SKIP',
    'Requires valid Supabase JWT token and TEST ACCOUNT');
  logTest('Test 2.7: Deletion rate limiting (2 req/day)', 'SKIP',
    'Requires valid Supabase JWT token and multiple test accounts');
}

/**
 * TEST SUITE 3: ENDPOINT AVAILABILITY
 */
async function testEndpointAvailability() {
  log('\n=== TEST SUITE 3: ENDPOINT AVAILABILITY ===', 'blue');

  // Test 3.1: Server health check
  try {
    log('\nTest 3.1: Server health check', 'magenta');
    const response = await axios.get(`${BASE_URL}/health`);

    if (response.status === 200 && response.data.ok === true) {
      logTest('Test 3.1: Server health', 'PASS',
        `Version: ${response.data.version}, Env: ${response.data.env}`);
    } else {
      logTest('Test 3.1: Server health', 'FAIL',
        `Unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logTest('Test 3.1: Server health', 'FAIL', error.message);
  }

  // Test 3.2: SAR endpoint exists
  try {
    log('\nTest 3.2: SAR endpoint exists (routing check)', 'magenta');
    const response = await axios.get(`${BASE_URL}/v1/profile/export`, {
      validateStatus: () => true,
    });

    // Should return 401/503, not 404
    if (response.status !== 404) {
      logTest('Test 3.2: SAR endpoint exists', 'PASS',
        `Endpoint found (status: ${response.status}, not 404)`);
    } else {
      logTest('Test 3.2: SAR endpoint exists', 'FAIL',
        'Endpoint returns 404 - not registered');
    }
  } catch (error) {
    logTest('Test 3.2: SAR endpoint exists', 'FAIL', error.message);
  }

  // Test 3.3: Deletion endpoint exists
  try {
    log('\nTest 3.3: Deletion endpoint exists (routing check)', 'magenta');
    const response = await axios.delete(`${BASE_URL}/v1/profile`, {
      validateStatus: () => true,
    });

    // Should return 401/503, not 404
    if (response.status !== 404) {
      logTest('Test 3.3: Deletion endpoint exists', 'PASS',
        `Endpoint found (status: ${response.status}, not 404)`);
    } else {
      logTest('Test 3.3: Deletion endpoint exists', 'FAIL',
        'Endpoint returns 404 - not registered');
    }
  } catch (error) {
    logTest('Test 3.3: Deletion endpoint exists', 'FAIL', error.message);
  }
}

/**
 * Print summary report
 */
function printSummary() {
  log('\n' + '='.repeat(80), 'blue');
  log('TEST SUMMARY', 'blue');
  log('='.repeat(80), 'blue');

  log(`\n✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⏭️  Skipped: ${results.skipped}`, 'yellow');
  log(`📊 Total: ${results.tests.length}`, 'blue');

  const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  log(`\n📈 Pass Rate: ${passRate}% (excluding skipped)`,
    passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');

  log('\n' + '='.repeat(80), 'blue');
  log('NEXT STEPS FOR COMPLETE TESTING', 'yellow');
  log('='.repeat(80), 'blue');

  log('\n⚠️  CRITICAL: The following tests require Supabase configuration:', 'yellow');
  log('   1. Configure Supabase credentials in .env file', 'reset');
  log('   2. Create a test user account via Supabase Auth', 'reset');
  log('   3. Get a valid JWT token for the test user', 'reset');
  log('   4. Add test data (workouts, meals, etc.) for that user', 'reset');
  log('   5. Re-run tests with valid authentication', 'reset');

  log('\n📝 Skipped tests that MUST be completed before TestFlight:', 'yellow');
  const skipped = results.tests.filter(t => t.status === 'SKIP');
  skipped.forEach((test, i) => {
    log(`   ${i + 1}. ${test.testName}`, 'yellow');
    if (test.details) {
      log(`      Reason: ${test.details}`, 'reset');
    }
  });

  if (results.failed > 0) {
    log('\n❌ Failed tests that need immediate attention:', 'red');
    const failed = results.tests.filter(t => t.status === 'FAIL');
    failed.forEach((test, i) => {
      log(`   ${i + 1}. ${test.testName}`, 'red');
      if (test.details) {
        log(`      Error: ${test.details}`, 'reset');
      }
    });
  }

  log('\n' + '='.repeat(80), 'blue');
}

/**
 * Main test execution
 */
async function runTests() {
  log('\n🧪 GDPR ENDPOINTS MANUAL TEST SUITE', 'blue');
  log('Testing SAR (HIGH-006) and Account Deletion (HIGH-007) endpoints', 'blue');
  log('='.repeat(80), 'blue');

  try {
    // Run test suites
    await testEndpointAvailability();
    await testSAREndpoint();
    await testDeletionEndpoint();

    // Print summary
    printSummary();

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    log(`\n💥 Test execution failed: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

// Check if server is running first
async function checkServerRunning() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Entry point
(async () => {
  const serverRunning = await checkServerRunning();

  if (!serverRunning) {
    log('❌ Server is not running on http://localhost:4000', 'red');
    log('Please start the server first: npm start', 'yellow');
    process.exit(1);
  }

  await runTests();
})();
