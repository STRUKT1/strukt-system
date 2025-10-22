/**
 * Tests for Weekly Digest Generation
 */

console.log('🚀 Running Weekly Digest Tests\n');

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

// Test 1: Weekly digest function structure
test('generateWeeklyDigest function exists', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/generateWeeklyDigest/index.ts');
  assert(fs.existsSync(functionPath), 'generateWeeklyDigest function file should exist');
  
  const content = fs.readFileSync(functionPath, 'utf-8');
  assert(content.includes('generateUserDigest'), 'Should have generateUserDigest function');
  assert(content.includes('ai_coach_logs'), 'Should query ai_coach_logs table');
  assert(content.includes('ai_coach_notes'), 'Should insert into ai_coach_notes table');
});

// Test 2: Weekly digest uses correct OpenAI model
test('Weekly digest uses gpt-4o-mini or gpt-4-turbo', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/generateWeeklyDigest/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  const hasCorrectModel = content.includes('gpt-4o-mini') || content.includes('gpt-4-turbo') || content.includes('gpt-4o');
  assert(hasCorrectModel, 'Should use gpt-4o-mini, gpt-4-turbo, or gpt-4o');
});

// Test 3: Weekly digest stores with correct type
test('Weekly digest stores with type "weekly_summary"', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/generateWeeklyDigest/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  assert(content.includes("type: 'weekly_summary'"), 'Should store with type weekly_summary');
});

// Test 4: Weekly digest queries last 7 days
test('Weekly digest queries last 7 days of logs', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/generateWeeklyDigest/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  assert(content.includes('7 *'), 'Should calculate 7 days');
  assert(content.includes('gte'), 'Should use greater than or equal for date filtering');
});

// Test 5: SQL migration for ai_coach_notes exists
test('ai_coach_notes table migration exists', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_ai_coach_notes_table.sql');
  assert(fs.existsSync(migrationPath), 'ai_coach_notes migration file should exist');
  
  const content = fs.readFileSync(migrationPath, 'utf-8');
  assert(content.includes('CREATE TABLE'), 'Should create table');
  assert(content.includes('ai_coach_notes'), 'Should be named ai_coach_notes');
  assert(content.includes('weekly_summary'), 'Should include weekly_summary type');
});

// Test 6: ai_coach_notes has RLS policies
test('ai_coach_notes has proper RLS policies', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_ai_coach_notes_table.sql');
  const content = fs.readFileSync(migrationPath, 'utf-8');
  
  assert(content.includes('ENABLE ROW LEVEL SECURITY'), 'Should enable RLS');
  assert(content.includes('user_can_view_own_notes'), 'Should have user view policy');
  assert(content.includes('service_role_can_insert_notes'), 'Should have service role insert policy');
});

// Test 7: Weekly digest groups logs by user
test('Weekly digest groups logs by user', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/generateWeeklyDigest/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  assert(content.includes('logsByUser') || content.includes('user_id'), 'Should group by user');
  assert(content.includes('Map'), 'Should use Map for grouping');
});

// Test 8: Prompt service can fetch weekly summaries
test('Prompt service has fetchWeeklySummaries function', () => {
  const promptService = require('../services/promptService');
  // The function is internal but should be part of buildUserContext
  const fs = require('fs');
  const path = require('path');
  const servicePath = path.join(__dirname, '../services/promptService.js');
  const content = fs.readFileSync(servicePath, 'utf-8');
  
  assert(content.includes('fetchWeeklySummaries'), 'Should have fetchWeeklySummaries function');
  assert(content.includes('ai_coach_notes'), 'Should query ai_coach_notes');
});

console.log('\n==================================================');
console.log(`📊 Test Results: ${passedTests}/${passedTests + failedTests} tests passed`);

if (failedTests === 0) {
  console.log('🎉 All weekly digest tests passed!');
} else {
  console.log(`❌ ${failedTests} test(s) failed`);
  process.exit(1);
}
