/**
 * Tests for ask controller
 */

console.log('🚀 Running Ask Controller Tests\n');

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

// Test 1: Controller module exports askController
test('Controller module exports askController', () => {
  const { askController } = require('../controllers/ask');
  assert(typeof askController === 'function', 'askController should be a function');
});

// Test 2: Validation rejects empty messages array
test('Validation rejects empty messages array', () => {
  const Joi = require('joi');
  const schema = Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('system', 'user', 'assistant').required(),
          content: Joi.string().max(1000).required(),
        }),
      )
      .min(1)
      .required(),
    userId: Joi.string().uuid().optional(),
    sessionId: Joi.string().optional(),
  });

  const result = schema.validate({ messages: [] });
  assert(result.error !== undefined, 'Empty messages array should fail validation');
});

// Test 3: Validation accepts valid messages
test('Validation accepts valid messages', () => {
  const Joi = require('joi');
  const schema = Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('system', 'user', 'assistant').required(),
          content: Joi.string().max(1000).required(),
        }),
      )
      .min(1)
      .required(),
    userId: Joi.string().uuid().optional(),
    sessionId: Joi.string().optional(),
  });

  const validInput = {
    messages: [
      { role: 'user', content: 'What is a healthy breakfast?' }
    ],
    userId: '550e8400-e29b-41d4-a716-446655440000',
    sessionId: 'test-session-1',
  };

  const result = schema.validate(validInput);
  assert(result.error === undefined, 'Valid messages should pass validation');
});

// Test 4: Validation enforces 1000 character limit
test('Validation enforces 1000 character limit', () => {
  const Joi = require('joi');
  const schema = Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('system', 'user', 'assistant').required(),
          content: Joi.string().max(1000).required(),
        }),
      )
      .min(1)
      .required(),
  });

  const longMessage = 'a'.repeat(1001);
  const result = schema.validate({
    messages: [{ role: 'user', content: longMessage }]
  });

  assert(result.error !== undefined, 'Message over 1000 chars should fail validation');
});

// Test 5: Validation requires valid role
test('Validation requires valid role', () => {
  const Joi = require('joi');
  const schema = Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('system', 'user', 'assistant').required(),
          content: Joi.string().max(1000).required(),
        }),
      )
      .min(1)
      .required(),
  });

  const invalidRole = {
    messages: [{ role: 'invalid', content: 'test' }]
  };

  const result = schema.validate(invalidRole);
  assert(result.error !== undefined, 'Invalid role should fail validation');
});

// Test 6: Validation accepts optional userId as UUID
test('Validation accepts optional userId as UUID', () => {
  const Joi = require('joi');
  const schema = Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('system', 'user', 'assistant').required(),
          content: Joi.string().max(1000).required(),
        }),
      )
      .min(1)
      .required(),
    userId: Joi.string().uuid().optional(),
  });

  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const result = schema.validate({
    messages: [{ role: 'user', content: 'test' }],
    userId: validUUID,
  });

  assert(result.error === undefined, 'Valid UUID should pass validation');
});

// Test 7: Validation rejects invalid UUID format
test('Validation rejects invalid UUID format', () => {
  const Joi = require('joi');
  const schema = Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('system', 'user', 'assistant').required(),
          content: Joi.string().max(1000).required(),
        }),
      )
      .min(1)
      .required(),
    userId: Joi.string().uuid().optional(),
  });

  const invalidUUID = 'not-a-uuid';
  const result = schema.validate({
    messages: [{ role: 'user', content: 'test' }],
    userId: invalidUUID,
  });

  assert(result.error !== undefined, 'Invalid UUID format should fail validation');
});

// Print results
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${passedTests}/${passedTests + failedTests} tests passed`);
if (failedTests > 0) {
  console.log(`❌ ${failedTests} test(s) failed`);
  process.exit(1);
} else {
  console.log('🎉 All ask controller tests passed!');
  process.exit(0);
}
