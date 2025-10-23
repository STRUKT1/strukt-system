/**
 * Tests for toneFilterService
 * 
 * Comprehensive tests covering dangerous phrases, misgendering, moral shaming,
 * prescriptive commands, and emotional insensitivity.
 */

const { validateTone, checkToneSafety, analyzeSentiment, TONE_SAFETY_RULES } = require('../src/services/toneFilterService');

console.log('🚀 Running Tone Filter Service Tests\n');

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

// ==================== SAFE RESPONSES ====================

test('Safe supportive response passes all checks', () => {
  const safeResponse = "Great job logging your workout today! You're making consistent progress. How are you feeling about your energy levels?";
  const result = validateTone(safeResponse);
  assert(result.safe === true, 'Safe response should be marked as safe');
  assert(result.issues.length === 0, 'Safe response should have no issues');
  assert(result.severity === 'low', 'Safe response should have low severity');
});

test('Encouraging response with positive tone passes', () => {
  const safeResponse = "I can see you're putting in the effort, and that's what matters. Let's focus on what's working well for you.";
  const result = validateTone(safeResponse);
  assert(result.safe === true, 'Encouraging response should be safe');
  assert(result.issues.length === 0, 'Should have no tone issues');
});

// ==================== JUDGMENTAL PHRASES ====================

test('Detects "you failed" as judgmental', () => {
  const unsafeResponse = "You failed to complete your workout plan this week.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect judgmental failure language');
  assert(result.issues.length > 0, 'Should have tone issues');
  assert(result.issues.some(i => i.includes('failure-oriented')), 'Should identify failure language');
});

test('Detects "why didn\'t you" as accusatory', () => {
  const unsafeResponse = "Why didn't you complete your meals yesterday?";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect accusatory questioning');
  assert(result.issues.some(i => i.includes('accusatory')), 'Should identify accusatory tone');
});

test('Detects "should have" as regret-inducing', () => {
  const unsafeResponse = "You should have done your workout this morning.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect regret-inducing language');
  assert(result.issues.some(i => i.includes('past regret')), 'Should identify regret tone');
});

test('Detects derogatory terms (lazy, weak)', () => {
  const unsafeResponse = "You're being lazy about your fitness goals.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect derogatory language');
  assert(result.severity === 'high', 'Should be high severity');
  assert(result.issues.some(i => i.includes('derogatory')), 'Should identify derogatory terms');
});

// ==================== SARCASM & PASSIVE-AGGRESSION ====================

test('Detects sarcastic tone ("yeah right")', () => {
  const unsafeResponse = "Yeah right, I'm sure you'll stick to your plan this time.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect sarcastic tone');
  assert(result.issues.some(i => i.includes('Sarcastic')), 'Should identify sarcasm');
});

test('Detects passive-aggressive tone ("good luck with that")', () => {
  const unsafeResponse = "Good luck with that workout plan of yours.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect passive-aggressive tone');
  assert(result.issues.some(i => i.includes('Passive-aggressive')), 'Should identify passive-aggression');
});

// ==================== HARMFUL DIET/FITNESS ADVICE ====================

test('Detects meal skipping advice', () => {
  const unsafeResponse = "Try to skip meals to accelerate your weight loss.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect meal skipping advice');
  assert(result.severity === 'high', 'Should be high severity');
  assert(result.issues.some(i => i.includes('meal skipping')), 'Should identify meal skipping');
});

test('Detects "don\'t eat" restrictive advice', () => {
  const unsafeResponse = "Just don't eat after 6pm and you'll lose weight.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect restrictive eating advice');
  assert(result.severity === 'high', 'Should be high severity');
});

test('Detects starvation language', () => {
  const unsafeResponse = "Starve yourself for a day to reset your metabolism.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect starvation promotion');
  assert(result.severity === 'high', 'Should be high severity');
});

test('Detects "push through pain" advice', () => {
  const unsafeResponse = "Just push through the pain during your workout.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect dangerous pain advice');
  assert(result.severity === 'high', 'Should be high severity');
});

test('Detects "no pain no gain" mentality', () => {
  const unsafeResponse = "Remember, no pain, no gain! Push harder.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect pain tolerance promotion');
  assert(result.issues.some(i => i.includes('pain tolerance')), 'Should identify pain promotion');
});

// ==================== PRESCRIPTIVE/COMMANDING TONE ====================

test('Detects prescriptive "must do" commands', () => {
  const unsafeResponse = "You must do 100 push-ups every day.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect prescriptive commanding');
  assert(result.issues.some(i => i.includes('commanding language')), 'Should identify commands');
});

test('Detects "you will" commanding tone', () => {
  const unsafeResponse = "You will eat exactly 1500 calories per day.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect commanding future actions');
  assert(result.issues.some(i => i.includes('commanding future')), 'Should identify future commands');
});

// ==================== BODY SHAMING & MORAL FRAMING ====================

test('Detects body-negative weight labels', () => {
  const unsafeResponse = "You're overweight and need to change that.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect body-negative language');
  assert(result.severity === 'high', 'Should be high severity');
  assert(result.issues.some(i => i.includes('weight-based labels')), 'Should identify weight labels');
});

test('Detects rapid weight loss promotion', () => {
  const unsafeResponse = "You can lose weight fast with this approach.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect rapid weight loss');
  assert(result.severity === 'high', 'Should be high severity');
});

test('Detects moral food framing ("cheat meal", "being bad")', () => {
  const unsafeResponse = "That cheat meal was being bad - you need to be good tomorrow.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect moral food framing');
  assert(result.issues.some(i => i.includes('morality to food')), 'Should identify moral framing');
});

// ==================== MISGENDERING & NON-INCLUSIVE LANGUAGE ====================

test('Detects binary gender assumptions (he/she)', () => {
  const unsafeResponse = "Tell him/her to complete their workout.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect binary gender language');
  assert(result.issues.some(i => i.includes('binary gender')), 'Should identify non-inclusive gender');
});

test('Detects gendered casual terms (guys, dude)', () => {
  const unsafeResponse = "Hey guys, let's crush this workout!";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect gendered casual language');
  assert(result.issues.some(i => i.includes('gendered casual')), 'Should identify gendered terms');
});

// ==================== EMOTIONAL INSENSITIVITY ====================

test('Detects dismissive mental health responses', () => {
  const unsafeResponse = "Just get over it and stop worrying about your anxiety.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect dismissive mental health language');
  assert(result.severity === 'high', 'Should be high severity');
  assert(result.issues.some(i => i.includes('mental health')), 'Should identify mental health dismissal');
});

test('Detects invalidating feelings ("it\'s in your head")', () => {
  const unsafeResponse = "Your stress is all in your head, just relax.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect feeling invalidation');
  assert(result.severity === 'high', 'Should be high severity');
});

test('Detects commanding emotional change', () => {
  const unsafeResponse = "Stop being sad and just focus on your goals.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect emotional commanding');
  assert(result.severity === 'high', 'Should be high severity');
});

// ==================== ABLEIST LANGUAGE ====================

test('Detects ableist terms (crazy, insane)', () => {
  const unsafeResponse = "That's a crazy idea for your workout plan.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect ableist language');
  assert(result.severity === 'high', 'Should be high severity');
  assert(result.issues.some(i => i.includes('Ableist')), 'Should identify ableist language');
});

// ==================== SENTIMENT ANALYSIS ====================

test('Sentiment analysis detects positive tone', () => {
  const positiveResponse = "Great work! You're making excellent progress and I'm proud of your achievements.";
  const sentiment = analyzeSentiment(positiveResponse);
  assert(sentiment.sentiment === 'positive', 'Should detect positive sentiment');
  assert(sentiment.confidence > 0.5, 'Should have reasonable confidence');
});

test('Sentiment analysis detects negative tone', () => {
  const negativeResponse = "That's terrible, awful, and horrible. You're hopeless.";
  const sentiment = analyzeSentiment(negativeResponse);
  assert(sentiment.sentiment === 'negative', 'Should detect negative sentiment');
  assert(sentiment.confidence > 0.5, 'Should have reasonable confidence');
});

test('Sentiment analysis handles neutral tone', () => {
  const neutralResponse = "Here's your workout plan for today.";
  const sentiment = analyzeSentiment(neutralResponse);
  assert(sentiment.sentiment === 'neutral', 'Should detect neutral sentiment');
});

// ==================== EDGE CASES ====================

test('Handles null input gracefully', () => {
  const result = validateTone(null);
  assert(result.safe === true, 'Null should return safe');
  assert(result.issues.length === 0, 'Should have no issues');
});

test('Handles undefined input gracefully', () => {
  const result = validateTone(undefined);
  assert(result.safe === true, 'Undefined should return safe');
  assert(result.issues.length === 0, 'Should have no issues');
});

test('Handles empty string input', () => {
  const result = validateTone('');
  assert(result.safe === true, 'Empty string should return safe');
  assert(result.issues.length === 0, 'Should have no issues');
});

// ==================== MULTIPLE ISSUES ====================

test('Detects multiple tone issues in single response', () => {
  const unsafeResponse = "You failed again. Why didn't you try harder? You're lazy and this is pathetic.";
  const result = validateTone(unsafeResponse);
  assert(result.safe === false, 'Should detect unsafe tone');
  assert(result.issues.length >= 3, 'Should detect multiple issues');
  assert(result.severity === 'high', 'Should be high severity with multiple issues');
});

// ==================== STRUCTURE VALIDATION ====================

test('TONE_SAFETY_RULES has correct structure', () => {
  assert(Array.isArray(TONE_SAFETY_RULES), 'TONE_SAFETY_RULES should be an array');
  assert(TONE_SAFETY_RULES.length > 0, 'TONE_SAFETY_RULES should not be empty');
  
  TONE_SAFETY_RULES.forEach((rule, idx) => {
    assert(rule.pattern instanceof RegExp, `Rule ${idx} should have a RegExp pattern`);
    assert(typeof rule.issue === 'string', `Rule ${idx} should have a string issue description`);
    assert(['low', 'medium', 'high'].includes(rule.severity), `Rule ${idx} should have valid severity`);
  });
});

test('validateTone returns proper structure', () => {
  const response = "Test response";
  const result = validateTone(response);
  
  assert(typeof result.safe === 'boolean', 'Should have boolean safe property');
  assert(Array.isArray(result.issues), 'Should have issues array');
  assert(typeof result.severity === 'string', 'Should have severity string');
  assert(typeof result.sentiment === 'string', 'Should have sentiment string');
  assert(typeof result.details === 'object', 'Should have details object');
});

// Print results
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${passedTests}/${passedTests + failedTests} tests passed`);
if (failedTests > 0) {
  console.log(`❌ ${failedTests} test(s) failed`);
  process.exit(1);
} else {
  console.log('🎉 All tone filter service tests passed!');
  process.exit(0);
}
