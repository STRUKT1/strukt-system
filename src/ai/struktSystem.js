/**
 * Canonical STRUKT System Prompt Module
 * 
 * This module provides the single source of truth for the STRUKT system prompt
 * and handles injection of user state (profile, plan, memory) into LLM calls.
 */

const fs = require('fs');
const path = require('path');

// Load the base system prompt once at module initialization
const baseSystemPrompt = fs.readFileSync(
  path.join(__dirname, '../../utils/prompts/strukt-system-prompt.txt'),
  'utf-8',
);

/**
 * Generate the complete STRUKT system prompt with user context
 * 
 * @param {Object} profile - User profile data (goals, preferences, dietary needs, etc.)
 * @param {Object} plan - User's current plan or program data
 * @param {Array} memory - Recent chat history and interactions
 * @returns {string} Complete system prompt with user context
 */
function getStruktSystemPrompt(profile = null, plan = null, memory = null) {
  const promptSections = [baseSystemPrompt];
  
  // Add memory context if available
  if (memory && memory.length > 0) {
    const memoryContext = buildMemoryContext(memory);
    if (memoryContext) {
      promptSections.push(memoryContext);
    }
  }
  
  // Add user profile context if available
  if (profile) {
    const profileContext = buildProfileContext(profile);
    if (profileContext) {
      promptSections.push(profileContext);
    }
  }
  
  // Add plan context if available
  if (plan) {
    const planContext = buildPlanContext(plan);
    if (planContext) {
      promptSections.push(planContext);
    }
  }
  
  return promptSections.filter(Boolean).join('\n\n');
}

/**
 * Build memory context from chat history
 * 
 * @param {Array} memory - Array of recent chat interactions
 * @returns {string|null} Formatted memory context
 */
function buildMemoryContext(memory) {
  if (!memory || !memory.length) return null;
  
  const lines = memory.map(({ message, aiResponse }, idx) => {
    return `Conversation ${idx + 1}:\nUser: ${message}\nAssistant: ${aiResponse}`;
  });
  
  return `Here is a summary of recent conversations:\n${lines.join('\n---\n')}`;
}

/**
 * Build profile context from user data
 * 
 * @param {Object} profile - User profile fields
 * @returns {string|null} Formatted profile context
 */
function buildProfileContext(profile) {
  if (!profile || typeof profile !== 'object') return null;
  
  const lines = [];
  
  // Map common profile fields to readable context
  if (profile['Main Goal'] || profile.goals) {
    const goals = profile['Main Goal'] || profile.goals;
    lines.push(`Goals: ${Array.isArray(goals) ? goals.join(', ') : goals}`);
  }
  
  if (profile['Dietary Needs/Allergies'] || profile.dietary_needs) {
    const dietary = profile['Dietary Needs/Allergies'] || profile.dietary_needs;
    lines.push(`Dietary needs: ${dietary}`);
  }
  
  if (profile['Medical Considerations'] || profile.medical_considerations) {
    const medical = profile['Medical Considerations'] || profile.medical_considerations;
    lines.push(`Medical considerations: ${medical}`);
  }
  
  if (profile['Preferred Coaching Tone'] || profile.coaching_tone) {
    const tone = profile['Preferred Coaching Tone'] || profile.coaching_tone;
    lines.push(`Coaching tone: ${Array.isArray(tone) ? tone.join(', ') : tone}`);
  }
  
  if (profile['Vision of Success'] || profile.vision) {
    const vision = profile['Vision of Success'] || profile.vision;
    lines.push(`Vision of success: ${vision}`);
  }
  
  return lines.length ? `Here is the user's profile for context:\n${lines.join('\n')}` : null;
}

/**
 * Build plan context from user's current plan
 * 
 * @param {Object} plan - User's plan or program data
 * @returns {string|null} Formatted plan context
 */
function buildPlanContext(plan) {
  if (!plan || typeof plan !== 'object') return null;
  
  const lines = [];
  
  if (plan.name) lines.push(`Current plan: ${plan.name}`);
  if (plan.phase) lines.push(`Plan phase: ${plan.phase}`);
  if (plan.duration) lines.push(`Plan duration: ${plan.duration}`);
  if (plan.focus) lines.push(`Focus areas: ${Array.isArray(plan.focus) ? plan.focus.join(', ') : plan.focus}`);
  
  return lines.length ? `Here is the user's current plan:\n${lines.join('\n')}` : null;
}

/**
 * Get the base system prompt without user context
 * 
 * @returns {string} Base STRUKT system prompt
 */
function getBaseSystemPrompt() {
  return baseSystemPrompt;
}

module.exports = {
  getStruktSystemPrompt,
  getBaseSystemPrompt,
  buildMemoryContext,
  buildProfileContext,
  buildPlanContext,
};