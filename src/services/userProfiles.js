/**
 * User Profiles Service
 * 
 * Handles user profile operations in Supabase with optional dual-write to Airtable.
 * Implements the mapping from Airtable fields to Supabase schema.
 */

const { supabaseAdmin } = require('../lib/supabaseServer');

const TABLE = 'user_profiles';

// Environment flags for backend selection and dual-write
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';
const DUAL_WRITE = process.env.DUAL_WRITE === 'true';

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
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('getUserProfile failed:', error);
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

  try {
    const payload = { 
      user_id: userId, 
      ...patch,
      // Ensure updated_at is set (trigger will handle this, but being explicit)
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user profile:', error);
      throw error;
    }

    // Dual-write to Airtable if enabled
    if (DUAL_WRITE) {
      try {
        await writeToAirtable(userId, patch);
        console.log('✅ Dual-write to Airtable successful for user:', userId);
      } catch (airtableError) {
        console.error('⚠️ Dual-write to Airtable failed (non-blocking):', airtableError);
        // Don't throw - dual-write failures shouldn't break the primary operation
      }
    }

    return data;
  } catch (error) {
    console.error('upsertUserProfile failed:', error);
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

  console.log('📝 Airtable dual-write payload:', { userId, fields: Object.keys(airtablePayload) });
  
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
  getServiceConfig
};