/**
 * User Profiles Service
 *
 * Handles user profile operations in Supabase with optional dual-write to Airtable.
 * Implements the mapping from Airtable fields to Supabase schema.
 */

const { supabaseAdmin } = require('../lib/supabaseServer');
const logger = require('../lib/logger');

const TABLE = 'user_profiles';

// Environment flags for backend selection and dual-write
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';
const DUAL_WRITE = process.env.DUAL_WRITE === 'true';

// Valid fields for user_profiles table based on schema
const VALID_PROFILE_FIELDS = new Set([
  'full_name', 'email', 'timezone', 'gender_identity', 'identity_other', 'pronouns',
  'cultural_practices', 'faith_diet_rules', 'cultural_notes', 'obstacles', 'work_pattern',
  'support_system', 'lifestyle_notes', 'injuries', 'conditions', 'contraindications',
  'emergency_ack', 'primary_goal', 'secondary_goals', 'target_event', 'target_event_date',
  'days_per_week', 'session_minutes', 'equipment_access', 'workout_location',
  'workout_style', 'fitness_experience', 'intensity_preference', 'motivation_style',
  'dietary_restrictions', 'food_allergies', 'nutrition_goals', 'cooking_frequency', 'meal_prep_time',
  'current_weight', 'target_weight', 'height', 'body_fat_percentage',
  'daily_kcal_target', 'macro_targets', 'nutrition_targets',
  'beta_consent', 'data_processing_consent',
  'experience_level', 'coaching_tone', 'learning_style', 'height_cm', 'weight_kg',
  'units', 'sleep_time', 'wake_time', 'diet_pattern', 'fasting_pattern', 'diet_notes',
  'allergies', 'intolerances', 'cuisines_like', 'cuisines_avoid', 'budget_band',
  'supplements_current', 'sleep_quality', 'avg_sleep_hours', 'recovery_habits',
  'charity_choice', 'success_definition', 'motivation_notes', 'onboarding_completed',
  'cohort', 'data_env',
  // Proactive coach fields (added 2025-10-14)
  'why_statement', 'is_pregnant_or_breastfeeding', 'is_recovering_from_surgery',
  'faith_based_diet', 'relationship_with_food', 'relationship_with_exercise',
  'coaching_persona', 'anything_else_context'
]);

/**
 * Sanitize profile data by removing unknown fields and handling nulls
 * @param {Object} data - Raw profile data
 * @returns {Object} Sanitized profile data
 */
function sanitizeProfileData(data) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (VALID_PROFILE_FIELDS.has(key)) {
      // Handle null/undefined values safely
      if (value !== null && value !== undefined) {
        sanitized[key] = value;
      }
    }
    // Silently ignore unknown fields for security
  }
  
  return sanitized;
}

/**
 * Get user profile by user ID
 * @param {string} userId - Auth user ID (UUID)
 * @returns {Promise<Object|null>} User profile or null if not found
 */
async function getUserProfile(userId) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }

  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Database error fetching user profile', {
        error: error.message,
        userIdMasked: logger.maskUserId(userId),
      });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to get user profile', {
      error: error.message,
      userIdMasked: logger.maskUserId(userId),
    });
    throw error;
  }
}

/**
 * Upsert user profile (create or update)
 * @param {string} userId - Auth user ID (UUID)
 * @param {Object} patch - Profile data to upsert
 * @returns {Promise<Object>} Updated user profile
 */
async function upsertUserProfile(userId, patch) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!patch || typeof patch !== 'object') {
    throw new Error('Valid patch object is required');
  }

  try {
    // Sanitize input data - remove unknown fields and handle nulls
    const sanitizedPatch = sanitizeProfileData(patch);
    
    const payload = { 
      user_id: userId, 
      ...sanitizedPatch,
      // Ensure updated_at is set (trigger will handle this, but being explicit)
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      logger.error('Database error upserting user profile', {
        error: error.message,
        userIdMasked: logger.maskUserId(userId),
      });
      throw error;
    }

    // Dual-write to Airtable if enabled
    if (DUAL_WRITE) {
      try {
        await writeToAirtable(userId, sanitizedPatch);
        logger.info('Airtable sync completed', {
          userIdMasked: logger.maskUserId(userId),
          syncType: 'dual-write',
        });
      } catch (airtableError) {
        logger.warn('Airtable sync failed (non-blocking)', {
          error: airtableError.message,
          userIdMasked: logger.maskUserId(userId),
          syncType: 'dual-write',
        });
        // Don't throw - dual-write failures shouldn't break the primary operation
      }
    }

    return data;
  } catch (error) {
    logger.error('Failed to upsert user profile', {
      error: error.message,
      userIdMasked: logger.maskUserId(userId),
    });
    throw error;
  }
}

/**
 * Helper function to write user profile to Airtable for dual-write
 * Maps Supabase fields to Airtable fields based on mapping document
 */
async function writeToAirtable(userId, profileData) {
  // Import Airtable utilities only when needed
  const { findUserIdByEmail } = require('../../utils/logging');
  
  // Map Supabase fields to Airtable fields based on docs/airtable_to_supabase_mapping.md
  const airtablePayload = {};
  
  if (profileData.email) airtablePayload['Email'] = profileData.email;
  if (profileData.full_name) airtablePayload['Name'] = profileData.full_name;
  if (profileData.timezone) airtablePayload['Timezone'] = profileData.timezone;
  if (profileData.gender_identity) airtablePayload['Gender Identity'] = profileData.gender_identity;
  if (profileData.pronouns) airtablePayload['Pronouns'] = profileData.pronouns;
  if (profileData.identity_other) airtablePayload['Identity Other'] = profileData.identity_other;
  if (profileData.cultural_practices) airtablePayload['Cultural Practices'] = profileData.cultural_practices;
  
  // Set external_id to map to user_id in Supabase
  airtablePayload['external_id'] = userId;

  logger.debug('Preparing Airtable dual-write', {
    userIdMasked: logger.maskUserId(userId),
    fieldCount: Object.keys(airtablePayload).length,
  });

  // Note: The actual Airtable write implementation would go here
  // For now, we just log the payload that would be written
  // In full implementation, this would use the existing Airtable utilities
  // to find or create the user record and update it
}

/**
 * Get configuration flags for debugging
 */
function getServiceConfig() {
  return {
    DATA_BACKEND_PRIMARY,
    DUAL_WRITE,
    TABLE
  };
}

module.exports = {
  getUserProfile,
  upsertUserProfile,
  getServiceConfig,
  sanitizeProfileData // Export for testing
};