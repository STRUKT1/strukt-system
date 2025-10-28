/**
 * Generate Weekly Digest - Supabase Edge Function
 * 
 * This function generates weekly natural-language summaries of user activity
 * by analyzing ai_coach_logs from the past 7 days using OpenAI.
 * 
 * Schedule: Run weekly (every Sunday via CRON)
 * 
 * Environment Variables Required:
 * - OPENAI_API_KEY: OpenAI API key for GPT-4
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for database operations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

// Type definitions
interface LogEntry {
  user_message: string;
  ai_response: string;
  timestamp: string;
  success: boolean;
}

interface DigestResult {
  userId: string;
  digest: string;
  logCount: number;
}

/**
 * Retry helper with exponential backoff
 * Attempts: 1st immediate, 2nd +3s, 3rd +10s
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delays = [0, 3000, 10000]
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0 && delays[attempt - 1]) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
      }
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${attempt + 1} failed: ${lastError.message}`);
      if (attempt === maxAttempts - 1) {
        throw lastError;
      }
    }
  }
  
  throw lastError!;
}

/**
 * Generate a weekly digest for a single user
 */
async function generateUserDigest(
  userId: string,
  logs: LogEntry[],
  openaiApiKey: string
): Promise<string> {
  if (logs.length === 0) {
    return 'No activity recorded this week.';
  }

  // Build context from logs
  const logSummary = logs.map((log, idx) => {
    return `[${idx + 1}] User: ${log.user_message.substring(0, 200)}\n    AI: ${log.ai_response.substring(0, 200)}`;
  }).join('\n');

  // Call OpenAI to generate summary
  const prompt = `You are a health and fitness coach summarizing a user's weekly activity. Based on the following interactions from the past 7 days, create a concise natural-language summary highlighting:
1. Key training activities
2. Nutrition patterns
3. Sleep quality or mentions
4. Mood or stress levels
5. Notable patterns or concerns

Keep it under 200 words and write in a supportive, observational tone.

Weekly Interactions:
${logSummary}

Weekly Summary:`;

  // Retry with exponential backoff
  return await retryWithBackoff(async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful fitness coach creating weekly summaries.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  });
}

/**
 * Main handler function
 */
serve(async (req) => {
  const startTime = Date.now();
  let runStatus = 'success';
  let errorMessage: string | null = null;
  let cronDetails: any = {};

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date range (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all users with logs in the past 7 days
    const { data: logs, error: logsError } = await supabase
      .from('ai_coach_logs')
      .select('user_id, user_message, ai_response, timestamp, success')
      .gte('timestamp', sevenDaysAgo.toISOString())
      .eq('success', true)
      .order('timestamp', { ascending: true });

    if (logsError) {
      throw new Error(`Failed to fetch logs: ${logsError.message}`);
    }

    // Group logs by user
    const logsByUser = new Map<string, LogEntry[]>();
    for (const log of logs || []) {
      if (!logsByUser.has(log.user_id)) {
        logsByUser.set(log.user_id, []);
      }
      logsByUser.get(log.user_id)!.push(log);
    }

    console.log(`Processing weekly digests for ${logsByUser.size} users`);

    // Generate digests for each user
    const results: DigestResult[] = [];
    const failures: string[] = [];
    
    for (const [userId, userLogs] of logsByUser.entries()) {
      try {
        const digest = await generateUserDigest(userId, userLogs, openaiApiKey);

        // Store digest in ai_coach_notes
        const { error: insertError } = await supabase
          .from('ai_coach_notes')
          .insert({
            user_id: userId,
            note: digest,
            type: 'weekly_summary',
          });

        if (insertError) {
          console.error(`Failed to insert digest for user ${userId}:`, insertError);
          failures.push(userId);
        } else {
          results.push({
            userId,
            digest,
            logCount: userLogs.length,
          });
          console.log(`✓ Generated digest for user ${userId} (${userLogs.length} logs)`);
        }
      } catch (error) {
        console.error(`Failed to generate digest for user ${userId}:`, error);
        failures.push(userId);
      }
    }

    // Set status based on results
    if (failures.length > 0 && results.length === 0) {
      runStatus = 'error';
      errorMessage = `Failed to generate all digests. Failures: ${failures.length}`;
    } else if (failures.length > 0) {
      runStatus = 'partial_success';
      errorMessage = `Partial success. Successes: ${results.length}, Failures: ${failures.length}`;
    }

    cronDetails = {
      totalUsers: logsByUser.size,
      successfulDigests: results.length,
      failedDigests: failures.length,
      dateRange: { from: sevenDaysAgo.toISOString(), to: now.toISOString() }
    };

    // Log to system_cron_logs
    const durationMs = Date.now() - startTime;
    await supabase
      .from('system_cron_logs')
      .insert({
        function_name: 'generateWeeklyDigest',
        run_status: runStatus,
        run_time: new Date().toISOString(),
        details: cronDetails,
        duration_ms: durationMs,
        attempts: 1,
        error_message: errorMessage,
      });

    return new Response(
      JSON.stringify({
        success: runStatus !== 'error',
        message: `Generated ${results.length} weekly digests`,
        results,
        failures,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generateWeeklyDigest:', error);
    
    // Log error to system_cron_logs
    const durationMs = Date.now() - startTime;
    runStatus = 'error';
    errorMessage = error.message || 'Unknown error';
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('system_cron_logs')
        .insert({
          function_name: 'generateWeeklyDigest',
          run_status: 'error',
          run_time: new Date().toISOString(),
          details: { error: errorMessage },
          duration_ms: durationMs,
          attempts: 1,
          error_message: errorMessage,
        });
    } catch (logError) {
      console.error('Failed to log error to system_cron_logs:', logError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
