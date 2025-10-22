/**
 * Prompt Service
 * 
 * Manages system prompts with caching and optimization for AI coach interactions.
 * Separates static (system) and dynamic (user-specific) prompt sections.
 * Includes long-term memory integration with weekly summaries and vector-based recall.
 */

const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../lib/supabaseServer');
const { searchSimilarLogs } = require('./embeddingService');

// Cache for static system prompt
let cachedSystemPrompt = null;
let cacheTimestamp = null;
let promptFilePath = null;

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Get the path to the system prompt file
 * 
 * @returns {string} Absolute path to system prompt file
 */
function getPromptFilePath() {
  if (!promptFilePath) {
    promptFilePath = path.join(__dirname, '../../utils/prompts/strukt-system-prompt.txt');
  }
  return promptFilePath;
}

/**
 * Check if the cached prompt is still valid
 * 
 * @returns {boolean} True if cache is valid
 */
function isCacheValid() {
  if (!cachedSystemPrompt || !cacheTimestamp) {
    return false;
  }

  // Check TTL
  const age = Date.now() - cacheTimestamp;
  if (age > CACHE_TTL_MS) {
    return false;
  }

  // Check if file has been modified
  try {
    const filePath = getPromptFilePath();
    const stats = fs.statSync(filePath);
    const fileModTime = stats.mtimeMs;
    
    // If file modified after cache was created, invalidate cache
    if (fileModTime > cacheTimestamp) {
      return false;
    }
  } catch (err) {
    // If we can't check file stats, invalidate cache to be safe
    console.warn('Failed to check prompt file modification time:', err.message);
    return false;
  }

  return true;
}

/**
 * Load the static system prompt from file
 * 
 * @returns {string} System prompt text
 * @throws {Error} If file cannot be read
 */
function loadSystemPrompt() {
  try {
    const filePath = getPromptFilePath();
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Update cache
    cachedSystemPrompt = content;
    cacheTimestamp = Date.now();
    
    return content;
  } catch (err) {
    console.error('Failed to load system prompt from file:', err);
    throw new Error(`Failed to load system prompt: ${err.message}`);
  }
}

/**
 * Get the static system prompt (with caching)
 * 
 * @returns {string} System prompt text
 */
function getSystemPrompt() {
  if (isCacheValid()) {
    return cachedSystemPrompt;
  }

  return loadSystemPrompt();
}

/**
 * Fetch last 7 days of logs for a user
 * 
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Array>} Array of recent log entries
 */
async function fetchRecentLogs(userId) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabaseAdmin
      .from('ai_coach_logs')
      .select('user_message, ai_response, timestamp')
      .eq('user_id', userId)
      .eq('success', true)
      .gte('timestamp', sevenDaysAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch recent logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception while fetching recent logs:', error);
    return [];
  }
}

/**
 * Fetch weekly summaries for a user
 * 
 * @param {string} userId - User ID (UUID)
 * @param {number} limit - Number of summaries to fetch
 * @returns {Promise<Array>} Array of weekly summary notes
 */
async function fetchWeeklySummaries(userId, limit = 4) {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_coach_notes')
      .select('note, created_at')
      .eq('user_id', userId)
      .eq('type', 'weekly_summary')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch weekly summaries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception while fetching weekly summaries:', error);
    return [];
  }
}

/**
 * Fetch relevant past logs using vector search
 * 
 * @param {string} userId - User ID (UUID)
 * @param {string} queryText - Current user query
 * @returns {Promise<Array>} Array of relevant past logs
 */
async function fetchRelevantPastLogs(userId, queryText) {
  try {
    if (!queryText || queryText.length < 10) {
      return [];
    }

    const results = await searchSimilarLogs({
      userId,
      queryText,
      limit: 3,
      daysBack: 90,
    });

    return results;
  } catch (error) {
    console.error('Exception while fetching relevant past logs:', error);
    return [];
  }
}

/**
 * Build dynamic user context section
 * 
 * @param {Object} userData - User profile and state data
 * @param {Object} [userData.profile] - User profile information
 * @param {Array} [userData.memory] - Recent conversation history
 * @param {Object} [userData.plan] - User's current plan
 * @param {string} [userData.userId] - User ID for fetching logs
 * @param {string} [userData.currentQuery] - Current user query for vector search
 * @returns {Promise<string>} Formatted user context
 */
async function buildUserContext(userData = {}) {
  const { profile, memory, plan, userId, currentQuery } = userData;
  const sections = [];

  // Add memory/conversation history (immediate context)
  if (memory && Array.isArray(memory) && memory.length > 0) {
    const memoryLines = memory.map((item, idx) => {
      const user = item.message || item.userMessage || '';
      const ai = item.response || item.aiResponse || '';
      return `[${idx + 1}] User: ${user}\n    AI: ${ai}`;
    });
    
    sections.push(`\n=== RECENT CONVERSATION ===\n${memoryLines.join('\n')}\n`);
  }

  // Add last 7 days logs summary (short-term memory)
  if (userId) {
    const recentLogs = await fetchRecentLogs(userId);
    if (recentLogs.length > 0) {
      const logSummary = [];
      const activityTypes = { workouts: 0, meals: 0, sleep: 0, mood: 0 };
      
      recentLogs.forEach(log => {
        const msg = log.user_message.toLowerCase();
        if (msg.includes('workout') || msg.includes('train') || msg.includes('exercise')) {
          activityTypes.workouts++;
        }
        if (msg.includes('meal') || msg.includes('ate') || msg.includes('food')) {
          activityTypes.meals++;
        }
        if (msg.includes('sleep') || msg.includes('slept')) {
          activityTypes.sleep++;
        }
        if (msg.includes('stress') || msg.includes('mood') || msg.includes('feeling')) {
          activityTypes.mood++;
        }
      });

      const summaryParts = [];
      if (activityTypes.workouts > 0) summaryParts.push(`${activityTypes.workouts} workout discussions`);
      if (activityTypes.meals > 0) summaryParts.push(`${activityTypes.meals} meal discussions`);
      if (activityTypes.sleep > 0) summaryParts.push(`${activityTypes.sleep} sleep mentions`);
      if (activityTypes.mood > 0) summaryParts.push(`${activityTypes.mood} mood/stress mentions`);

      if (summaryParts.length > 0) {
        logSummary.push(`Last 7 Days Activity: ${summaryParts.join(', ')}`);
        sections.push(`\n=== LAST 7 DAYS SUMMARY ===\n${logSummary.join('\n')}\n`);
      }
    }

    // Add weekly summaries (long-term memory)
    const weeklySummaries = await fetchWeeklySummaries(userId);
    if (weeklySummaries.length > 0) {
      const summaryLines = weeklySummaries.map((summary, idx) => {
        const date = new Date(summary.created_at).toLocaleDateString();
        return `[Week of ${date}] ${summary.note}`;
      });
      
      sections.push(`\n=== AI NOTES FROM PREVIOUS WEEKS ===\n${summaryLines.join('\n\n')}\n`);
    }

    // Add relevant past logs (vector-based recall)
    if (currentQuery) {
      const relevantLogs = await fetchRelevantPastLogs(userId, currentQuery);
      if (relevantLogs.length > 0) {
        const logLines = relevantLogs.map(log => {
          const date = new Date(log.created_at).toLocaleDateString();
          return `[${date}] ${log.text.substring(0, 150)}${log.text.length > 150 ? '...' : ''}`;
        });
        
        sections.push(`\n=== RELEVANT PAST LOGS ===\n${logLines.join('\n')}\n`);
      }
    }
  }

  // Add profile context
  if (profile && typeof profile === 'object') {
    const profileLines = [];
    
    if (profile.primary_goal) {
      profileLines.push(`Goal: ${profile.primary_goal}`);
    }
    
    if (profile.dietary_needs) {
      profileLines.push(`Dietary needs: ${profile.dietary_needs}`);
    }
    
    if (profile.conditions && profile.conditions.length > 0) {
      profileLines.push(`Medical conditions: ${profile.conditions.join(', ')}`);
    }
    
    if (profile.injuries && profile.injuries.length > 0) {
      profileLines.push(`Injuries: ${profile.injuries.join(', ')}`);
    }
    
    if (profileLines.length > 0) {
      sections.push(`\n=== USER PROFILE ===\n${profileLines.join('\n')}\n`);
    }
  }

  // Add plan context
  if (plan && typeof plan === 'object') {
    const planLines = [];
    
    if (plan.name) planLines.push(`Current plan: ${plan.name}`);
    if (plan.phase) planLines.push(`Phase: ${plan.phase}`);
    if (plan.focus) planLines.push(`Focus: ${plan.focus}`);
    
    if (planLines.length > 0) {
      sections.push(`\n=== CURRENT PLAN ===\n${planLines.join('\n')}\n`);
    }
  }

  return sections.join('');
}

/**
 * Construct the complete prompt with system and user context
 * 
 * @param {Object} userData - User profile and state data
 * @returns {Promise<string>} Complete prompt ready for LLM
 */
async function buildCompletePrompt(userData = {}) {
  try {
    const systemPrompt = getSystemPrompt();
    const userContext = await buildUserContext(userData);
    
    if (userContext) {
      return `${systemPrompt}\n${userContext}`;
    }
    
    return systemPrompt;
  } catch (err) {
    console.error('Failed to build complete prompt:', err);
    // Return a minimal fallback prompt
    return 'You are a health and fitness coach. Provide helpful, safe advice.';
  }
}

/**
 * Clear the prompt cache (useful for testing or manual refresh)
 */
function clearPromptCache() {
  cachedSystemPrompt = null;
  cacheTimestamp = null;
}

/**
 * Get cache statistics (for debugging/monitoring)
 * 
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  return {
    cached: cachedSystemPrompt !== null,
    age: cacheTimestamp ? Date.now() - cacheTimestamp : null,
    valid: isCacheValid(),
    ttl: CACHE_TTL_MS,
  };
}

module.exports = {
  getSystemPrompt,
  buildUserContext,
  buildCompletePrompt,
  clearPromptCache,
  getCacheStats,
};
