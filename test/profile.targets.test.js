/**
 * Profile Targets Tests
 * 
 * Tests for the profile targets functionality (PATCH and GET)
 */

const assert = require('assert');

/**
 * Test profile targets validation and sanitization
 */
function testProfileTargetsValidation() {
  console.log('🧪 Testing Profile Targets Validation...');
  
  try {
    const { validateProfile } = require('../src/validation/profile');
    
    // Test valid complete nutrition targets
    const validTargets = {
      daily_kcal_target: 2200,
      macro_targets: {
        protein_g: 160,
        carbs_g: 230,
        fat_g: 70,
        fiber_g: 30
      },
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
    
    const result1 = validateProfile(validTargets);
    assert(result1.success, 'Valid targets should pass validation');
    assert(result1.data.daily_kcal_target === 2200, 'Daily kcal target should be preserved');
    assert(result1.data.macro_targets.protein_g === 160, 'Protein target should be preserved');
    assert(result1.data.nutrition_targets.method === 'calculated', 'Method should be preserved');
    console.log('✅ Complete nutrition targets pass validation');
    
    // Test minimal valid targets
    const minimalTargets = {
      daily_kcal_target: 1800
    };
    
    const result2 = validateProfile(minimalTargets);
    assert(result2.success, 'Minimal targets should pass validation');
    assert(result2.data.daily_kcal_target === 1800, 'Daily kcal should be preserved');
    console.log('✅ Minimal targets pass validation');
    
    // Test invalid kcal target (too low)
    const invalidTargets1 = {
      daily_kcal_target: 200
    };
    
    const result3 = validateProfile(invalidTargets1);
    assert(!result3.success, 'Too low kcal target should fail validation');
    console.log('✅ Invalid kcal target (too low) is rejected');
    
    // Test invalid kcal target (too high)
    const invalidTargets2 = {
      daily_kcal_target: 15000
    };
    
    const result4 = validateProfile(invalidTargets2);
    assert(!result4.success, 'Too high kcal target should fail validation');
    console.log('✅ Invalid kcal target (too high) is rejected');
    
    // Test invalid macro targets (negative values)
    const invalidTargets3 = {
      macro_targets: {
        protein_g: -50,
        carbs_g: 200
      }
    };
    
    const result5 = validateProfile(invalidTargets3);
    assert(!result5.success, 'Negative macro values should fail validation');
    console.log('✅ Negative macro values are rejected');
    
    // Test invalid macro targets (too high values)
    const invalidTargets4 = {
      macro_targets: {
        protein_g: 2000 // Unreasonably high
      }
    };
    
    const result6 = validateProfile(invalidTargets4);
    assert(!result6.success, 'Unreasonably high macro values should fail validation');
    console.log('✅ Unreasonably high macro values are rejected');
    
    // Test unknown fields in macro_targets (strict validation)
    const invalidTargets5 = {
      macro_targets: {
        protein_g: 150,
        unknown_macro: 100
      }
    };
    
    const result7 = validateProfile(invalidTargets5);
    assert(!result7.success, 'Unknown fields in macro_targets should be rejected');
    console.log('✅ Unknown fields in macro_targets are rejected');
    
    // Test invalid activity factor
    const invalidTargets6 = {
      nutrition_targets: {
        kcal: 2000,
        activity_factor: 5.0 // Too high
      }
    };
    
    const result8 = validateProfile(invalidTargets6);
    assert(!result8.success, 'Invalid activity factor should be rejected');
    console.log('✅ Invalid activity factor is rejected');
    
    console.log('🎉 All profile targets validation tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Profile targets validation test failed:', error.message);
    return false;
  }
}

/**
 * Test profile targets in userProfiles service
 */
function testProfileTargetsService() {
  console.log('🧪 Testing Profile Targets Service...');
  
  try {
    const { sanitizeProfileData } = require('../src/services/userProfiles');
    
    // Test that new nutrition target fields are preserved
    const profileWithTargets = {
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
      },
      unknown_field: 'should be removed'
    };
    
    const sanitized = sanitizeProfileData(profileWithTargets);
    
    // Verify valid fields are preserved
    assert(sanitized.full_name === 'Test User', 'Full name should be preserved');
    assert(sanitized.daily_kcal_target === 2000, 'Daily kcal target should be preserved');
    assert(sanitized.macro_targets.protein_g === 150, 'Macro targets should be preserved');
    assert(sanitized.nutrition_targets.kcal === 2000, 'Nutrition targets should be preserved');
    assert(sanitized.nutrition_targets.method === 'calculated', 'Method should be preserved');
    
    // Verify unknown fields are removed
    assert(!sanitized.hasOwnProperty('unknown_field'), 'Unknown fields should be removed');
    
    console.log('✅ Nutrition target fields are preserved and unknown fields removed');
    
    // Test with null values (should be filtered out)
    const profileWithNulls = {
      daily_kcal_target: null,
      macro_targets: {
        protein_g: 150,
        carbs_g: null
      },
      full_name: 'Valid Name'
    };
    
    const sanitizedNulls = sanitizeProfileData(profileWithNulls);
    assert(!sanitizedNulls.hasOwnProperty('daily_kcal_target'), 'Null values should be filtered out');
    assert(sanitizedNulls.hasOwnProperty('macro_targets'), 'Objects should be preserved even if they contain nulls');
    assert(sanitizedNulls.macro_targets.protein_g === 150, 'Valid nested values should be preserved');
    assert(sanitizedNulls.full_name === 'Valid Name', 'Other valid values should be preserved');
    
    console.log('✅ Null values are properly filtered out at top level');
    
    console.log('🎉 All profile targets service tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Profile targets service test failed:', error.message);
    return false;
  }
}

/**
 * Test profile update payload validation
 */
function testProfileUpdatePayload() {
  console.log('🧪 Testing Profile Update Payload...');
  
  try {
    const { validateProfile } = require('../src/validation/profile');
    
    // Test PATCH-style update with only targets
    const patchPayload = {
      daily_kcal_target: 2100,
      macro_targets: {
        protein_g: 140,
        carbs_g: 220,
        fat_g: 75
      }
    };
    
    const result1 = validateProfile(patchPayload);
    assert(result1.success, 'PATCH payload with targets should pass validation');
    assert(result1.data.daily_kcal_target === 2100, 'Updated kcal target should be preserved');
    assert(result1.data.macro_targets.protein_g === 140, 'Updated protein target should be preserved');
    console.log('✅ PATCH payload with targets passes validation');
    
    // Test partial macro_targets update
    const partialMacroUpdate = {
      macro_targets: {
        protein_g: 180
        // Other macros intentionally omitted
      }
    };
    
    const result2 = validateProfile(partialMacroUpdate);
    assert(result2.success, 'Partial macro update should pass validation');
    assert(result2.data.macro_targets.protein_g === 180, 'Updated protein should be preserved');
    assert(!result2.data.macro_targets.hasOwnProperty('carbs_g'), 'Omitted macros should not be present');
    console.log('✅ Partial macro targets update passes validation');
    
    // Test nutrition_targets update
    const fullTargetsUpdate = {
      nutrition_targets: {
        kcal: 1900,
        protein_g: 135,
        carbs_g: 190,
        fat_g: 60,
        fiber_g: 25,
        method: 'manual',
        activity_factor: 1.3
      }
    };
    
    const result3 = validateProfile(fullTargetsUpdate);
    assert(result3.success, 'Full nutrition targets update should pass validation');
    assert(result3.data.nutrition_targets.method === 'manual', 'Method should be preserved');
    assert(result3.data.nutrition_targets.activity_factor === 1.3, 'Activity factor should be preserved');
    console.log('✅ Full nutrition targets update passes validation');
    
    console.log('🎉 All profile update payload tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Profile update payload test failed:', error.message);
    return false;
  }
}

/**
 * Run all profile targets tests
 */
function runAllProfileTargetsTests() {
  console.log('🚀 Running Profile Targets Tests\n');
  
  const tests = [
    testProfileTargetsValidation,
    testProfileTargetsService,
    testProfileUpdatePayload,
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
  
  console.log(`📊 Profile Targets Test Results: ${passed}/${tests.length} test suites passed`);
  
  if (failed === 0) {
    console.log('🎉 All profile targets tests passed successfully!');
    return true;
  } else {
    console.log(`❌ ${failed} test suite(s) failed`);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runAllProfileTargetsTests();
  process.exit(success ? 0 : 1);
}

module.exports = {
  testProfileTargetsValidation,
  testProfileTargetsService,
  testProfileUpdatePayload,
  runAllProfileTargetsTests
};