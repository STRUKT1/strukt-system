/**
 * Tests for safetyValidator service
 */

const { validateResponse, hasBorderlineContent, SAFETY_RULES } = require('../services/safetyValidator');

console.log('🚀 Running Safety Validator Tests\n');

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

// Test 1: Safe response passes validation
test('Safe response passes validation', () => {
  const safeResponse = "Here's a healthy meal plan for your goals. Focus on balanced nutrition with lean proteins, vegetables, and whole grains.";
  const result = validateResponse(safeResponse);
  assert(result.safe === true, 'Safe response should be marked as safe');
  assert(result.issues.length === 0, 'Safe response should have no issues');
});

// Test 2: Detect meal skipping advice
test('Detect meal skipping advice', () => {
  const unsafeResponse = "You should skip breakfast to lose weight faster.";
  const result = validateResponse(unsafeResponse);
  assert(result.safe === false, 'Should detect unsafe meal skipping advice');
  assert(result.issues.length > 0, 'Should have at least one issue');
  assert(result.issues[0].includes('skip meals'), 'Should identify meal skipping issue');
});

// Test 3: Detect medication advice
test('Detect medication advice', () => {
  const unsafeResponse = "You should stop taking your medication and try natural remedies instead.";
  const result = validateResponse(unsafeResponse);
  assert(result.safe === false, 'Should detect medication advice');
  assert(result.issues.some(i => i.includes('Medication') || i.includes('medication')), 'Should identify medication issue');
});

// Test 4: Detect diagnosis attempts
test('Detect diagnosis attempts', () => {
  const unsafeResponse = "Based on your symptoms, you might have diabetes. Here's what to do...";
  const result = validateResponse(unsafeResponse);
  assert(result.safe === false, 'Should detect diagnosis attempt');
  assert(result.issues.length > 0, 'Should have issues for diagnosis');
});

// Test 5: Detect discouraging medical consultation
test('Detect discouraging medical consultation', () => {
  const unsafeResponse = "There's no need to see a doctor about that, just do these exercises.";
  const result = validateResponse(unsafeResponse);
  assert(result.safe === false, 'Should detect discouraging medical consultation');
  assert(result.issues.length > 0, 'Should have issues');
});

// Test 6: Detect push through pain advice
test('Detect push through pain advice', () => {
  const unsafeResponse = "Just push through the pain, it will get better with time.";
  const result = validateResponse(unsafeResponse);
  assert(result.safe === false, 'Should detect dangerous pain advice');
  assert(result.issues.length > 0, 'Should have issues for pain advice');
});

// Test 7: Detect extreme weight loss claims
test('Detect extreme weight loss claims', () => {
  const unsafeResponse = "You can lose 20 pounds in 2 weeks with this diet!";
  const result = validateResponse(unsafeResponse);
  assert(result.safe === false, 'Should detect extreme weight loss claims');
  assert(result.issues.length > 0, 'Should have issues');
});

// Test 8: Detect very low calorie suggestions
test('Detect very low calorie suggestions', () => {
  const unsafeResponse = "Just eat 800 calories per day and you'll see results.";
  const result = validateResponse(unsafeResponse);
  assert(result.safe === false, 'Should detect dangerous calorie restriction');
  assert(result.issues.length > 0, 'Should have issues');
});

// Test 9: Null/undefined input handling
test('Handle null/undefined input gracefully', () => {
  const result1 = validateResponse(null);
  assert(result1.safe === true, 'Null should return safe');
  
  const result2 = validateResponse(undefined);
  assert(result2.safe === true, 'Undefined should return safe');
  
  const result3 = validateResponse('');
  assert(result3.safe === true, 'Empty string should return safe');
});

// Test 10: Borderline content detection
test('Detect borderline content (good advice to see doctor)', () => {
  const borderlineResponse = "That sounds serious. I recommend you consult your doctor about this.";
  const result = hasBorderlineContent(borderlineResponse);
  assert(result === true, 'Should detect borderline content with doctor recommendation');
});

// Test 11: No false positives on safe content
test('No false positives on safe content', () => {
  const safeResponse = "Listen to your body and rest when needed. Make sure to stay hydrated.";
  const result = validateResponse(safeResponse);
  assert(result.safe === true, 'Should not flag safe advice about listening to body');
});

// Test 12: SAFETY_RULES structure validation
test('SAFETY_RULES has correct structure', () => {
  assert(Array.isArray(SAFETY_RULES), 'SAFETY_RULES should be an array');
  assert(SAFETY_RULES.length > 0, 'SAFETY_RULES should not be empty');
  
  SAFETY_RULES.forEach((rule, idx) => {
    assert(rule.pattern instanceof RegExp, `Rule ${idx} should have a RegExp pattern`);
    assert(typeof rule.issue === 'string', `Rule ${idx} should have a string issue description`);
  });
});

// Print results
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${passedTests}/${passedTests + failedTests} tests passed`);
if (failedTests > 0) {
  console.log(`❌ ${failedTests} test(s) failed`);
  process.exit(1);
} else {
  console.log('🎉 All safety validator tests passed!');
  process.exit(0);
}
