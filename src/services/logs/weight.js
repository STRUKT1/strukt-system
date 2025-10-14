/**
 * Weight Logs Service
 * 
 * Handles weight tracking operations in Supabase
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');

const TABLE = 'weight_logs';

// Environment flags for backend selection
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';

// Valid fields for weight_logs table based on schema
const VALID_WEIGHT_FIELDS = new Set([
  'weight_kg', 'created_at'
]);

/**
 * Sanitize weight data by removing unknown fields
 * @param {Object} data - Raw weight data
 * @returns {Object} Sanitized weight data
 */
function sanitizeWeightData(data) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (VALID_WEIGHT_FIELDS.has(key)) {
      if (value !== null && value !== undefined) {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

/**
 * Log a weight entry
 * @param {string} userId - Auth user ID
 * @param {Object} weightData - Weight data with weight_kg
 * @returns {Promise<Object>} Created weight log record
 */
async function logWeight(userId, weightData) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!weightData || typeof weightData !== 'object') {
    throw new Error('Valid weight data is required');
  }

  if (!weightData.weight_kg || typeof weightData.weight_kg !== 'number') {
    throw new Error('weight_kg is required and must be a number');
  }

  // Sanitize input data
  const sanitizedData = sanitizeWeightData(weightData);
  const payload = { 
    user_id: userId, 
    ...sanitizedData 
  };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error logging weight:', error.message);
    throw error;
  }

  return data;
}

/**
 * Get weight logs for a user
 * @param {string} userId - Auth user ID
 * @param {number} limit - Number of records to return (default: all)
 * @returns {Promise<Array>} Array of weight log records
 */
async function getUserWeightLogs(userId, limit = null) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  let query = supabaseAdmin
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching weight logs:', error);
    throw error;
  }

  return data || [];
}

module.exports = {
  logWeight,
  getUserWeightLogs,
  sanitizeWeightData // Export for testing
};
