/**
 * Workouts Service (Skeleton)
 * 
 * Handles workout logging operations in Supabase with optional dual-write to Airtable.
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');

const TABLE = 'workouts';

/**
 * Log a workout entry
 * @param {string} userId - Auth user ID
 * @param {Object} workoutData - Workout data
 * @returns {Promise<Object>} Created workout record
 */
async function logWorkout(userId, workoutData) {
  const payload = {
    user_id: userId,
    ...workoutData,
    date: workoutData.date || new Date().toISOString().split('T')[0] // Default to today
  };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error logging workout:', error);
    throw error;
  }

  return data;
}

/**
 * Get workouts for a user
 * @param {string} userId - Auth user ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Array of workout records
 */
async function getUserWorkouts(userId, limit = 20) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching workouts:', error);
    throw error;
  }

  return data || [];
}

module.exports = {
  logWorkout,
  getUserWorkouts
};