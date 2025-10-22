/**
 * Coach Log Service
 * 
 * Logs all AI coach interactions to Supabase for audit trail, debugging,
 * and quality monitoring.
 */

const { supabaseAdmin } = require('../lib/supabaseServer');

/**
 * Safely truncate text to a maximum length
 * 
 * @param {string} str - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text with ellipsis if needed
 */
function safelyTruncate(str, maxLength) {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Log an AI coach interaction to Supabase
 * 
 * @param {Object} params - Log parameters
 * @param {string} params.userId - User ID (UUID)
 * @param {string} params.sessionId - Session/conversation ID
 * @param {string} params.userMessage - User's message
 * @param {string} params.aiResponse - AI's response
 * @param {boolean} params.success - Whether the interaction succeeded
 * @param {number} [params.tokenUsage] - Number of tokens used
 * @param {Array<string>} [params.issues] - Any safety issues detected
 * @returns {Promise<Object>} Created log entry or null on failure
 */
async function logInteraction({
  userId,
  sessionId,
  userMessage,
  aiResponse,
  success,
  tokenUsage = null,
  issues = null,
}) {
  try {
    // Truncate long messages to stay within reasonable DB limits
    const truncatedMessage = safelyTruncate(userMessage, 2000);
    const truncatedResponse = safelyTruncate(aiResponse, 5000);

    const logEntry = {
      user_id: userId,
      session_id: sessionId,
      user_message: truncatedMessage,
      ai_response: truncatedResponse,
      success,
      token_usage: tokenUsage,
      issues: issues && issues.length > 0 ? issues : null,
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('ai_coach_logs')
      .insert([logEntry])
      .select()
      .single();

    if (error) {
      console.error('Failed to log AI interaction to Supabase:', error);
      // Fallback to console logging
      console.log('[AI Coach Log - DB Failed]', {
        userId,
        sessionId,
        success,
        messageLength: userMessage?.length,
        responseLength: aiResponse?.length,
        issues,
      });
      return null;
    }

    return data;
  } catch (err) {
    // Catch any unexpected errors and log to console as fallback
    console.error('Exception while logging AI interaction:', err);
    console.log('[AI Coach Log - Exception]', {
      userId,
      sessionId,
      success,
      error: err.message,
    });
    return null;
  }
}

/**
 * Retrieve logs for a specific user
 * 
 * @param {string} userId - User ID (UUID)
 * @param {Object} options - Query options
 * @param {number} [options.limit=50] - Maximum number of logs to retrieve
 * @param {string} [options.sessionId] - Filter by specific session
 * @returns {Promise<Array>} Array of log entries
 */
async function getUserLogs(userId, options = {}) {
  try {
    const { limit = 50, sessionId } = options;

    let query = supabaseAdmin
      .from('ai_coach_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to retrieve user logs:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception while retrieving user logs:', err);
    return [];
  }
}

/**
 * Get statistics for a user's AI interactions
 * 
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Object>} Statistics object
 */
async function getUserStats(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_coach_logs')
      .select('success, token_usage, issues')
      .eq('user_id', userId);

    if (error || !data) {
      return { total: 0, successful: 0, failed: 0, totalTokens: 0, issuesCount: 0 };
    }

    const stats = data.reduce(
      (acc, log) => {
        acc.total++;
        if (log.success) acc.successful++;
        else acc.failed++;
        if (log.token_usage) acc.totalTokens += log.token_usage;
        if (log.issues && log.issues.length > 0) acc.issuesCount++;
        return acc;
      },
      { total: 0, successful: 0, failed: 0, totalTokens: 0, issuesCount: 0 }
    );

    return stats;
  } catch (err) {
    console.error('Exception while calculating user stats:', err);
    return { total: 0, successful: 0, failed: 0, totalTokens: 0, issuesCount: 0 };
  }
}

module.exports = {
  logInteraction,
  getUserLogs,
  getUserStats,
  safelyTruncate,
};
