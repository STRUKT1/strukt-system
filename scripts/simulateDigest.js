#!/usr/bin/env node

/**
 * Digest Generation Simulation Script
 * 
 * Simulates the generateWeeklyDigest Edge Function locally
 * for testing and validation without deploying to Supabase.
 * 
 * Usage: npm run simulate:digest
 */

require('dotenv').config();
const { supabaseAdmin } = require('../src/lib/supabaseServer');

// Mock data for testing if database is empty
const MOCK_LOGS = [
  {
    user_id: '00000000-0000-0000-0000-000000000001',
    user_message: 'I did a 5k run today and logged my meal',
    ai_response: 'Great job on the 5k! Make sure to hydrate and refuel properly.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    user_id: '00000000-0000-0000-0000-000000000001',
    user_message: 'Feeling a bit tired today, slept only 6 hours',
    ai_response: 'Rest is important. Try to aim for 7-8 hours tonight.',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Simulate digest generation
 */
async function simulateDigest() {
  console.log('🧪 Simulating Weekly Digest Generation\n');
  console.log('='.repeat(50));

  try {
    // Check Supabase connection
    console.log('1️⃣ Checking Supabase connection...');
    const { error: pingError } = await supabaseAdmin
      .from('ai_coach_logs')
      .select('id')
      .limit(1);

    if (pingError) {
      throw new Error(`Supabase connection failed: ${pingError.message}`);
    }
    console.log('✅ Connected to Supabase\n');

    // Calculate date range (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    console.log(`2️⃣ Fetching logs from ${sevenDaysAgo.toISOString()} to ${now.toISOString()}...`);

    // Get logs from the past 7 days
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('ai_coach_logs')
      .select('user_id, user_message, ai_response, timestamp, success')
      .gte('timestamp', sevenDaysAgo.toISOString())
      .eq('success', true)
      .order('timestamp', { ascending: true });

    if (logsError) {
      throw new Error(`Failed to fetch logs: ${logsError.message}`);
    }

    console.log(`✅ Fetched ${logs?.length || 0} logs\n`);

    // Use mock data if no logs found
    const logsToProcess = (logs && logs.length > 0) ? logs : MOCK_LOGS;
    const useMock = logs && logs.length === 0;

    if (useMock) {
      console.log('⚠️  No logs found in database, using mock data for simulation\n');
    }

    // Group logs by user
    const logsByUser = new Map();
    for (const log of logsToProcess) {
      if (!logsByUser.has(log.user_id)) {
        logsByUser.set(log.user_id, []);
      }
      logsByUser.get(log.user_id).push(log);
    }

    console.log(`3️⃣ Processing ${logsByUser.size} user(s)...\n`);

    // Process each user
    let successCount = 0;
    let failureCount = 0;

    for (const [userId, userLogs] of logsByUser.entries()) {
      console.log(`\n👤 User: ${userId.substring(0, 8)}...`);
      console.log(`   Logs: ${userLogs.length}`);

      try {
        // Generate mock digest (without calling OpenAI in simulation)
        const digest = `Weekly Summary for user ${userId.substring(0, 8)}:\n- ${userLogs.length} interactions recorded\n- Topics covered: fitness, nutrition, sleep\n- Overall engagement: good`;

        console.log(`   Digest preview: ${digest.substring(0, 100)}...`);

        // Attempt to insert into ai_coach_notes (only if not using mock data)
        if (!useMock) {
          const { error: insertError } = await supabaseAdmin
            .from('ai_coach_notes')
            .insert({
              user_id: userId,
              note: digest,
              type: 'weekly_summary',
            });

          if (insertError) {
            console.log(`   ❌ Failed to insert: ${insertError.message}`);
            failureCount++;
          } else {
            console.log(`   ✅ Digest saved successfully`);
            successCount++;
          }
        } else {
          console.log(`   ℹ️  Skipped database insert (mock mode)`);
          successCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failureCount++;
      }
    }

    // Log to system_cron_logs (only if not using mock data)
    if (!useMock) {
      console.log(`\n4️⃣ Logging to system_cron_logs...`);
      const { error: cronLogError } = await supabaseAdmin
        .from('system_cron_logs')
        .insert({
          function_name: 'generateWeeklyDigest_simulation',
          run_status: failureCount === 0 ? 'success' : (successCount > 0 ? 'partial_success' : 'error'),
          run_time: new Date().toISOString(),
          details: {
            totalUsers: logsByUser.size,
            successfulDigests: successCount,
            failedDigests: failureCount,
            simulation: true,
          },
          duration_ms: 0,
          attempts: 1,
        });

      if (cronLogError) {
        console.log(`❌ Failed to log to system_cron_logs: ${cronLogError.message}`);
      } else {
        console.log(`✅ Logged to system_cron_logs\n`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Simulation Summary:');
    console.log(`   Total Users: ${logsByUser.size}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${failureCount}`);
    console.log(`   Mode: ${useMock ? 'Mock' : 'Live'}`);
    console.log('='.repeat(50));

    if (failureCount === 0) {
      console.log('\n🎉 Simulation completed successfully!\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Simulation completed with errors\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Simulation failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run simulation
if (require.main === module) {
  simulateDigest();
}

module.exports = { simulateDigest };
