#!/usr/bin/env node

/**
 * Test script for Supabase integration
 * Tests basic module loading and service configuration
 */

console.log('🧪 Testing Supabase Integration...\n');

// Test 1: Module loading
try {
  const { supabaseAdmin } = require('../src/lib/supabaseServer');
  console.log('✅ Supabase client module loads successfully');
} catch (error) {
  console.error('❌ Failed to load Supabase client:', error.message);
  process.exit(1);
}

// Test 2: User Profiles service loading
try {
  const { getUserProfile, upsertUserProfile, getServiceConfig } = require('../src/services/userProfiles');
  console.log('✅ User Profiles service loads successfully');
  
  // Test configuration
  const config = getServiceConfig();
  console.log('📊 Service Config:', config);
  
  if (config.DATA_BACKEND_PRIMARY === 'supabase') {
    console.log('✅ Primary backend correctly set to Supabase');
  } else {
    console.log('⚠️  Primary backend not set to Supabase:', config.DATA_BACKEND_PRIMARY);
  }
  
} catch (error) {
  console.error('❌ Failed to load User Profiles service:', error.message);
  process.exit(1);
}

// Test 3: Log services loading
const logServices = [
  'workouts', 'meals', 'sleep', 'supplements', 'mood', 'chat'
];

for (const service of logServices) {
  try {
    const serviceModule = require(`../src/services/logs/${service}`);
    console.log(`✅ ${service} service loads successfully`);
  } catch (error) {
    console.error(`❌ Failed to load ${service} service:`, error.message);
  }
}

// Test 4: ETL module loading
try {
  const { mapAirtableToSupabase, FIELD_MAPPING } = require('../tools/etl_airtable_to_supabase');
  console.log('✅ ETL module loads successfully');
  console.log(`📊 Field mappings configured: ${Object.keys(FIELD_MAPPING).length} fields`);
  
  // Test mapping function with sample data
  const sampleRecord = {
    id: 'rec123',
    fields: {
      'Email': 'test@example.com',
      'Name': 'Test User',
      'external_id': 'user-123',
      'Primary Goal': 'Get fit'
    }
  };
  
  const mapped = mapAirtableToSupabase(sampleRecord);
  if (mapped && mapped.user_id === 'user-123') {
    console.log('✅ ETL mapping function works correctly');
    console.log('📝 Sample mapping result:', Object.keys(mapped).join(', '));
  } else {
    console.log('⚠️  ETL mapping may have issues');
  }
  
} catch (error) {
  console.error('❌ Failed to load ETL module:', error.message);
}

console.log('\n🎉 All basic integration tests completed!');
console.log('\n📋 Next Steps:');
console.log('1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
console.log('2. Test actual Supabase connectivity with real credentials');
console.log('3. Run ETL script with real Airtable data');
console.log('4. Test dual-write functionality');