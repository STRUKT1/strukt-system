/**
 * Prompt Service
 * 
 * Manages system prompts with caching and optimization for AI coach interactions.
 * Separates static (system) and dynamic (user-specific) prompt sections.
 */

const fs = require('fs');
const path = require('path');

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
 * Build dynamic user context section
 * 
 * @param {Object} userData - User profile and state data
 * @param {Object} [userData.profile] - User profile information
 * @param {Array} [userData.memory] - Recent conversation history
 * @param {Object} [userData.plan] - User's current plan
 * @returns {string} Formatted user context
 */
function buildUserContext(userData = {}) {
  const { profile, memory, plan } = userData;
  const sections = [];

  // Add memory/conversation history
  if (memory && Array.isArray(memory) && memory.length > 0) {
    const memoryLines = memory.map((item, idx) => {
      const user = item.message || item.userMessage || '';
      const ai = item.response || item.aiResponse || '';
      return `[${idx + 1}] User: ${user}\n    AI: ${ai}`;
    });
    
    sections.push(`\n=== RECENT CONVERSATION ===\n${memoryLines.join('\n')}\n`);
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
 * @returns {string} Complete prompt ready for LLM
 */
function buildCompletePrompt(userData = {}) {
  try {
    const systemPrompt = getSystemPrompt();
    const userContext = buildUserContext(userData);
    
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
