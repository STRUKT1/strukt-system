/**
 * Nutrition Summary Tests
 * 
 * Tests for the nutrition summary endpoint and service
 */

const assert = require('assert');

/**
 * Test nutrition summary validation
 */
function testNutritionSummaryValidation() {
  console.log('🧪 Testing Nutrition Summary Validation...');
  
  try {
    const { validateNutritionSummaryQuery } = require('../src/validation/nutrition');
    
    // Test valid query params
    const validQuery1 = { range: 'today', tz: 'UTC' };
    const result1 = validateNutritionSummaryQuery(validQuery1);
    assert(result1.success, 'Valid query should pass validation');
    assert(result1.data.range === 'today', 'Range should be parsed correctly');
    assert(result1.data.tz === 'UTC', 'Timezone should be parsed correctly');
    console.log('✅ Valid query parameters pass validation');
    
    // Test default values
    const validQuery2 = {};
    const result2 = validateNutritionSummaryQuery(validQuery2);
    assert(result2.success, 'Empty query should use defaults');
    assert(result2.data.range === 'today', 'Should default to today');
    assert(result2.data.tz === 'UTC', 'Should default to UTC');
    console.log('✅ Default values work correctly');
    
    // Test 7d range
    const validQuery3 = { range: '7d', tz: 'Europe/London' };
    const result3 = validateNutritionSummaryQuery(validQuery3);
    assert(result3.success, '7d range should be valid');
    assert(result3.data.range === '7d', '7d range should be parsed correctly');
    assert(result3.data.tz === 'Europe/London', 'Custom timezone should work');
    console.log('✅ 7d range and custom timezone work');
    
    // Test invalid range
    const invalidQuery1 = { range: 'invalid' };
    const result4 = validateNutritionSummaryQuery(invalidQuery1);
    assert(!result4.success, 'Invalid range should fail validation');
    console.log('✅ Invalid range is rejected');
    
    // Test strict validation (unknown fields)
    const invalidQuery2 = { range: 'today', unknown: 'field' };
    const result5 = validateNutritionSummaryQuery(invalidQuery2);
    assert(!result5.success, 'Unknown fields should be rejected');
    console.log('✅ Unknown fields are rejected');
    
    console.log('🎉 All nutrition summary validation tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Nutrition summary validation test failed:', error.message);
    return false;
  }
}

/**
 * Test nutrition service functions
 */
function testNutritionService() {
  console.log('🧪 Testing Nutrition Service...');
  
  try {
    const { extractNutritionTargets } = require('../src/services/nutritionService');
    
    // Test extracting nutrition_targets (preferred)
    const profile1 = {
      nutrition_targets: {
        kcal: 2200,
        protein_g: 160,
        carbs_g: 230,
        fat_g: 70,
        fiber_g: 30,
        method: 'calculated',
        activity_factor: 1.5
      }
    };
    const targets1 = extractNutritionTargets(profile1);
    assert(targets1.kcal === 2200, 'Should extract kcal correctly');
    assert(targets1.protein_g === 160, 'Should extract protein correctly');
    assert(targets1.fiber_g === 30, 'Should extract fiber correctly');
    console.log('✅ nutrition_targets extraction works');
    
    // Test fallback to daily_kcal_target + macro_targets
    const profile2 = {
      daily_kcal_target: 1800,
      macro_targets: {
        protein_g: 120,
        carbs_g: 180,
        fat_g: 60,
        fiber_g: 25
      }
    };
    const targets2 = extractNutritionTargets(profile2);
    assert(targets2.kcal === 1800, 'Should fallback to daily_kcal_target');
    assert(targets2.protein_g === 120, 'Should extract from macro_targets');
    console.log('✅ Fallback to daily_kcal_target + macro_targets works');
    
    // Test empty profile
    const targets3 = extractNutritionTargets({});
    assert(targets3 === null, 'Empty profile should return null');
    console.log('✅ Empty profile returns null');
    
    // Test null/undefined profile
    const targets4 = extractNutritionTargets(null);
    assert(targets4 === null, 'Null profile should return null');
    console.log('✅ Null profile returns null');
    
    console.log('🎉 All nutrition service tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Nutrition service test failed:', error.message);
    return false;
  }
}

/**
 * Test nutrition targets in profile validation
 */
function testProfileTargetsValidation() {
  console.log('🧪 Testing Profile Targets Validation...');
  
  try {
    const { validateProfile } = require('../src/validation/profile');
    
    // Test valid nutrition targets
    const validProfile = {
      full_name: 'Test User',
      daily_kcal_target: 2000,
      macro_targets: {
        protein_g: 150,
        carbs_g: 200,
        fat_g: 65,
        fiber_g: 28
      },
      nutrition_targets: {
        kcal: 2000,
        protein_g: 150,
        carbs_g: 200,
        fat_g: 65,
        fiber_g: 28,
        method: 'calculated',
        activity_factor: 1.4
      }
    };
    
    const result1 = validateProfile(validProfile);
    assert(result1.success, 'Valid nutrition targets should pass validation');
    assert(result1.data.daily_kcal_target === 2000, 'Daily kcal target should be preserved');
    assert(result1.data.macro_targets.protein_g === 150, 'Macro targets should be preserved');
    assert(result1.data.nutrition_targets.kcal === 2000, 'Nutrition targets should be preserved');
    console.log('✅ Valid nutrition targets pass validation');
    
    // Test invalid daily_kcal_target (too low)
    const invalidProfile1 = { daily_kcal_target: 100 };
    const result2 = validateProfile(invalidProfile1);
    assert(!result2.success, 'Too low kcal target should fail validation');
    console.log('✅ Invalid daily kcal target is rejected');
    
    // Test invalid macro values (negative)
    const invalidProfile2 = {
      macro_targets: {
        protein_g: -10,
        carbs_g: 200
      }
    };
    const result3 = validateProfile(invalidProfile2);
    assert(!result3.success, 'Negative macro values should fail validation');
    console.log('✅ Invalid macro values are rejected');
    
    // Test strict validation on macro_targets
    const invalidProfile3 = {
      macro_targets: {
        protein_g: 150,
        unknown_field: 100
      }
    };
    const result4 = validateProfile(invalidProfile3);
    assert(!result4.success, 'Unknown fields in macro_targets should be rejected');
    console.log('✅ Unknown fields in macro_targets are rejected');
    
    console.log('🎉 All profile targets validation tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Profile targets validation test failed:', error.message);
    return false;
  }
}

/**
 * Test meal validation with fiber
 */
function testMealValidationWithFiber() {
  console.log('🧪 Testing Meal Validation with Fiber...');
  
  try {
    const { validateAutoLog } = require('../src/validation/autoLog');
    
    // Test valid meal with fiber
    const validMeal = {
      kind: 'meal',
      data: {
        description: 'Chicken breast with vegetables',
        macros: {
          protein: 35,
          carbs: 12,
          fat: 8,
          fiber: 5
        },
        calories: 240
      }
    };
    
    const result1 = validateAutoLog(validMeal);
    assert(result1.success, 'Valid meal with fiber should pass validation');
    assert(result1.data.data.macros.fiber === 5, 'Fiber should be preserved');
    console.log('✅ Valid meal with fiber passes validation');
    
    // Test meal without fiber (should be optional)
    const validMeal2 = {
      kind: 'meal',
      data: {
        description: 'Simple meal',
        macros: {
          protein: 20,
          carbs: 30,
          fat: 10
        },
        calories: 280
      }
    };
    
    const result2 = validateAutoLog(validMeal2);
    assert(result2.success, 'Meal without fiber should pass validation');
    assert(!result2.data.data.macros.hasOwnProperty('fiber'), 'Fiber should be optional');
    console.log('✅ Meal without fiber passes validation');
    
    console.log('🎉 All meal validation with fiber tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Meal validation with fiber test failed:', error.message);
    return false;
  }
}

/**
 * Run all nutrition tests
 */
function runAllNutritionTests() {
  console.log('🚀 Running Nutrition Summary Tests\n');
  
  const tests = [
    testNutritionSummaryValidation,
    testNutritionService,
    testProfileTargetsValidation,
    testMealValidationWithFiber,
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test ${test.name} threw an error:`, error.message);
      failed++;
    }
    console.log(''); // Add spacing between tests
  }
  
  console.log(`📊 Nutrition Test Results: ${passed}/${tests.length} test suites passed`);
  
  if (failed === 0) {
    console.log('🎉 All nutrition tests passed successfully!');
    return true;
  } else {
    console.log(`❌ ${failed} test suite(s) failed`);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runAllNutritionTests();
  process.exit(success ? 0 : 1);
}

module.exports = {
  testNutritionSummaryValidation,
  testNutritionService,
  testProfileTargetsValidation,
  testMealValidationWithFiber,
  runAllNutritionTests
};