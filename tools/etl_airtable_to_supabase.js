#!/usr/bin/env node

/**
 * ETL Script: Airtable → Supabase
 * 
 * Migrates user data from Airtable to Supabase using the mapping defined in
 * /docs/airtable_to_supabase_mapping.md
 * 
 * Usage:
 *   node tools/etl_airtable_to_supabase.ts [options]
 * 
 * Options:
 *   --apply        Actually write to Supabase (default: dry-run mode)
 *   --limit N      Limit to N records (default: 10 for dry-run, unlimited for apply)
 *   --since ISO    Only migrate records created/updated since this date
 *   --help         Show this help message
 * 
 * Environment Variables Required:
 *   AIRTABLE_BASE_ID, AIRTABLE_API_KEY
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const axios = require('axios');
const { supabaseAdmin } = require('../src/lib/supabaseServer');

// Configuration
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const USER_TABLE_ID = 'tbl87AICCbvbgrLCY'; // From existing utils/logging.js

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  apply: args.includes('--apply'),
  limit: parseInt(args.find(arg => arg.startsWith('--limit'))?.split('=')[1] || 
         args[args.indexOf('--limit') + 1]) || (args.includes('--apply') ? 0 : 10),
  since: args.find(arg => arg.startsWith('--since'))?.split('=')[1] || 
         args[args.indexOf('--since') + 1],
  help: args.includes('--help')
};

if (options.help) {
  console.log(`
ETL Script: Airtable → Supabase User Profiles

Usage: node tools/etl_airtable_to_supabase.ts [options]

Options:
  --apply              Actually write to Supabase (default: dry-run mode)
  --limit N           Limit to N records (default: 10 for dry-run, unlimited for apply)
  --since YYYY-MM-DD  Only migrate records created/updated since this date
  --help              Show this help message

Environment Variables Required:
  AIRTABLE_BASE_ID, AIRTABLE_API_KEY
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

Examples:
  node tools/etl_airtable_to_supabase.ts                    # Dry-run, 10 records
  node tools/etl_airtable_to_supabase.ts --limit 5          # Dry-run, 5 records
  node tools/etl_airtable_to_supabase.ts --apply            # Migrate all records
  node tools/etl_airtable_to_supabase.ts --apply --limit 50 # Migrate 50 records
`);
  process.exit(0);
}

/**
 * Field mapping from Airtable to Supabase based on docs/airtable_to_supabase_mapping.md
 */
const FIELD_MAPPING = {
  'Email': 'email',
  'external_id': 'user_id', // This maps to the auth user ID
  'Name': 'full_name',
  'Timezone': 'timezone',
  'Gender': 'gender_identity',
  'Gender Identity': 'gender_identity',
  'Pronouns': 'pronouns',
  'Identity Other': 'identity_other',
  'Cultural Practices': 'cultural_practices',
  'Faith/Diet Rules': 'faith_diet_rules',
  'Cultural Notes': 'cultural_notes',
  'Obstacles': 'obstacles',
  'Work Pattern': 'work_pattern',
  'Support System': 'support_system',
  'Lifestyle Notes': 'lifestyle_notes',
  'Injuries': 'injuries',
  'Conditions': 'conditions',
  'Contraindications': 'contraindications',
  'Emergency Ack': 'emergency_ack',
  'Primary Goal': 'primary_goal',
  'Secondary Focus': 'secondary_goals',
  'Target Event': 'target_event',
  'Target Date': 'target_event_date',
  'Days/Week': 'days_per_week',
  'Session Minutes': 'session_minutes',
  'Equipment Access': 'equipment_access',
  'Workout Location': 'workout_location',
  'Experience Level': 'experience_level',
  'Coaching Tone': 'coaching_tone',
  'Learning Style': 'learning_style',
  'Height (cm)': 'height_cm',
  'Weight (kg)': 'weight_kg',
  'Units': 'units',
  'Sleep Time': 'sleep_time',
  'Wake Time': 'wake_time',
  'Diet Pattern': 'diet_pattern',
  'Fasting Pattern': 'fasting_pattern',
  'Diet Notes': 'diet_notes',
  'Allergies': 'allergies',
  'Intolerances': 'intolerances',
  'Cuisines Liked': 'cuisines_like',
  'Cuisines Avoided': 'cuisines_avoid',
  'Budget Band': 'budget_band',
  'Current Supplements': 'supplements_current',
  'Sleep Quality': 'sleep_quality',
  'Avg Sleep Hours': 'avg_sleep_hours',
  'Recovery Habits': 'recovery_habits',
  'Charity Choice': 'charity_choice',
  'Success Definition': 'success_definition',
  'Motivation Notes': 'motivation_notes',
  'Onboarding Complete': 'onboarding_completed',
  'Cohort': 'cohort',
  'Data Environment': 'data_env'
};

/**
 * Fetch users from Airtable
 */
async function fetchAirtableUsers(limit, since) {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
    throw new Error('AIRTABLE_BASE_ID and AIRTABLE_API_KEY environment variables are required');
  }

  let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USER_TABLE_ID}`;
  const params = new URLSearchParams();
  
  if (limit > 0) params.append('maxRecords', limit.toString());
  if (since) params.append('filterByFormula', `CREATED_TIME() >= '${since}'`);
  
  if (params.toString()) url += '?' + params.toString();

  console.log(`📡 Fetching users from Airtable: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.records || [];
  } catch (error) {
    console.error('❌ Failed to fetch from Airtable:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Map Airtable record to Supabase format
 */
function mapAirtableToSupabase(record) {
  const fields = record.fields || {};
  const mapped = {};

  // Map each field according to the mapping
  for (const [airtableField, supabaseField] of Object.entries(FIELD_MAPPING)) {
    if (fields[airtableField] !== undefined) {
      let value = fields[airtableField];
      
      // Handle special data type conversions
      if (supabaseField === 'target_event_date' && value) {
        // Convert date to YYYY-MM-DD format
        value = new Date(value).toISOString().split('T')[0];
      } else if (supabaseField === 'emergency_ack') {
        // Convert to boolean
        value = Boolean(value);
      } else if (supabaseField === 'onboarding_completed') {
        // Convert to boolean
        value = Boolean(value);
      } else if (['cultural_practices', 'faith_diet_rules', 'obstacles', 'secondary_goals', 
                  'equipment_access', 'injuries', 'conditions', 'contraindications',
                  'allergies', 'intolerances', 'cuisines_like', 'cuisines_avoid',
                  'recovery_habits'].includes(supabaseField)) {
        // Ensure arrays are properly formatted
        value = Array.isArray(value) ? value : (value ? [value] : []);
      }
      
      mapped[supabaseField] = value;
    }
  }

  // Ensure we have a user_id (required field)
  if (!mapped.user_id) {
    console.warn(`⚠️  Record ${record.id} has no external_id, skipping`);
    return null;
  }

  // Add metadata
  mapped.data_env = mapped.data_env || 'migrated_from_airtable';
  
  return mapped;
}

/**
 * Write user profile to Supabase
 */
async function writeToSupabase(userProfile) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert(userProfile, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`❌ Failed to write user ${userProfile.user_id}:`, error.message);
    throw error;
  }
}

/**
 * Main ETL function
 */
async function runETL() {
  console.log('🚀 Starting Airtable → Supabase ETL');
  console.log(`Mode: ${options.apply ? '✅ APPLY (will write to DB)' : '🔍 DRY RUN (read-only)'}`);
  console.log(`Limit: ${options.limit || 'unlimited'}`);
  if (options.since) console.log(`Since: ${options.since}`);
  console.log('');

  const stats = {
    fetched: 0,
    mapped: 0,
    written: 0,
    errors: 0
  };

  try {
    // Fetch from Airtable
    const records = await fetchAirtableUsers(options.limit, options.since);
    stats.fetched = records.length;
    console.log(`📊 Fetched ${records.length} records from Airtable`);
    console.log('');

    // Process each record
    for (const [index, record] of records.entries()) {
      const recordNum = index + 1;
      console.log(`🔄 Processing record ${recordNum}/${records.length} (${record.id})`);
      
      try {
        // Map to Supabase format
        const mapped = mapAirtableToSupabase(record);
        if (!mapped) {
          console.log(`   ⏭️  Skipped (no user_id)`);
          continue;
        }
        
        stats.mapped++;
        console.log(`   📝 Mapped user: ${mapped.user_id} (${mapped.email || 'no email'})`);
        
        if (options.apply) {
          // Write to Supabase
          const result = await writeToSupabase(mapped);
          stats.written++;
          console.log(`   ✅ Written to Supabase: ${result.user_id}`);
        } else {
          console.log(`   🔍 DRY RUN - would write:`, Object.keys(mapped).join(', '));
        }
        
      } catch (error) {
        stats.errors++;
        console.error(`   ❌ Error processing record:`, error.message);
      }
      
      console.log('');
    }

  } catch (error) {
    console.error('💥 ETL failed:', error.message);
    process.exit(1);
  }

  // Final summary
  console.log('📊 ETL Summary:');
  console.log(`   Fetched from Airtable: ${stats.fetched}`);
  console.log(`   Successfully mapped: ${stats.mapped}`);
  console.log(`   ${options.apply ? 'Written to Supabase' : 'Would write'}: ${options.apply ? stats.written : stats.mapped}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log('');

  if (!options.apply && stats.mapped > 0) {
    console.log('🔍 This was a dry run. Use --apply to actually write to Supabase.');
  } else if (options.apply && stats.written > 0) {
    console.log('✅ ETL completed successfully!');
  }
}

// Run the ETL if this script is executed directly
if (require.main === module) {
  runETL().catch(error => {
    console.error('💥 ETL script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runETL, mapAirtableToSupabase, FIELD_MAPPING };