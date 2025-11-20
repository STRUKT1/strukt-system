/**
 * Workout validation schemas
 * Validates workout logging data including exercises, duration, and metadata
 */

const { z } = require('zod');

// Exercise schema - represents a single exercise in a workout
const exerciseSchema = z.object({
  name: z.string().min(1).max(100, 'Exercise name must be 100 characters or less'),
  exercise_name: z.string().min(1).max(100).optional(), // Support both 'name' and 'exercise_name'
  sets: z.number().int().min(1).max(100).optional(),
  reps: z.number().int().min(1).max(1000).optional(),
  weight: z.number().min(0).max(10000).optional(),
  weight_unit: z.enum(['lbs', 'kg']).default('lbs').optional(),
  duration_seconds: z.number().int().min(0).optional(), // For timed exercises
  distance: z.number().min(0).optional(), // For cardio
  distance_unit: z.enum(['miles', 'km', 'meters']).optional(),
  notes: z.string().max(500).optional(),
}).passthrough(); // Allow additional fields for flexibility

// Main workout schema
const workoutSchema = z.object({
  workout_date: z.string().datetime().optional(),
  date: z.string().date().optional(), // Support simple date format too
  duration_minutes: z.number().int().min(1).max(600).optional(),
  workout_type: z.enum(['strength', 'cardio', 'flexibility', 'mixed', 'sports', 'other']).optional(),
  type: z.string().max(255).optional(), // Support legacy 'type' field
  exercises: z.array(exerciseSchema).min(1, 'At least one exercise is required'),
  description: z.string().max(1000).optional(), // Support legacy description
  notes: z.string().max(1000).optional(),
  perceived_exertion: z.number().int().min(1).max(10).optional(),
  calories: z.number().min(0).max(10000).optional(),
  distance_km: z.number().min(0).max(1000).optional(), // For cardio workouts
}).passthrough(); // Allow additional fields for flexibility

// Workout update schema (all fields optional except exercises if provided)
const workoutUpdateSchema = z.object({
  workout_date: z.string().datetime().optional(),
  date: z.string().date().optional(),
  duration_minutes: z.number().int().min(1).max(600).optional(),
  workout_type: z.enum(['strength', 'cardio', 'flexibility', 'mixed', 'sports', 'other']).optional(),
  type: z.string().max(255).optional(),
  exercises: z.array(exerciseSchema).optional(),
  description: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
  perceived_exertion: z.number().int().min(1).max(10).optional(),
  calories: z.number().min(0).max(10000).optional(),
  distance_km: z.number().min(0).max(1000).optional(),
}).passthrough();

/**
 * Validate workout data
 * @param {Object} data - Workout data to validate
 * @returns {Object} { success: boolean, data?: Object, error?: Object }
 */
function validateWorkout(data) {
  try {
    const result = workoutSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Invalid workout data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
    };
  }
}

/**
 * Validate workout update data
 * @param {Object} data - Workout data to validate
 * @returns {Object} { success: boolean, data?: Object, error?: Object }
 */
function validateWorkoutUpdate(data) {
  try {
    const result = workoutUpdateSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Invalid workout data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
    };
  }
}

module.exports = {
  validateWorkout,
  validateWorkoutUpdate,
  workoutSchema,
  exerciseSchema,
};
