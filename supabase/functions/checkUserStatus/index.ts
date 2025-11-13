/**
 * Check User Status - Supabase Edge Function
 * 
 * This function detects user stress patterns and queues proactive coaching messages.
 * It analyzes mood/stress logs from the past 3 days and creates notifications when
 * concerning patterns are detected.
 * 
 * Schedule: Run daily via CRON
 * 
 * Environment Variables Required:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for database operations
 * - CRON_SECRET_KEY: Secret key for authenticating CRON requests (X-Cron-Secret header)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { authenticateRequest } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { checkUserConsent } from '../_shared/consentCheck.ts'

// Type definitions
interface LogEntry {
  user_id: string;
  user_message: string;
  ai_response: string;
  timestamp: string;
}

interface StressPattern {
  userId: string;
  stressfulDays: number;
  pattern: string;
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
 * Analyze logs for stress patterns
 */
function detectStressPattern(logs: LogEntry[]): boolean {
  if (logs.length === 0) return false;

  // Keywords indicating high stress or difficult times
  const stressKeywords = [
    'stress', 'stressed', 'anxious', 'anxiety', 'overwhelmed', 'tired',
    'exhausted', 'difficult', 'tough', 'hard time', 'struggling', 'down',
    'sad', 'depressed', 'frustrated', 'angry', 'upset'
  ];

  // Count days with stress indicators
  const dayLogs = new Map<string, LogEntry[]>();
  for (const log of logs) {
    const day = log.timestamp.split('T')[0];
    if (!dayLogs.has(day)) {
      dayLogs.set(day, []);
    }
    dayLogs.get(day)!.push(log);
  }

  // Check each day for stress indicators
  let stressfulDays = 0;
  for (const [day, dayEntries] of dayLogs.entries()) {
    const hasStress = dayEntries.some(entry => {
      const text = `${entry.user_message} ${entry.ai_response}`.toLowerCase();
      return stressKeywords.some(keyword => text.includes(keyword));
    });

    if (hasStress) {
      stressfulDays++;
    }
  }

  // Trigger if 2 or more days show stress
  return stressfulDays >= 2;
}

/**
 * Generate proactive message based on stress pattern
 */
function generateProactiveMessage(): string {
  return "Hey, I noticed the past couple of days have been tough. Want to adjust your plan or talk about what's going on?";
}

/**
 * Main handler function
 */
serve(async (req) => {
  // Authentication check - MUST be first!
  const authResult = await authenticateRequest(req);
  if (!authResult.authorized) {
    return authResult.response;
  }

  // Rate limit check - prevent abuse
  const rateLimitResult = await checkRateLimit('checkUserStatus');
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  const startTime = Date.now();
  let runStatus = 'success';
  let errorMessage: string | null = null;
  let cronDetails: any = {};

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date range (last 3 days)
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Get all logs from the past 3 days with retry logic
    const { data: logs, error: logsError } = await retryWithBackoff(async () => {
      return await supabase
        .from('ai_coach_logs')
        .select('user_id, user_message, ai_response, timestamp')
        .gte('timestamp', threeDaysAgo.toISOString())
        .order('timestamp', { ascending: true });
    });

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

    console.log(`Checking status for ${logsByUser.size} users`);

    // Detect stress patterns and create notifications
    const triggeredNotifications: StressPattern[] = [];
    const failures: string[] = [];
    const skippedNoConsent: string[] = [];

    for (const [userId, userLogs] of logsByUser.entries()) {
      try {
        const hasStressPattern = detectStressPattern(userLogs);

        if (hasStressPattern) {
          // GDPR Compliance: Check user consent before processing user data
          // Note: Current implementation uses local analysis only, but consent check
          // is in place for future OpenAI integration and data privacy compliance
          const consentResult = await checkUserConsent(supabase, userId, 'openai_processing');

          if (!consentResult.hasConsent) {
            console.log('[CONSENT] Skipping notification - no user consent', {
              userId,
              function: 'checkUserStatus',
              timestamp: new Date().toISOString(),
              note: 'User has not granted consent for AI data processing'
            });
            skippedNoConsent.push(userId);
            continue; // Skip this user, move to next
          }

          // User has granted consent - proceed with notification
          console.log('[CONSENT] User consent confirmed - proceeding with notification', {
            userId,
            granted_at: consentResult.consentRecord?.granted_at,
            function: 'checkUserStatus'
          });

          // Check if we already sent a notification recently (within last 3 days)
          const { data: recentNotifications } = await supabase
            .from('coach_notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'ai_coach_proactive')
            .gte('created_at', threeDaysAgo.toISOString());

          // Only send if no recent notification exists
          if (!recentNotifications || recentNotifications.length === 0) {
            const message = generateProactiveMessage();

            const { error: insertError } = await retryWithBackoff(async () => {
              return await supabase
                .from('coach_notifications')
                .insert({
                  user_id: userId,
                  message,
                  type: 'ai_coach_proactive',
                  priority: 'normal',
                  delivery_channel: 'in-app',
                  status: 'pending'
                });
            });

            if (insertError) {
              console.error(`Failed to insert notification for user ${userId}:`, insertError);
              failures.push(userId);
            } else {
              triggeredNotifications.push({
                userId,
                stressfulDays: 2,
                pattern: 'high_stress',
              });
              console.log(`✓ Queued proactive message for user ${userId}`);
            }
          } else {
            console.log(`⊘ Skipped user ${userId} (notification sent recently)`);
          }
        }
      } catch (error) {
        console.error(`Failed to process user ${userId}:`, error);
        failures.push(userId);
      }
    }

    // Set status based on results
    if (failures.length > 0 && triggeredNotifications.length === 0 && logsByUser.size > 0) {
      runStatus = 'error';
      errorMessage = `Failed to process all users. Failures: ${failures.length}`;
    } else if (failures.length > 0) {
      runStatus = 'partial_success';
      errorMessage = `Partial success. Successes: ${triggeredNotifications.length}, Failures: ${failures.length}`;
    }

    cronDetails = {
      totalUsers: logsByUser.size,
      triggeredNotifications: triggeredNotifications.length,
      failures: failures.length,
      skippedNoConsent: skippedNoConsent.length,
      dateRange: { from: threeDaysAgo.toISOString(), to: now.toISOString() }
    };

    // Log to system_cron_logs
    const durationMs = Date.now() - startTime;
    await supabase
      .from('admin.system_cron_logs')
      .insert({
        function_name: 'checkUserStatus',
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
        message: `Checked ${logsByUser.size} users, triggered ${triggeredNotifications.length} notifications, skipped ${skippedNoConsent.length} users (no consent)`,
        notifications: triggeredNotifications,
        failures,
        skippedNoConsent,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in checkUserStatus:', error);
    
    // Log error to system_cron_logs
    const durationMs = Date.now() - startTime;
    runStatus = 'error';
    errorMessage = error.message || 'Unknown error';
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('admin.system_cron_logs')
        .insert({
          function_name: 'checkUserStatus',
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
