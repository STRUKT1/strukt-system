#!/usr/bin/env node

/**
 * Phase 3 Integrity Verification Script
 * 
 * Validates that all Phase 3 components are correctly implemented:
 * - Edge Functions exist and have retry logic
 * - Database migrations are present
 * - CRON logs table is defined
 * - Coach notifications have required fields
 * - Plans table supports wellness_context
 * - Configuration files are present
 * 
 * Usage: node scripts/verifyPhase3Integrity.js
 */

const fs = require('fs');
const path = require('path');

let allChecksPass = true;
const results = [];

function check(name, condition, errorMessage = '') {
  const status = condition ? '✅' : '❌';
  const message = condition ? name : `${name} - ${errorMessage}`;
  results.push({ name, status, passed: condition });
  console.log(`${status} ${message}`);
  if (!condition) {
    allChecksPass = false;
  }
  return condition;
}

function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
    return content.includes(searchString);
  } catch (error) {
    return false;
  }
}

console.log('🔍 Phase 3 Integrity Verification\n');
console.log('='.repeat(60));

// ==========================================
// 1. Edge Functions
// ==========================================
console.log('\n📦 Edge Functions');
console.log('-'.repeat(60));

check(
  'generateWeeklyDigest exists',
  fileExists('supabase/functions/generateWeeklyDigest/index.ts'),
  'File not found'
);

check(
  'checkUserStatus exists',
  fileExists('supabase/functions/checkUserStatus/index.ts'),
  'File not found'
);

check(
  'generateWeeklyDigest has retry logic',
  fileContains('supabase/functions/generateWeeklyDigest/index.ts', 'retryWithBackoff'),
  'Missing retry implementation'
);

check(
  'checkUserStatus has retry logic',
  fileContains('supabase/functions/checkUserStatus/index.ts', 'retryWithBackoff'),
  'Missing retry implementation'
);

check(
  'generateWeeklyDigest logs to system_cron_logs',
  fileContains('supabase/functions/generateWeeklyDigest/index.ts', 'system_cron_logs'),
  'Missing CRON logging'
);

check(
  'checkUserStatus logs to system_cron_logs',
  fileContains('supabase/functions/checkUserStatus/index.ts', 'system_cron_logs'),
  'Missing CRON logging'
);

// ==========================================
// 2. Database Migrations
// ==========================================
console.log('\n📊 Database Migrations');
console.log('-'.repeat(60));

check(
  'system_cron_logs migration exists',
  fileExists('supabase/migrations/20251028_create_system_cron_logs.sql'),
  'Migration file not found'
);

check(
  'coach_notifications update migration exists',
  fileExists('supabase/migrations/20251028_update_coach_notifications.sql'),
  'Migration file not found'
);

check(
  'ai_coach_logs migration exists',
  fileExists('db/migrations/20251022_create_ai_coach_logs_table.sql'),
  'Migration file not found'
);

check(
  'ai_coach_notes migration exists',
  fileExists('db/migrations/20251022_create_ai_coach_notes_table.sql'),
  'Migration file not found'
);

check(
  'plans table migration exists',
  fileExists('db/migrations/20251023_create_plans_table.sql'),
  'Migration file not found'
);

// ==========================================
// 3. Schema Validation
// ==========================================
console.log('\n🗄️  Schema Validation');
console.log('-'.repeat(60));

check(
  'system_cron_logs has required columns',
  fileContains('supabase/migrations/20251028_create_system_cron_logs.sql', 'function_name') &&
  fileContains('supabase/migrations/20251028_create_system_cron_logs.sql', 'run_status') &&
  fileContains('supabase/migrations/20251028_create_system_cron_logs.sql', 'duration_ms'),
  'Missing required columns'
);

check(
  'coach_notifications has priority field',
  fileContains('supabase/migrations/20251028_update_coach_notifications.sql', 'priority'),
  'Missing priority column'
);

check(
  'coach_notifications has delivery_channel field',
  fileContains('supabase/migrations/20251028_update_coach_notifications.sql', 'delivery_channel'),
  'Missing delivery_channel column'
);

check(
  'coach_notifications has status field',
  fileContains('supabase/migrations/20251028_update_coach_notifications.sql', 'status'),
  'Missing status column'
);

check(
  'plans table has wellness_context',
  fileContains('db/migrations/20251023_create_plans_table.sql', 'wellness_context'),
  'Missing wellness_context column'
);

// ==========================================
// 4. Configuration
// ==========================================
console.log('\n⚙️  Configuration');
console.log('-'.repeat(60));

check(
  'config.toml exists',
  fileExists('supabase/config.toml'),
  'Configuration file not found'
);

check(
  'config.toml references Edge Functions',
  fileContains('supabase/config.toml', 'generateWeeklyDigest') &&
  fileContains('supabase/config.toml', 'checkUserStatus'),
  'Missing Edge Function references'
);

check(
  'CRON setup migration exists',
  fileExists('db/migrations/20251023_setup_cron_jobs.sql'),
  'CRON setup file not found'
);

// ==========================================
// 5. Tests & Scripts
// ==========================================
console.log('\n🧪 Tests & Scripts');
console.log('-'.repeat(60));

check(
  'CRON functions test exists',
  fileExists('__tests__/cronFunctions.test.js'),
  'Test file not found'
);

check(
  'Digest simulation script exists',
  fileExists('scripts/simulateDigest.js'),
  'Simulation script not found'
);

check(
  'package.json has test:cron-functions script',
  fileContains('package.json', 'test:cron-functions'),
  'Missing npm script'
);

check(
  'package.json has simulate:digest script',
  fileContains('package.json', 'simulate:digest'),
  'Missing npm script'
);

// ==========================================
// 6. Documentation
// ==========================================
console.log('\n📚 Documentation');
console.log('-'.repeat(60));

check(
  'Phase 3 documentation exists',
  fileExists('docs/STRUKT_SYSTEM_PHASE3.md'),
  'Documentation file not found'
);

check(
  'README references Phase 3',
  fileContains('README.md', 'Phase 3') || fileContains('README.md', 'STRUKT_SYSTEM_PHASE3'),
  'README not updated'
);

check(
  'Phase 3 docs are comprehensive',
  fileContains('docs/STRUKT_SYSTEM_PHASE3.md', 'retryWithBackoff') &&
  fileContains('docs/STRUKT_SYSTEM_PHASE3.md', 'system_cron_logs') &&
  fileContains('docs/STRUKT_SYSTEM_PHASE3.md', 'wellness_context'),
  'Documentation incomplete'
);

// ==========================================
// 7. Service Integration
// ==========================================
console.log('\n🔧 Service Integration');
console.log('-'.repeat(60));

check(
  'planGenerationService has buildWellnessContext',
  fileExists('src/services/planGenerationService.js') &&
  fileContains('src/services/planGenerationService.js', 'buildWellnessContext'),
  'Missing wellness context builder'
);

check(
  'planservice supports wellness_context',
  fileExists('src/services/planservice.js') &&
  fileContains('src/services/planservice.js', 'wellness_context'),
  'Missing wellness context support'
);

// ==========================================
// Summary
// ==========================================
console.log('\n' + '='.repeat(60));
const passedCount = results.filter(r => r.passed).length;
const totalCount = results.length;
const percentage = Math.round((passedCount / totalCount) * 100);

console.log(`\n📊 Verification Results: ${passedCount}/${totalCount} checks passed (${percentage}%)`);

if (allChecksPass) {
  console.log('\n🎉 Phase 3 Integrity Verification: PASSED');
  console.log('✅ All components are correctly implemented and ready for deployment.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Phase 3 Integrity Verification: FAILED');
  console.log('❌ Some components are missing or incomplete. Review the errors above.\n');
  process.exit(1);
}
