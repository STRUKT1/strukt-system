/**
 * Plan Service
 *
 * Handles CRUD operations for training/nutrition plans in Supabase.
 * Supports version history and RLS-based access control.
 */

const { supabaseAdmin } = require('../lib/supabaseServer');
const logger = require('../lib/logger');

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
      logger.error('Database error saving plan', {
        error: error.message,
        userIdMasked: logger.maskUserId(userId),
      });
      throw error;
    }

    logger.info('Plan saved successfully', {
      userIdMasked: logger.maskUserId(userId),
      version: nextVersion,
      generationMethod: options.generationMethod || 'ai',
    });
    return data;
  } catch (error) {
    logger.error('Failed to save plan', {
      error: error.message,
      userIdMasked: logger.maskUserId(userId),
    });
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
      logger.error('Database error fetching latest plan', {
        error: error.message,
        userIdMasked: logger.maskUserId(userId),
      });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to get latest plan', {
      error: error.message,
      userIdMasked: logger.maskUserId(userId),
    });
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
      logger.error('Database error fetching plan by version', {
        error: error.message,
        userIdMasked: logger.maskUserId(userId),
        version,
      });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to get plan by version', {
      error: error.message,
      userIdMasked: logger.maskUserId(userId),
      version,
    });
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
      logger.error('Database error fetching version history', {
        error: error.message,
        userIdMasked: logger.maskUserId(userId),
        limit,
      });
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Failed to get version history', {
      error: error.message,
      userIdMasked: logger.maskUserId(userId),
      limit,
    });
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
      logger.error('Database error updating plan', {
        error: error.message,
        planId,
      });
      throw error;
    }

    logger.info('Plan updated successfully', { planId });
    return data;
  } catch (error) {
    logger.error('Failed to update plan', {
      error: error.message,
      planId,
    });
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
      logger.error('Database error deleting plan', {
        error: error.message,
        planId,
      });
      throw error;
    }

    logger.info('Plan deleted successfully', { planId });
    return true;
  } catch (error) {
    logger.error('Failed to delete plan', {
      error: error.message,
      planId,
    });
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
