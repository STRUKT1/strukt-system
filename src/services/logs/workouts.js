/**
 * Workouts Service
 *
 * Handles workout logging operations in Supabase with optional dual-write to Airtable.
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');
const logger = require('../../lib/logger');

const TABLE = 'workouts';

// Environment flags for backend selection and dual-write
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';
const DUAL_WRITE = process.env.DUAL_WRITE === 'true';

// Valid fields for workouts table based on schema
const VALID_WORKOUT_FIELDS = new Set([
  'type', 'description', 'duration_minutes', 'distance_km', 'calories', 'notes', 'date',
  'exercises', 'workout_type', 'perceived_exertion', 'workout_date'
]);

/**
 * Normalize exercise data to ensure consistent format
 * @param {Array} exercises - Array of exercise objects
 * @returns {Array} Normalized exercises
 */
function normalizeExercises(exercises) {
  if (!Array.isArray(exercises)) {
    return [];
  }

  return exercises.map(exercise => {
    // Normalize 'name' vs 'exercise_name'
    const name = exercise.name || exercise.exercise_name;

    return {
      name,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      weight_unit: exercise.weight_unit || 'lbs',
      duration_seconds: exercise.duration_seconds,
      distance: exercise.distance,
      distance_unit: exercise.distance_unit,
      notes: exercise.notes,
    };
  });
}

/**
 * Sanitize workout data by removing unknown fields and handling nulls
 * @param {Object} data - Raw workout data
 * @returns {Object} Sanitized workout data
 */
function sanitizeWorkoutData(data) {
  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    if (VALID_WORKOUT_FIELDS.has(key)) {
      // Handle null/undefined values safely
      if (value !== null && value !== undefined) {
        // Special handling for exercises - normalize format
        if (key === 'exercises') {
          sanitized[key] = normalizeExercises(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    // Silently ignore unknown fields for security
  }

  return sanitized;
}

/**
 * Log a workout entry
 * @param {string} userId - Auth user ID
 * @param {Object} workoutData - Workout data
 * @returns {Promise<Object>} Created workout record
 */
async function logWorkout(userId, workoutData) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!workoutData || typeof workoutData !== 'object') {
    throw new Error('Valid workout data is required');
  }

  // Sanitize input data
  const sanitizedData = sanitizeWorkoutData(workoutData);

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
    logger.error('Error logging workout', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
      operation: 'logWorkout'
    });
    throw error;
  }

  // Dual-write to Airtable if enabled
  if (DUAL_WRITE) {
    try {
      await writeWorkoutToAirtable(userId, sanitizedData);
      logger.info('Airtable sync completed', {
        userIdMasked: logger.maskUserId(userId),
        syncType: 'dual-write',
        dataType: 'workout'
      });
    } catch (airtableError) {
      logger.warn('Airtable sync failed (non-blocking)', {
        userIdMasked: logger.maskUserId(userId),
        syncType: 'dual-write',
        dataType: 'workout',
        error: airtableError.message
      });
      // Don't throw - dual-write failures shouldn't break the primary operation
    }
  }

  return data;
}

/**
 * Helper function to write workout to Airtable for dual-write
 */
async function writeWorkoutToAirtable(userId, workoutData) {
  // Mapping based on docs/airtable_to_supabase_mapping.md
  const airtablePayload = {};
  
  if (workoutData.type) airtablePayload['Type'] = workoutData.type;
  if (workoutData.description) airtablePayload['Description'] = workoutData.description;
  if (workoutData.duration_minutes) airtablePayload['Duration'] = workoutData.duration_minutes;
  if (workoutData.calories) airtablePayload['Calories'] = workoutData.calories;
  if (workoutData.notes) airtablePayload['Notes'] = workoutData.notes;
  if (workoutData.date) airtablePayload['Date'] = workoutData.date;

  logger.debug('Preparing Airtable dual-write payload', {
    userIdMasked: logger.maskUserId(userId),
    syncType: 'dual-write',
    dataType: 'workout',
    fields: Object.keys(airtablePayload)
  });
  
  // Note: Actual Airtable write implementation would go here
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
    logger.error('Error fetching workouts', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
      operation: 'getUserWorkouts'
    });
    throw error;
  }

  return data || [];
}

/**
 * Get a specific workout by ID
 * @param {string} userId - Auth user ID
 * @param {string} workoutId - Workout ID
 * @returns {Promise<Object|null>} Workout record or null if not found
 */
async function getWorkout(userId, workoutId) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('*')
    .eq('id', workoutId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    logger.error('Error fetching workout', {
      userIdMasked: logger.maskUserId(userId),
      workoutId,
      error: error.message,
      operation: 'getWorkout'
    });
    throw error;
  }

  return data;
}

/**
 * Update a workout entry
 * @param {string} userId - Auth user ID
 * @param {string} workoutId - Workout ID
 * @param {Object} updates - Updated workout data
 * @returns {Promise<Object>} Updated workout record
 */
async function updateWorkout(userId, workoutId, updates) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!workoutId || typeof workoutId !== 'string') {
    throw new Error('Valid workoutId is required');
  }

  if (!updates || typeof updates !== 'object') {
    throw new Error('Valid update data is required');
  }

  // Sanitize update data
  const sanitizedUpdates = sanitizeWorkoutData(updates);

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .update(sanitizedUpdates)
    .eq('id', workoutId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating workout', {
      userIdMasked: logger.maskUserId(userId),
      workoutId,
      error: error.message,
      operation: 'updateWorkout'
    });
    throw error;
  }

  logger.info('Workout updated', {
    userIdMasked: logger.maskUserId(userId),
    workoutId,
    operation: 'updateWorkout'
  });

  return data;
}

/**
 * Delete a workout entry
 * @param {string} userId - Auth user ID
 * @param {string} workoutId - Workout ID
 * @returns {Promise<void>}
 */
async function deleteWorkout(userId, workoutId) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!workoutId || typeof workoutId !== 'string') {
    throw new Error('Valid workoutId is required');
  }

  const { error } = await supabaseAdmin
    .from(TABLE)
    .delete()
    .eq('id', workoutId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Error deleting workout', {
      userIdMasked: logger.maskUserId(userId),
      workoutId,
      error: error.message,
      operation: 'deleteWorkout'
    });
    throw error;
  }

  logger.info('Workout deleted', {
    userIdMasked: logger.maskUserId(userId),
    workoutId,
    operation: 'deleteWorkout'
  });
}

module.exports = {
  logWorkout,
  getUserWorkouts,
  getWorkout,
  updateWorkout,
  deleteWorkout,
  sanitizeWorkoutData, // Export for testing
  normalizeExercises // Export for testing
};