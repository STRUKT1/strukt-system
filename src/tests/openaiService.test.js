/**
 * Tests for openaiService enhancements
 */

const { getFallbackResponse } = require('../../services/openaiService');

console.log('🚀 Running OpenAI Service Tests\n');

let passedTests = 0;
let failedTests = 0;

function test(description, testFn) {
  try {
    testFn();
    console.log(`✅ ${description}`);
    passedTests++;
  } catch (err) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${err.message}`);
    failedTests++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test 1: getFallbackResponse returns default message
test('getFallbackResponse returns default message', () => {
  const response = getFallbackResponse();
  assert(typeof response === 'string', 'Should return a string');
  assert(response.length > 0, 'Should return non-empty string');
  assert(response.includes('support@strukt.com'), 'Should include support contact');
});

// Test 2: getFallbackResponse handles timeout type
test('getFallbackResponse handles timeout type', () => {
  const response = getFallbackResponse('timeout');
  assert(typeof response === 'string', 'Should return a string');
  assert(response.includes('longer than usual'), 'Should mention timeout context');
  assert(response.includes('support@strukt.com'), 'Should include support contact');
});

// Test 3: getFallbackResponse handles error type
test('getFallbackResponse handles error type', () => {
  const response = getFallbackResponse('error');
  assert(typeof response === 'string', 'Should return a string');
  assert(response.includes('technical difficulties'), 'Should mention technical difficulties');
  assert(response.includes('support@strukt.com'), 'Should include support contact');
});

// Test 4: getFallbackResponse handles unsafe type
test('getFallbackResponse handles unsafe type', () => {
  const response = getFallbackResponse('unsafe');
  assert(typeof response === 'string', 'Should return a string');
  assert(response.includes('healthcare professional') || response.includes('qualified'), 'Should recommend healthcare professional');
});

// Test 5: getFallbackResponse handles unknown type gracefully
test('getFallbackResponse handles unknown type gracefully', () => {
  const response = getFallbackResponse('unknown_type_xyz');
  assert(typeof response === 'string', 'Should return a string');
  assert(response.length > 0, 'Should return non-empty fallback');
});

// Test 6: All fallback messages are user-friendly
test('All fallback messages are user-friendly', () => {
  const types = ['default', 'timeout', 'error', 'unsafe'];
  
  types.forEach(type => {
    const response = getFallbackResponse(type);
    assert(!response.includes('Error:'), 'Should not include raw error messages');
    assert(!response.includes('Exception'), 'Should not include exception terms');
    assert(!response.includes('undefined'), 'Should not include undefined');
  });
});

// Print results
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${passedTests}/${passedTests + failedTests} tests passed`);
if (failedTests > 0) {
  console.log(`❌ ${failedTests} test(s) failed`);
  process.exit(1);
} else {
  console.log('🎉 All OpenAI service tests passed!');
  process.exit(0);
}
