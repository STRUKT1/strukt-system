/**
 * Meals Service (Skeleton)
 * 
 * Handles meal logging operations in Supabase with optional dual-write to Airtable.
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');

const TABLE = 'meals';

/**
 * Log a meal entry
 * @param {string} userId - Auth user ID
 * @param {Object} mealData - Meal data
 * @returns {Promise<Object>} Created meal record
 */
async function logMeal(userId, mealData) {
  const payload = {
    user_id: userId,
    ...mealData,
    date: mealData.date || new Date().toISOString().split('T')[0] // Default to today
  };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error logging meal:', error);
    throw error;
  }

  return data;
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
  getUserMeals
};