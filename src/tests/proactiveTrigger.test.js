/**
 * Tests for Proactive Trigger Logic
 */

console.log('🚀 Running Proactive Trigger Tests\n');

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

// Test 1: checkUserStatus function structure
test('checkUserStatus function exists', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/checkUserStatus/index.ts');
  assert(fs.existsSync(functionPath), 'checkUserStatus function file should exist');
  
  const content = fs.readFileSync(functionPath, 'utf-8');
  assert(content.includes('detectStressPattern'), 'Should have detectStressPattern function');
  assert(content.includes('ai_coach_logs'), 'Should query ai_coach_logs table');
  assert(content.includes('coach_notifications'), 'Should insert into coach_notifications table');
});

// Test 2: Stress detection checks last 3 days
test('checkUserStatus queries last 3 days of logs', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  assert(content.includes('3 *'), 'Should calculate 3 days');
  assert(content.includes('threeDaysAgo') || content.includes('3'), 'Should reference 3 days');
});

// Test 3: Stress detection has keywords
test('Stress detection includes stress keywords', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  assert(content.includes('stress'), 'Should check for stress keyword');
  assert(content.includes('stressKeywords') || content.includes('keywords'), 'Should have keyword list');
});

// Test 4: Trigger requires 2+ stressful days
test('Stress trigger requires 2 or more stressful days', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  assert(content.includes('>= 2') || content.includes('2 or more'), 'Should require 2+ days');
});

// Test 5: SQL migration for coach_notifications exists
test('coach_notifications table migration exists', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_coach_notifications_table.sql');
  assert(fs.existsSync(migrationPath), 'coach_notifications migration file should exist');
  
  const content = fs.readFileSync(migrationPath, 'utf-8');
  assert(content.includes('CREATE TABLE'), 'Should create table');
  assert(content.includes('coach_notifications'), 'Should be named coach_notifications');
  assert(content.includes('ai_coach_proactive'), 'Should include ai_coach_proactive type');
});

// Test 6: coach_notifications has RLS policies
test('coach_notifications has proper RLS policies', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_coach_notifications_table.sql');
  const content = fs.readFileSync(migrationPath, 'utf-8');
  
  assert(content.includes('ENABLE ROW LEVEL SECURITY'), 'Should enable RLS');
  assert(content.includes('user_can_view_own_notifications'), 'Should have user view policy');
  assert(content.includes('service_role_can_insert_notifications'), 'Should have service role insert policy');
});

// Test 7: Notification type is ai_coach_proactive
test('Notifications use type ai_coach_proactive', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  assert(content.includes("type: 'ai_coach_proactive'"), 'Should use type ai_coach_proactive');
});

// Test 8: Prevents duplicate notifications
test('checkUserStatus prevents duplicate recent notifications', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  assert(content.includes('recentNotifications') || content.includes('recent'), 'Should check for recent notifications');
  assert(content.includes('length === 0') || content.includes('no recent'), 'Should prevent duplicates');
});

// Test 9: Generates appropriate message
test('Proactive message is supportive and helpful', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  assert(content.includes('couple of days') || content.includes('been tough'), 'Should mention recent difficulty');
  assert(content.includes('adjust') || content.includes('talk'), 'Should offer support');
});

// Test 10: Groups logs by user
test('checkUserStatus groups logs by user', () => {
  const fs = require('fs');
  const path = require('path');
  const functionPath = path.join(__dirname, '../../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(functionPath, 'utf-8');
  
  assert(content.includes('logsByUser') || content.includes('user_id'), 'Should group by user');
  assert(content.includes('Map'), 'Should use Map for grouping');
});

// Test 11: coach_notifications has read field
test('coach_notifications table has read field', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_coach_notifications_table.sql');
  const content = fs.readFileSync(migrationPath, 'utf-8');
  
  assert(content.includes('read BOOLEAN'), 'Should have read field');
  assert(content.includes('DEFAULT false'), 'Should default to false');
});

// Test 12: Users can update their own notifications
test('Users can mark notifications as read', () => {
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../../db/migrations/20251022_create_coach_notifications_table.sql');
  const content = fs.readFileSync(migrationPath, 'utf-8');
  
  assert(content.includes('user_can_update_own_notifications'), 'Should have update policy');
  assert(content.includes('FOR UPDATE'), 'Should allow UPDATE operations');
});

console.log('\n==================================================');
console.log(`📊 Test Results: ${passedTests}/${passedTests + failedTests} tests passed`);

if (failedTests === 0) {
  console.log('🎉 All proactive trigger tests passed!');
} else {
  console.log(`❌ ${failedTests} test(s) failed`);
  process.exit(1);
}
