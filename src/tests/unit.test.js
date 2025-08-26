/**
 * Unit tests for validation schemas
 */

// Test profile validation
function testProfileValidation() {
  console.log('🧪 Testing Profile Validation');
  
  const { validateProfile } = require('../validation/profile');
  
  // Test valid data
  const validProfile = {
    full_name: 'John Doe',
    email: 'john@example.com',
    timezone: 'UTC',
    beta_consent: true,
    data_processing_consent: true,
  };
  
  const validResult = validateProfile(validProfile);
  if (!validResult.success) {
    console.log('❌ Valid profile data failed validation');
    return false;
  }
  console.log('✅ Valid profile data passed validation');
  
  // Test invalid data
  const invalidProfile = {
    full_name: 'John Doe',
    email: 'invalid-email',
    unknown_field: 'should be stripped',
  };
  
  const invalidResult = validateProfile(invalidProfile);
  if (invalidResult.success) {
    console.log('❌ Invalid profile data should have failed validation');
    return false;
  }
  console.log('✅ Invalid profile data correctly failed validation');
  
  return true;
}

// Test chat validation
function testChatValidation() {
  console.log('🧪 Testing Chat Validation');
  
  const { validateChatInteraction } = require('../validation/chat');
  
  // Test valid chat
  const validChat = {
    message: 'Hello, how are you?',
    response: 'I am doing well, thank you!',
    context: { source: 'user' },
  };
  
  const validResult = validateChatInteraction(validChat);
  if (!validResult.success) {
    console.log('❌ Valid chat data failed validation');
    return false;
  }
  console.log('✅ Valid chat data passed validation');
  
  // Test invalid chat (empty message)
  const invalidChat = {
    message: '',
    response: 'Response without message',
  };
  
  const invalidResult = validateChatInteraction(invalidChat);
  if (invalidResult.success) {
    console.log('❌ Invalid chat data should have failed validation');
    return false;
  }
  console.log('✅ Invalid chat data correctly failed validation');
  
  return true;
}

// Test auto-log validation
function testAutoLogValidation() {
  console.log('🧪 Testing Auto-log Validation');
  
  const { validateAutoLog } = require('../validation/autoLog');
  
  // Test valid meal log
  const validMealLog = {
    kind: 'meal',
    data: {
      description: 'Breakfast with eggs and toast',
      calories: 350,
      notes: 'Delicious and filling',
    },
  };
  
  const validResult = validateAutoLog(validMealLog);
  if (!validResult.success) {
    console.log('❌ Valid meal log failed validation');
    console.log('Errors:', validResult.error);
    return false;
  }
  console.log('✅ Valid meal log passed validation');
  
  // Test invalid workout log (missing required type)
  const invalidWorkoutLog = {
    kind: 'workout',
    data: {
      description: 'Morning run',
      // Missing required 'type' field
    },
  };
  
  const invalidResult = validateAutoLog(invalidWorkoutLog);
  if (invalidResult.success) {
    console.log('❌ Invalid workout log should have failed validation');
    return false;
  }
  console.log('✅ Invalid workout log correctly failed validation');
  
  return true;
}

// Test logger utilities
function testLogger() {
  console.log('🧪 Testing Logger Utilities');
  
  const logger = require('../lib/logger');
  
  // Test user ID masking
  const testUserId = 'abc123def456ghi789';
  const masked = logger.maskUserId(testUserId);
  
  if (masked !== 'abc123de...') {
    console.log('❌ User ID masking failed');
    console.log('Expected: abc123de..., Got:', masked);
    return false;
  }
  console.log('✅ User ID masking works correctly');
  
  // Test request ID generation
  const requestId = logger.generateRequestId();
  if (!requestId || typeof requestId !== 'string' || requestId.length !== 16) {
    console.log('❌ Request ID generation failed');
    return false;
  }
  console.log('✅ Request ID generation works correctly');
  
  return true;
}

// Main test runner
async function runTests() {
  console.log('🧪 Running Unit Tests for New Functionality\n');
  
  const tests = [
    { name: 'Profile Validation', fn: testProfileValidation },
    { name: 'Chat Validation', fn: testChatValidation },
    { name: 'Auto-log Validation', fn: testAutoLogValidation },
    { name: 'Logger Utilities', fn: testLogger },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} passed\n`);
      } else {
        failed++;
        console.log(`❌ ${test.name} failed\n`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} failed with error: ${error.message}\n`);
    }
  }
  
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
    return true;
  } else {
    console.log('💥 Some tests failed!');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests };