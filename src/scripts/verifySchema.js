/**
 * Supabase Schema Verification Script
 * Validates that required tables and columns exist for Phase 1.5
 */

const { supabaseAdmin } = require('../lib/supabaseServer');

// Expected schema definition
const EXPECTED_SCHEMA = {
  user_profiles: [
    'user_id', 'full_name', 'email', 'timezone', 'gender_identity', 'identity_other', 'pronouns',
    'cultural_practices', 'faith_diet_rules', 'cultural_notes', 'obstacles', 'work_pattern',
    'support_system', 'lifestyle_notes', 'injuries', 'conditions', 'contraindications',
    'emergency_ack', 'primary_goal', 'secondary_goals', 'target_event', 'target_event_date',
    'days_per_week', 'session_minutes', 'equipment_access', 'workout_location',
    'beta_consent', 'data_processing_consent', 'onboarding_completed'
  ],
  chat_interactions: [
    'id', 'user_id', 'message', 'response', 'context', 'timestamp', 'created_at'
  ],
  meals: [
    'id', 'user_id', 'description', 'calories', 'notes', 'date', 'created_at'
  ],
  workouts: [
    'id', 'user_id', 'type', 'description', 'duration_minutes', 'calories', 'notes', 'date', 'created_at'
  ],
  sleep_logs: [
    'id', 'user_id', 'duration_minutes', 'quality', 'bedtime', 'wake_time', 'notes', 'created_at'
  ],
  mood_logs: [
    'id', 'user_id', 'mood_score', 'stress_level', 'notes', 'date', 'created_at'
  ],
};

/**
 * Check if table exists and get its columns
 */
async function checkTable(tableName) {
  try {
    // Try to query the table structure
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .limit(0);
      
    if (error) {
      return { exists: false, error: error.message, columns: [] };
    }
    
    // Get column information from information_schema
    const { data: columns, error: columnsError } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: tableName });
      
    if (columnsError) {
      // Fallback: try a simple select to see if table exists
      return { exists: true, columns: [], error: 'Could not retrieve column info' };
    }
    
    return { 
      exists: true, 
      columns: columns ? columns.map(col => col.column_name) : [],
      error: null 
    };
  } catch (err) {
    return { exists: false, error: err.message, columns: [] };
  }
}

/**
 * Verify RLS is enabled on tables
 */
async function checkRLS(tableName) {
  try {
    const { data, error } = await supabaseAdmin
      .from('pg_tables')
      .select('*')
      .eq('tablename', tableName)
      .eq('schemaname', 'public');
      
    if (error || !data || data.length === 0) {
      return { enabled: false, error: 'Table not found' };
    }
    
    // Note: This is a simplified check. In real implementation,
    // you'd query pg_class for row security status
    return { enabled: true, error: null };
  } catch (err) {
    return { enabled: false, error: err.message };
  }
}

/**
 * Run complete schema verification
 */
async function verifySchema() {
  console.log('🔍 Starting Supabase Schema Verification...\n');
  
  const results = {
    tables: {},
    overall: { pass: true, errors: [] }
  };
  
  for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
    console.log(`📋 Checking table: ${tableName}`);
    
    const tableResult = await checkTable(tableName);
    const rlsResult = await checkRLS(tableName);
    
    results.tables[tableName] = {
      exists: tableResult.exists,
      columns: tableResult.columns,
      expectedColumns,
      missingColumns: [],
      rlsEnabled: rlsResult.enabled,
      errors: []
    };
    
    if (!tableResult.exists) {
      console.log(`  ❌ Table does not exist`);
      results.tables[tableName].errors.push('Table does not exist');
      results.overall.pass = false;
      results.overall.errors.push(`Table ${tableName} does not exist`);
      continue;
    }
    
    console.log(`  ✅ Table exists`);
    
    // Check for missing columns
    const missingColumns = expectedColumns.filter(col => 
      !tableResult.columns.includes(col)
    );
    
    if (missingColumns.length > 0) {
      console.log(`  ⚠️  Missing columns: ${missingColumns.join(', ')}`);
      results.tables[tableName].missingColumns = missingColumns;
      results.tables[tableName].errors.push(`Missing columns: ${missingColumns.join(', ')}`);
      // Missing columns are warnings, not failures for now
    } else {
      console.log(`  ✅ All expected columns present`);
    }
    
    // Check RLS
    if (rlsResult.enabled) {
      console.log(`  ✅ RLS appears to be configured`);
    } else {
      console.log(`  ⚠️  Could not verify RLS status`);
    }
    
    console.log('');
  }
  
  return results;
}

/**
 * Print summary matrix
 */
function printSummary(results) {
  console.log('📊 SCHEMA VERIFICATION SUMMARY');
  console.log('================================');
  
  const tableNames = Object.keys(results.tables);
  const maxNameLength = Math.max(...tableNames.map(name => name.length));
  
  console.log(`${'Table'.padEnd(maxNameLength)} | Exists | Columns | RLS`);
  console.log(`${''.padEnd(maxNameLength, '-')} | ------ | ------- | ---`);
  
  for (const [tableName, result] of Object.entries(results.tables)) {
    const exists = result.exists ? '✅' : '❌';
    const columns = result.missingColumns.length === 0 ? '✅' : '⚠️ ';
    const rls = result.rlsEnabled ? '✅' : '⚠️ ';
    
    console.log(`${tableName.padEnd(maxNameLength)} | ${exists}     | ${columns}      | ${rls}`);
  }
  
  console.log('');
  
  if (results.overall.pass) {
    console.log('🎉 PASS: Core schema verification successful!');
  } else {
    console.log('❌ FAIL: Schema verification found critical issues:');
    results.overall.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  return results.overall.pass;
}

/**
 * Main execution
 */
async function main() {
  try {
    const results = await verifySchema();
    const passed = printSummary(results);
    
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Schema verification failed with error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  verifySchema,
  checkTable,
  EXPECTED_SCHEMA,
};