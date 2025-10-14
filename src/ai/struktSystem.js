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
  
  const sections = [];
  
  // PERSONA INJECTION
  if (profile.coaching_persona) {
    const personaMap = {
      'motivator': 'The Motivator - energetic, enthusiastic, and encouraging. Use exclamation points and celebratory language.',
      'strategist': 'The Strategist - analytical, structured, and data-driven. Focus on plans, metrics, and logical progression.',
      'nurturer': 'The Nurturer - empathetic, supportive, and gentle. Prioritize emotional wellbeing and self-compassion.',
    };
    
    const personaDesc = personaMap[profile.coaching_persona] || personaMap['strategist'];
    sections.push(`\n🎭 COACHING PERSONA: You must adopt the persona of '${personaDesc}'`);
  }
  
  // THE "I REMEMBER YOU SAID..." PRINCIPLE
  if (profile.why_statement) {
    sections.push(`\n💭 USER'S WHY: The user has shared their deep motivation: "${profile.why_statement}". Reference this when relevant for motivation.`);
  }
  
  if (profile.relationship_with_exercise) {
    sections.push(`\n🏃 EXERCISE RELATIONSHIP: The user's relationship with exercise: "${profile.relationship_with_exercise}"`);
  }
  
  if (profile.relationship_with_food) {
    sections.push(`\n🍽️ FOOD RELATIONSHIP: The user's relationship with food: "${profile.relationship_with_food}"`);
  }
  
  // SAFETY & MEDICAL CONTEXT
  const safetyNotes = [];
  
  if (profile.conditions) {
    safetyNotes.push(`Medical conditions: ${Array.isArray(profile.conditions) ? profile.conditions.join(', ') : profile.conditions}`);
  }
  
  if (profile.is_pregnant_or_breastfeeding) {
    safetyNotes.push('User is pregnant or breastfeeding - all advice must be gentle and prenatal/postnatal appropriate');
  }
  
  if (profile.is_recovering_from_surgery) {
    safetyNotes.push('User is recovering from surgery - advice must be conservative and recovery-focused');
  }
  
  if (profile.injuries) {
    safetyNotes.push(`Injuries to be aware of: ${Array.isArray(profile.injuries) ? profile.injuries.join(', ') : profile.injuries}`);
  }
  
  if (safetyNotes.length > 0) {
    sections.push(`\n⚠️ SAFETY & MEDICAL: ${safetyNotes.join('. ')}. You must NOT give advice that contradicts these conditions. Always err on the side of caution.`);
  }
  
  // DIETARY & CULTURAL CONTEXT
  if (profile.faith_based_diet) {
    sections.push(`\n🕌 DIETARY REQUIREMENTS: User follows ${profile.faith_based_diet} dietary guidelines. All food suggestions must respect this.`);
  }
  
  // GOALS & SUCCESS DEFINITION
  if (profile.primary_goal || profile.goals) {
    const goals = profile.primary_goal || profile.goals;
    sections.push(`\n🎯 GOALS: ${Array.isArray(goals) ? goals.join(', ') : goals}`);
  }
  
  if (profile.success_definition) {
    sections.push(`\n✨ SUCCESS DEFINITION: The user defines success as: "${profile.success_definition}"`);
  }
  
  if (profile.target_event) {
    const eventText = profile.target_event_date 
      ? `${profile.target_event} on ${new Date(profile.target_event_date).toLocaleDateString()}`
      : profile.target_event;
    sections.push(`\n📅 TARGET EVENT: ${eventText}`);
  }
  
  // Additional context
  if (profile.anything_else_context) {
    sections.push(`\n📝 ADDITIONAL CONTEXT: ${profile.anything_else_context}`);
  }
  
  // Legacy fields for backward compatibility
  if (profile['Dietary Needs/Allergies'] || profile.dietary_needs) {
    const dietary = profile['Dietary Needs/Allergies'] || profile.dietary_needs;
    sections.push(`\nDietary needs: ${dietary}`);
  }
  
  if (profile['Medical Considerations'] || profile.medical_considerations) {
    const medical = profile['Medical Considerations'] || profile.medical_considerations;
    sections.push(`\nMedical considerations: ${medical}`);
  }
  
  if (profile['Preferred Coaching Tone'] || profile.coaching_tone) {
    const tone = profile['Preferred Coaching Tone'] || profile.coaching_tone;
    sections.push(`\nCoaching tone: ${Array.isArray(tone) ? tone.join(', ') : tone}`);
  }
  
  if (profile['Vision of Success'] || profile.vision) {
    const vision = profile['Vision of Success'] || profile.vision;
    sections.push(`\nVision of success: ${vision}`);
  }
  
  return sections.length ? `\n=== USER CONTEXT ===\n${sections.join('\n')}\n==================\n` : null;
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