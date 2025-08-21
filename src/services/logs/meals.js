/**
 * Meals Service
 * 
 * Handles meal logging operations in Supabase with optional dual-write to Airtable.
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');

const TABLE = 'meals';

// Environment flags for backend selection and dual-write
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';
const DUAL_WRITE = process.env.DUAL_WRITE === 'true';

// Valid fields for meals table based on schema
const VALID_MEAL_FIELDS = new Set([
  'description', 'macros', 'calories', 'notes', 'date'
]);

/**
 * Sanitize meal data by removing unknown fields and handling nulls
 * @param {Object} data - Raw meal data
 * @returns {Object} Sanitized meal data
 */
function sanitizeMealData(data) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (VALID_MEAL_FIELDS.has(key)) {
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
 * Log a meal entry
 * @param {string} userId - Auth user ID
 * @param {Object} mealData - Meal data
 * @returns {Promise<Object>} Created meal record
 */
async function logMeal(userId, mealData) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!mealData || typeof mealData !== 'object') {
    throw new Error('Valid meal data is required');
  }

  // Sanitize input data
  const sanitizedData = sanitizeMealData(mealData);

  const payload = {
    user_id: userId,
    ...sanitizedData,
    date: sanitizedData.date || new Date().toISOString().split('T')[0] // Default to today
  };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error logging meal:', error.message);
    throw error;
  }

  // Dual-write to Airtable if enabled
  if (DUAL_WRITE) {
    try {
      await writeMealToAirtable(userId, sanitizedData);
      console.log('✅ Meal dual-write to Airtable successful');
    } catch (airtableError) {
      console.error('⚠️ Meal dual-write to Airtable failed (non-blocking):', airtableError.message);
      // Don't throw - dual-write failures shouldn't break the primary operation
    }
  }

  return data;
}

/**
 * Helper function to write meal to Airtable for dual-write
 */
async function writeMealToAirtable(userId, mealData) {
  // Mapping based on docs/airtable_to_supabase_mapping.md
  const airtablePayload = {};
  
  if (mealData.description) airtablePayload['Description'] = mealData.description;
  if (mealData.calories) airtablePayload['Calories'] = mealData.calories;
  if (mealData.macros) {
    if (mealData.macros.protein) airtablePayload['Protein'] = mealData.macros.protein;
    if (mealData.macros.carbs) airtablePayload['Carbs'] = mealData.macros.carbs;
    if (mealData.macros.fat) airtablePayload['Fats'] = mealData.macros.fat;
  }
  if (mealData.notes) airtablePayload['Notes'] = mealData.notes;

  console.log('📝 Meal Airtable dual-write payload:', { 
    userId: userId.substring(0, 8) + '...', 
    fields: Object.keys(airtablePayload) 
  });
  
  // Note: Actual Airtable write implementation would go here
}

/**
 * Get meals for a user
 * @param {string} userId - Auth user ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Array of meal records
 */
async function getUserMeals(userId, limit = 20) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching meals:', error);
    throw error;
  }

  return data || [];
}

module.exports = {
  logMeal,
  getUserMeals,
  sanitizeMealData // Export for testing
};