#!/usr/bin/env node

/**
 * Supabase Smoke Test (CI-friendly)
 * 
 * This test validates Supabase integration without requiring actual credentials.
 * It checks configuration, module loading, and basic connectivity patterns.
 * Safe to run in CI environments without exposing secrets.
 */

console.log('🧪 Running Supabase Smoke Tests...\n');

let exitCode = 0;

// Test 1: Environment configuration validation
console.log('📋 Test 1: Environment Configuration');
try {
  // Check that required env vars are defined in .env.example
  const fs = require('fs');
  const envExample = fs.readFileSync('.env.example', 'utf8');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATA_BACKEND_PRIMARY',
    'DUAL_WRITE'
  ];
  
  for (const varName of requiredVars) {
    if (envExample.includes(varName)) {
      console.log(`✅ ${varName} is defined in .env.example`);
    } else {
      console.log(`❌ ${varName} is missing from .env.example`);
      exitCode = 1;
    }
  }
  
  // Check defaults
  if (envExample.includes('DATA_BACKEND_PRIMARY=supabase')) {
    console.log('✅ DATA_BACKEND_PRIMARY defaults to supabase');
  } else {
    console.log('❌ DATA_BACKEND_PRIMARY should default to supabase');
    exitCode = 1;
  }
  
  if (envExample.includes('DUAL_WRITE=false')) {
    console.log('✅ DUAL_WRITE defaults to false');
  } else {
    console.log('❌ DUAL_WRITE should default to false');
    exitCode = 1;
  }
  
} catch (error) {
  console.error('❌ Environment configuration test failed:', error.message);
  exitCode = 1;
}

// Test 2: Module loading without credentials
console.log('\n📋 Test 2: Module Loading (No Credentials Required)');
try {
  // Test that modules can be loaded without credentials
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // This should load successfully without throwing
  const userProfilesModule = require('../src/services/userProfiles');
  console.log('✅ userProfiles module loads successfully');
  
  // Test service configuration
  const config = userProfilesModule.getServiceConfig();
  if (config.DATA_BACKEND_PRIMARY === 'supabase') {
    console.log('✅ Service defaults to supabase backend');
  } else {
    console.log('❌ Service should default to supabase backend');
    exitCode = 1;
  }
  
  if (config.DUAL_WRITE === false) {
    console.log('✅ Dual-write defaults to false');
  } else {
    console.log('❌ Dual-write should default to false');
    exitCode = 1;
  }
  
} catch (error) {
  console.error('❌ Module loading test failed:', error.message);
  exitCode = 1;
}

// Test 3: Service modules loading
console.log('\n📋 Test 3: Service Modules Loading');
const serviceModules = [
  'workouts', 'meals', 'sleep', 'supplements', 'mood', 'chat'
];

for (const serviceName of serviceModules) {
  try {
    const serviceModule = require(`../src/services/logs/${serviceName}`);
    console.log(`✅ ${serviceName} service module loads successfully`);
    
    // Check that sanitize function exists for security
    if (serviceName === 'sleep') {
      if (typeof serviceModule.sanitizeSleepData === 'function') {
        console.log(`✅ ${serviceName} has input sanitization function`);
      } else {
        console.log(`⚠️  ${serviceName} missing input sanitization function`);
      }
    } else if (serviceName === 'chat') {
      if (typeof serviceModule.sanitizeChatData === 'function') {
        console.log(`✅ ${serviceName} has input sanitization function`);
      } else {
        console.log(`⚠️  ${serviceName} missing input sanitization function`);
      }
    } else if (serviceName === 'supplements') {
      if (typeof serviceModule.sanitizeSupplementData === 'function') {
        console.log(`✅ ${serviceName} has input sanitization function`);
      } else {
        console.log(`⚠️  ${serviceName} missing input sanitization function`);
      }
    } else if (serviceName === 'workouts') {
      if (typeof serviceModule.sanitizeWorkoutData === 'function') {
        console.log(`✅ ${serviceName} has input sanitization function`);
      } else {
        console.log(`⚠️  ${serviceName} missing input sanitization function`);
      }
    } else if (serviceName === 'meals') {
      if (typeof serviceModule.sanitizeMealData === 'function') {
        console.log(`✅ ${serviceName} has input sanitization function`);
      } else {
        console.log(`⚠️  ${serviceName} missing input sanitization function`);
      }
    } else if (serviceName === 'mood') {
      if (typeof serviceModule.sanitizeMoodData === 'function') {
        console.log(`✅ ${serviceName} has input sanitization function`);
      } else {
        console.log(`⚠️  ${serviceName} missing input sanitization function`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Failed to load ${serviceName} service:`, error.message);
    exitCode = 1;
  }
}

// Test 4: Input validation testing
console.log('\n📋 Test 4: Input Validation Security');
try {
  const { sanitizeProfileData } = require('../src/services/userProfiles');
  
  // Test that unknown fields are stripped
  const testInput = {
    full_name: 'Test User',
    email: 'test@example.com',
    maliciousField: 'should be stripped',
    anotherBadField: { nested: 'objects' }
  };
  
  const sanitized = sanitizeProfileData(testInput);
  
  if (sanitized.full_name === 'Test User' && sanitized.email === 'test@example.com') {
    console.log('✅ Valid fields are preserved');
  } else {
    console.log('❌ Valid fields are not preserved correctly');
    exitCode = 1;
  }
  
  if (!sanitized.maliciousField && !sanitized.anotherBadField) {
    console.log('✅ Unknown fields are stripped for security');
  } else {
    console.log('❌ Unknown fields are not being stripped');
    exitCode = 1;
  }
  
  // Test null handling
  const nullTest = sanitizeProfileData({ full_name: null, email: 'test@example.com' });
  if (!nullTest.hasOwnProperty('full_name') && nullTest.email === 'test@example.com') {
    console.log('✅ Null values are handled safely');
  } else {
    console.log('❌ Null values are not handled correctly');
    exitCode = 1;
  }
  
} catch (error) {
  console.error('❌ Input validation test failed:', error.message);
  exitCode = 1;
}

// Test 5: Schema migration file exists
console.log('\n📋 Test 5: Database Schema');
try {
  const fs = require('fs');
  const migrationFiles = fs.readdirSync('db/migrations/');
  
  const schemaFile = migrationFiles.find(file => file.includes('initial-schema.sql'));
  if (schemaFile) {
    console.log('✅ Initial schema migration file exists');
    
    // Check that it contains key tables
    const schemaContent = fs.readFileSync(`db/migrations/${schemaFile}`, 'utf8');
    const requiredTables = [
      'user_profiles', 'workouts', 'meals', 'sleep_logs', 
      'supplements', 'mood_logs', 'chat_interactions'
    ];
    
    for (const table of requiredTables) {
      if (schemaContent.includes(table)) {
        console.log(`✅ Schema includes ${table} table`);
      } else {
        console.log(`❌ Schema missing ${table} table`);
        exitCode = 1;
      }
    }
    
  } else {
    console.log('❌ Initial schema migration file not found');
    exitCode = 1;
  }
  
} catch (error) {
  console.error('❌ Schema validation test failed:', error.message);
  exitCode = 1;
}

// Test Summary
console.log('\n🎯 Smoke Test Summary:');
if (exitCode === 0) {
  console.log('✅ All smoke tests passed! Supabase integration is ready.');
  console.log('\n📋 Next Steps for Full Integration:');
  console.log('1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment');
  console.log('2. Run the full integration test: npm run test:integration');
  console.log('3. Test with real credentials in a dev environment');
} else {
  console.log('❌ Some smoke tests failed. Please review and fix the issues above.');
}

process.exit(exitCode);