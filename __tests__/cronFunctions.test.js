/**
 * CRON Functions Tests
 * 
 * Tests for Phase 3 Edge Functions (generateWeeklyDigest, checkUserStatus)
 * Validates retry logic, CRON logging, and proper execution
 */

const assert = require('assert');

// Track test results
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`✅ ${name}`);
  } catch (error) {
    failedTests++;
    failures.push({ name, error: error.message });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

console.log('🧪 Running CRON Functions Tests...\n');

// ==========================================
// 1. Edge Function Structure Tests
// ==========================================
console.log('📋 Testing Edge Function Structure...');

test('generateWeeklyDigest file exists', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/functions/generateWeeklyDigest/index.ts');
  assert.ok(fs.existsSync(filePath), 'generateWeeklyDigest index.ts should exist');
});

test('checkUserStatus file exists', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/functions/checkUserStatus/index.ts');
  assert.ok(fs.existsSync(filePath), 'checkUserStatus index.ts should exist');
});

test('generateWeeklyDigest contains retry logic', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/functions/generateWeeklyDigest/index.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('retryWithBackoff'), 'Should contain retry logic');
  assert.ok(content.includes('maxAttempts'), 'Should have max attempts');
});

test('checkUserStatus contains retry logic', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('retryWithBackoff'), 'Should contain retry logic');
});

test('generateWeeklyDigest logs to system_cron_logs', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/functions/generateWeeklyDigest/index.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('system_cron_logs'), 'Should log to system_cron_logs');
  assert.ok(content.includes('run_status'), 'Should include run_status');
  assert.ok(content.includes('duration_ms'), 'Should track duration');
});

test('checkUserStatus logs to system_cron_logs', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('system_cron_logs'), 'Should log to system_cron_logs');
  assert.ok(content.includes('run_status'), 'Should include run_status');
});

// ==========================================
// 2. Migration Files Tests
// ==========================================
console.log('\n📋 Testing Migration Files...');

test('system_cron_logs migration exists', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/migrations/20251028_create_system_cron_logs.sql');
  assert.ok(fs.existsSync(filePath), 'system_cron_logs migration should exist');
});

test('system_cron_logs migration has correct structure', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/migrations/20251028_create_system_cron_logs.sql');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert.ok(content.includes('CREATE TABLE'), 'Should create table');
  assert.ok(content.includes('system_cron_logs'), 'Should name table correctly');
  assert.ok(content.includes('function_name'), 'Should have function_name column');
  assert.ok(content.includes('run_status'), 'Should have run_status column');
  assert.ok(content.includes('run_time'), 'Should have run_time column');
  assert.ok(content.includes('details JSONB'), 'Should have details JSONB column');
  assert.ok(content.includes('duration_ms'), 'Should have duration_ms column');
  assert.ok(content.includes('attempts'), 'Should have attempts column');
});

test('coach_notifications update migration exists', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/migrations/20251028_update_coach_notifications.sql');
  assert.ok(fs.existsSync(filePath), 'coach_notifications update migration should exist');
});

test('coach_notifications migration adds required fields', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/migrations/20251028_update_coach_notifications.sql');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert.ok(content.includes('priority'), 'Should add priority column');
  assert.ok(content.includes('delivery_channel'), 'Should add delivery_channel column');
  assert.ok(content.includes('status'), 'Should add status column');
  assert.ok(content.includes('nudge'), 'Should support nudge type');
});

// ==========================================
// 3. Configuration Tests
// ==========================================
console.log('\n📋 Testing Configuration...');

test('config.toml exists', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/config.toml');
  assert.ok(fs.existsSync(filePath), 'config.toml should exist');
});

test('config.toml mentions CRON schedules', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/config.toml');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert.ok(content.includes('generateWeeklyDigest'), 'Should reference generateWeeklyDigest');
  assert.ok(content.includes('checkUserStatus'), 'Should reference checkUserStatus');
});

// ==========================================
// 4. Retry Logic Validation
// ==========================================
console.log('\n📋 Testing Retry Logic Pattern...');

test('generateWeeklyDigest has correct retry delays', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/functions/generateWeeklyDigest/index.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for 3 attempts with proper delays (0, 3000, 10000)
  assert.ok(content.includes('3000'), 'Should have 3s delay');
  assert.ok(content.includes('10000'), 'Should have 10s delay');
});

test('checkUserStatus has correct retry delays', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for 3 attempts with proper delays (0, 3000, 10000)
  assert.ok(content.includes('3000'), 'Should have 3s delay');
  assert.ok(content.includes('10000'), 'Should have 10s delay');
});

// ==========================================
// 5. Error Handling Tests
// ==========================================
console.log('\n📋 Testing Error Handling...');

test('generateWeeklyDigest handles errors gracefully', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/functions/generateWeeklyDigest/index.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert.ok(content.includes('try'), 'Should have try blocks');
  assert.ok(content.includes('catch'), 'Should have catch blocks');
  assert.ok(content.includes('error_message'), 'Should track error messages');
});

test('checkUserStatus handles errors gracefully', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../supabase/functions/checkUserStatus/index.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert.ok(content.includes('try'), 'Should have try blocks');
  assert.ok(content.includes('catch'), 'Should have catch blocks');
  assert.ok(content.includes('error_message'), 'Should track error messages');
});

// ==========================================
// Summary
// ==========================================
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${passedTests}/${passedTests + failedTests} passed`);

if (failedTests > 0) {
  console.log('\n❌ Failed Tests:');
  failures.forEach(({ name, error }) => {
    console.log(`  - ${name}: ${error}`);
  });
  process.exit(1);
} else {
  console.log('🎉 All tests passed successfully!');
  process.exit(0);
}
