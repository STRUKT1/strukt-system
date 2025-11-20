/**
 * PII Masking Utilities for OpenAI API Calls
 *
 * This module provides utilities to minimize PII (Personally Identifiable Information)
 * sent to third-party AI services like OpenAI while maintaining coaching functionality.
 *
 * SECURITY: HIGH-005 - PII Minimization for OpenAI Requests
 *
 * Guidelines:
 * - ❌ NEVER send: email, full name, phone, address, user IDs
 * - ✅ SEND ONLY: first name, fitness-relevant data (age, goals, medical conditions)
 * - All AI-bound user data must pass through sanitizeProfileForAI()
 */

/**
 * Extract first name only from a full name
 * Prevents sending full names to external AI services
 *
 * @param {string} fullName - User's full name
 * @returns {string} First name only, or 'there' as fallback
 *
 * @example
 * getFirstNameOnly('John Smith') // returns 'John'
 * getFirstNameOnly('Sarah') // returns 'Sarah'
 * getFirstNameOnly('') // returns 'there'
 * getFirstNameOnly(null) // returns 'there'
 */
function getFirstNameOnly(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return 'there';
  }

  const trimmed = fullName.trim();
  if (!trimmed) {
    return 'there';
  }

  // Split by space and take first part
  const firstName = trimmed.split(/\s+/)[0];
  return firstName || 'there';
}

/**
 * Remove email from user object (useful for spread operations)
 *
 * @param {Object} userProfile - User profile object
 * @returns {Object} Profile without email field
 */
function stripEmail(userProfile) {
  if (!userProfile || typeof userProfile !== 'object') {
    return {};
  }

  const { email, ...profileWithoutEmail } = userProfile;
  return profileWithoutEmail;
}

/**
 * Sanitize user profile for AI prompts
 *
 * This is the MAIN function to use before sending ANY user data to OpenAI.
 * It removes unnecessary PII while keeping fitness-relevant data.
 *
 * WHAT IS KEPT (fitness-relevant):
 * - firstName (extracted from full_name)
 * - age, gender, weight, height
 * - goals, primary_goal, target_event, target_event_date
 * - experience_level, fitness_experience
 * - conditions, injuries, is_pregnant_or_breastfeeding, is_recovering_from_surgery
 * - allergies, dietary restrictions, diet_pattern, faith_based_diet
 * - coaching preferences (persona, tone)
 * - motivation fields (why_statement, success_definition)
 * - training preferences (days_per_week, session_minutes, equipment_access)
 * - wellness context (relationship_with_exercise, relationship_with_food)
 *
 * WHAT IS REMOVED (unnecessary PII):
 * - email
 * - full_name (replaced with firstName)
 * - user_id (unless explicitly needed)
 * - phone, address, or any other contact info
 * - auth tokens, credentials
 *
 * @param {Object} profile - Raw user profile from database
 * @returns {Object} Sanitized profile safe for AI services
 *
 * @example
 * const rawProfile = {
 *   user_id: '123',
 *   email: 'john@example.com',
 *   full_name: 'John Smith',
 *   age: 35,
 *   primary_goal: 'lose_weight'
 * };
 *
 * const sanitized = sanitizeProfileForAI(rawProfile);
 * // Returns: { firstName: 'John', age: 35, primary_goal: 'lose_weight' }
 * // Note: email, user_id, and full_name are removed
 */
function sanitizeProfileForAI(profile) {
  if (!profile || typeof profile !== 'object') {
    return {};
  }

  // Extract first name only from full_name or name field
  const firstName = getFirstNameOnly(profile.full_name || profile.name);

  // Build sanitized profile with ONLY fitness-relevant fields
  const sanitized = {
    // Personalization (first name only)
    firstName,

    // Demographics (fitness-relevant)
    ...(profile.age !== undefined && { age: profile.age }),
    ...(profile.gender && { gender: profile.gender }),
    ...(profile.weight !== undefined && { weight: profile.weight }),
    ...(profile.height !== undefined && { height: profile.height }),

    // Goals
    ...(profile.primary_goal && { primary_goal: profile.primary_goal }),
    ...(profile.goals && { goals: profile.goals }),
    ...(profile.target_event && { target_event: profile.target_event }),
    ...(profile.target_event_date && { target_event_date: profile.target_event_date }),
    ...(profile.success_definition && { success_definition: profile.success_definition }),
    ...(profile.why_statement && { why_statement: profile.why_statement }),

    // Experience level
    ...(profile.experience_level && { experience_level: profile.experience_level }),
    ...(profile.fitness_experience && { fitness_experience: profile.fitness_experience }),

    // Medical & Safety (necessary for safe coaching)
    ...(profile.conditions && { conditions: profile.conditions }),
    ...(profile.injuries && { injuries: profile.injuries }),
    ...(profile.is_pregnant_or_breastfeeding !== undefined && {
      is_pregnant_or_breastfeeding: profile.is_pregnant_or_breastfeeding
    }),
    ...(profile.is_recovering_from_surgery !== undefined && {
      is_recovering_from_surgery: profile.is_recovering_from_surgery
    }),

    // Nutrition & Dietary
    ...(profile.allergies && { allergies: profile.allergies }),
    ...(profile.dietary_restrictions && { dietary_restrictions: profile.dietary_restrictions }),
    ...(profile.diet_pattern && { diet_pattern: profile.diet_pattern }),
    ...(profile.faith_based_diet && { faith_based_diet: profile.faith_based_diet }),
    ...(profile.daily_kcal_target !== undefined && { daily_kcal_target: profile.daily_kcal_target }),
    ...(profile.macro_targets && { macro_targets: profile.macro_targets }),

    // Training preferences
    ...(profile.days_per_week !== undefined && { days_per_week: profile.days_per_week }),
    ...(profile.session_minutes !== undefined && { session_minutes: profile.session_minutes }),
    ...(profile.equipment_access && { equipment_access: profile.equipment_access }),
    ...(profile.workout_location && { workout_location: profile.workout_location }),

    // Coaching preferences
    ...(profile.coaching_persona && { coaching_persona: profile.coaching_persona }),
    ...(profile.coaching_tone && { coaching_tone: profile.coaching_tone }),

    // Wellness context
    ...(profile.relationship_with_exercise && { relationship_with_exercise: profile.relationship_with_exercise }),
    ...(profile.relationship_with_food && { relationship_with_food: profile.relationship_with_food }),
    ...(profile.avg_sleep_hours !== undefined && { avg_sleep_hours: profile.avg_sleep_hours }),

    // Additional context (text fields without PII)
    ...(profile.anything_else_context && { anything_else_context: profile.anything_else_context }),

    // Legacy fields for backward compatibility (if they exist)
    ...(profile['Main Goal'] && { 'Main Goal': profile['Main Goal'] }),
    ...(profile['Dietary Needs/Allergies'] && { 'Dietary Needs/Allergies': profile['Dietary Needs/Allergies'] }),
    ...(profile['Medical Considerations'] && { 'Medical Considerations': profile['Medical Considerations'] }),
    ...(profile['Preferred Coaching Tone'] && { 'Preferred Coaching Tone': profile['Preferred Coaching Tone'] }),
    ...(profile['Vision of Success'] && { 'Vision of Success': profile['Vision of Success'] }),
  };

  // EXPLICITLY EXCLUDED (document what we're NOT sending):
  // - email: NEVER sent
  // - full_name: NEVER sent (only firstName)
  // - user_id: NEVER sent (not needed for AI context)
  // - phone: NEVER sent
  // - address: NEVER sent
  // - created_at, updated_at: Not relevant for AI
  // - auth fields: NEVER sent

  return sanitized;
}

/**
 * Validate that a profile object doesn't contain obvious PII
 * Use this for testing and debugging
 *
 * @param {Object} profile - Profile to validate
 * @returns {Object} { isClean: boolean, violations: string[] }
 *
 * @example
 * validateNoPII({ firstName: 'John', age: 35 })
 * // Returns: { isClean: true, violations: [] }
 *
 * validateNoPII({ email: 'john@example.com', firstName: 'John' })
 * // Returns: { isClean: false, violations: ['email'] }
 */
function validateNoPII(profile) {
  if (!profile || typeof profile !== 'object') {
    return { isClean: true, violations: [] };
  }

  const violations = [];

  // Check for PII fields that should NEVER be present
  const piiFields = [
    'email',
    'full_name',
    'name', // Should be firstName instead
    'user_id',
    'phone',
    'phone_number',
    'address',
    'street',
    'city',
    'zipcode',
    'postal_code',
    'ssn',
    'social_security',
    'credit_card',
    'password',
    'token',
    'api_key',
  ];

  for (const field of piiFields) {
    if (profile[field] !== undefined) {
      violations.push(field);
    }
  }

  // Check for email patterns in string values
  const emailRegex = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  for (const [key, value] of Object.entries(profile)) {
    if (typeof value === 'string' && emailRegex.test(value)) {
      violations.push(`${key} (contains email pattern)`);
    }
  }

  return {
    isClean: violations.length === 0,
    violations,
  };
}

module.exports = {
  getFirstNameOnly,
  stripEmail,
  sanitizeProfileForAI,
  validateNoPII,
};
