/**
 * Plan Service
 * 
 * Handles CRUD operations for training/nutrition plans in Supabase.
 * Supports version history and RLS-based access control.
 */

const { supabaseAdmin } = require('../lib/supabaseServer');

const TABLE = 'plans';

/**
 * Save a new plan to Supabase
 * @param {string} userId - User ID (UUID)
 * @param {Object} planData - Plan content
 * @param {Object} options - Additional metadata
 * @returns {Promise<Object>} Saved plan record
 */
async function savePlan(userId, planData, options = {}) {
  try {
    // Get current version for this user
    const { data: latestPlan } = await supabaseAdmin
      .from(TABLE)
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = latestPlan ? (latestPlan.version + 1) : 1;

    const planRecord = {
      user_id: userId,
      plan_data: planData,
      version: nextVersion,
      generation_method: options.generationMethod || 'ai',
      fallback_reason: options.fallbackReason || null,
      wellness_context: options.wellnessContext || null,
      profile_snapshot: options.profileSnapshot || null,
      is_valid: options.isValid !== undefined ? options.isValid : true,
      validation_errors: options.validationErrors || null,
    };

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert(planRecord)
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving plan:', error);
      throw error;
    }

    console.log(`✅ Plan saved successfully for user ${userId}, version ${nextVersion}`);
    return data;
  } catch (error) {
    console.error('❌ Failed to save plan:', error);
    throw error;
  }
}

/**
 * Get the latest plan for a user
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Object|null>} Latest plan or null
 */
async function getLatestPlan(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching latest plan:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Failed to get latest plan:', error);
    throw error;
  }
}

/**
 * Get plan by specific version
 * @param {string} userId - User ID (UUID)
 * @param {number} version - Version number
 * @returns {Promise<Object|null>} Plan or null
 */
async function getPlanByVersion(userId, version) {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('version', version)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching plan by version:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Failed to get plan by version:', error);
    throw error;
  }
}

/**
 * Get version history for a user (latest N versions)
 * @param {string} userId - User ID (UUID)
 * @param {number} limit - Maximum number of versions to return (default: 5)
 * @returns {Promise<Array>} Array of plans
 */
async function getVersionHistory(userId, limit = 5) {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching version history:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Failed to get version history:', error);
    throw error;
  }
}

/**
 * Update an existing plan (rarely used - prefer creating new versions)
 * @param {string} planId - Plan ID (UUID)
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated plan
 */
async function updatePlan(planId, updates) {
  try {
    // Remove fields that shouldn't be updated
    const { id, user_id, version, created_at, ...allowedUpdates } = updates;

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(allowedUpdates)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating plan:', error);
      throw error;
    }

    console.log(`✅ Plan ${planId} updated successfully`);
    return data;
  } catch (error) {
    console.error('❌ Failed to update plan:', error);
    throw error;
  }
}

/**
 * Delete a plan (rarely used - prefer marking as invalid)
 * @param {string} planId - Plan ID (UUID)
 * @returns {Promise<boolean>} Success status
 */
async function deletePlan(planId) {
  try {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq('id', planId);

    if (error) {
      console.error('❌ Error deleting plan:', error);
      throw error;
    }

    console.log(`✅ Plan ${planId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete plan:', error);
    throw error;
  }
}

module.exports = {
  savePlan,
  getLatestPlan,
  getPlanByVersion,
  getVersionHistory,
  updatePlan,
  deletePlan,
};
