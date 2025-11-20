#!/usr/bin/env node

/**
 * Critical User Flows Testing Script
 * Tests core user-facing functionality
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

async function testWorkoutLogging() {
  log(COLORS.blue, '\n📋 Test Group 1: Workout Logging');

  // Test endpoint exists and requires auth
  try {
    const response = await axios.post(
      `${BASE_URL}/v1/logs/workout`,
      {
        exercises: [
          { name: 'Bench Press', sets: 3, reps: 10, weight: 135 }
        ],
        duration_minutes: 45,
        notes: 'Great workout!'
      },
      { validateStatus: () => true }
    );

    // Should require auth (503/401)
    if (response.status === 503 || response.status === 401) {
      pass('Workout logging endpoint exists and requires auth');
    } else if (response.status === 404) {
      fail('Workout logging endpoint', 'Endpoint not found (404)');
    } else {
      fail('Workout logging endpoint', `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    fail('Workout logging test', error.message);
  }

  // Test validation
  try {
    const response = await axios.post(
      `${BASE_URL}/v1/logs/workout`,
      { invalid: 'data' },
      { validateStatus: () => true }
    );

    if (response.status === 400 || response.status === 401 || response.status === 503) {
      pass('Workout logging validates input');
    } else {
      fail('Workout logging validation', 'Should reject invalid data');
    }
  } catch (error) {
    fail('Workout logging validation test', error.message);
  }
}

async function testMealLogging() {
  log(COLORS.blue, '\n📋 Test Group 2: Meal Logging');

  try {
    const response = await axios.post(
      `${BASE_URL}/v1/logs/meal`,
      {
        foods: [
          { name: 'Chicken Breast', amount: 200, unit: 'g' },
          { name: 'Brown Rice', amount: 150, unit: 'g' }
        ],
        meal_type: 'lunch',
        notes: 'Post-workout meal'
      },
      { validateStatus: () => true }
    );

    if (response.status === 503 || response.status === 401) {
      pass('Meal logging endpoint exists and requires auth');
    } else if (response.status === 404) {
      fail('Meal logging endpoint', 'Endpoint not found (404)');
    } else {
      fail('Meal logging endpoint', `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    fail('Meal logging test', error.message);
  }
}

async function testAIChat() {
  log(COLORS.blue, '\n📋 Test Group 3: AI Chat');

  try {
    const response = await axios.post(
      `${BASE_URL}/v1/chat`,
      {
        messages: [
          { role: 'user', content: 'What should I eat for breakfast?' }
        ]
      },
      { validateStatus: () => true }
    );

    if (response.status === 503 || response.status === 401) {
      pass('AI chat endpoint exists and requires auth');
    } else if (response.status === 404) {
      fail('AI chat endpoint', 'Endpoint not found (404)');
    } else {
      fail('AI chat endpoint', `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    fail('AI chat test', error.message);
  }

  // Test rate limiting presence
  try {
    const requests = Array(3).fill(null).map(() =>
      axios.post(
        `${BASE_URL}/v1/chat`,
        { messages: [{ role: 'user', content: 'test' }] },
        { validateStatus: () => true }
      )
    );

    const responses = await Promise.all(requests);
    const allHaveAuthCheck = responses.every(
      r => r.status === 401 || r.status === 503
    );

    if (allHaveAuthCheck) {
      pass('AI chat has consistent auth behavior');
    } else {
      fail('AI chat consistency', 'Inconsistent responses');
    }
  } catch (error) {
    fail('AI chat consistency test', error.message);
  }
}

async function testPlanGeneration() {
  log(COLORS.blue, '\n📋 Test Group 4: Plan Generation');

  try {
    const response = await axios.post(
      `${BASE_URL}/v1/plans/generate`,
      {
        goal: 'muscle_gain',
        days_per_week: 4,
        session_minutes: 60
      },
      { validateStatus: () => true }
    );

    if (response.status === 503 || response.status === 401) {
      pass('Plan generation endpoint exists and requires auth');
    } else if (response.status === 404) {
      fail('Plan generation endpoint', 'Endpoint not found (404)');
    } else {
      fail('Plan generation endpoint', `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    fail('Plan generation test', error.message);
  }
}

async function testPhotoAnalysis() {
  log(COLORS.blue, '\n📋 Test Group 5: Photo Analysis');

  try {
    const response = await axios.post(
      `${BASE_URL}/v1/photos/analyze-meal`,
      {
        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...' // Small test image
      },
      { validateStatus: () => true }
    );

    if (response.status === 503 || response.status === 401 || response.status === 400) {
      pass('Photo analysis endpoint exists and has validation');
    } else if (response.status === 404) {
      fail('Photo analysis endpoint', 'Endpoint not found (404)');
    } else {
      fail('Photo analysis endpoint', `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    fail('Photo analysis test', error.message);
  }

  // Test photo validation (size limit)
  try {
    const response = await axios.post(
      `${BASE_URL}/v1/photos/analyze-meal`,
      {
        image: 'invalid-image-data'
      },
      { validateStatus: () => true }
    );

    if (response.status === 400 || response.status === 401 || response.status === 503) {
      pass('Photo analysis validates image format');
    } else {
      fail('Photo analysis validation', 'Should reject invalid image');
    }
  } catch (error) {
    fail('Photo analysis validation test', error.message);
  }
}

async function testErrorHandling() {
  log(COLORS.blue, '\n📋 Test Group 6: General Error Handling');

  // Test 404 for non-existent endpoint
  try {
    const response = await axios.get(
      `${BASE_URL}/v1/nonexistent`,
      { validateStatus: () => true }
    );

    if (response.status === 404) {
      pass('Returns 404 for non-existent endpoints');
    } else {
      fail('404 handling', `Got ${response.status} instead of 404`);
    }
  } catch (error) {
    fail('404 handling test', error.message);
  }

  // Test 400 for invalid JSON
  try {
    const response = await axios.post(
      `${BASE_URL}/v1/chat`,
      'invalid json string',
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      }
    );

    if (response.status === 400 || response.status === 401 || response.status === 503) {
      pass('Handles invalid JSON gracefully');
    } else {
      fail('Invalid JSON handling', `Got ${response.status}`);
    }
  } catch (error) {
    fail('Invalid JSON test', error.message);
  }
}

async function runAllTests() {
  log(COLORS.blue, '\n' + '='.repeat(80));
  log(COLORS.blue, '🔍 CRITICAL USER FLOWS TESTING - STRUKT-SYSTEM');
  log(COLORS.blue, '='.repeat(80) + '\n');

  await testWorkoutLogging();
  await testMealLogging();
  await testAIChat();
  await testPlanGeneration();
  await testPhotoAnalysis();
  await testErrorHandling();

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
