/**
 * Auto-log validation schemas for different data types
 */

const { z } = require('zod');

// Base auto-log schema
const baseAutoLogSchema = z.object({
  kind: z.enum(['meal', 'workout', 'sleep', 'mood']),
  data: z.record(z.any()),
  ts: z.string().datetime().optional(),
}).strict();

// Meal data schema
const mealDataSchema = z.object({
  description: z.string().min(1).max(1000),
  macros: z.object({
    protein: z.number().min(0).optional(),
    carbs: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
    fiber: z.number().min(0).optional(),
  }).optional(),
  calories: z.number().min(0).max(10000).optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().date().optional(),
}).strict();

// Workout data schema
const workoutDataSchema = z.object({
  type: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  duration_minutes: z.number().int().min(1).max(600).optional(),
  calories: z.number().min(0).max(5000).optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().date().optional(),
}).strict();

// Sleep data schema
const sleepDataSchema = z.object({
  duration_minutes: z.number().int().min(0).max(1440).optional(),
  quality: z.number().int().min(1).max(10).optional(),
  bedtime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  wake_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  notes: z.string().max(1000).optional(),
}).strict();

// Mood data schema
const moodDataSchema = z.object({
  mood_score: z.number().int().min(1).max(10).optional(),
  stress_level: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().date().optional(),
}).strict();

// Data schema mapping
const dataSchemas = {
  meal: mealDataSchema,
  workout: workoutDataSchema,
  sleep: sleepDataSchema,
  mood: moodDataSchema,
};

/**
 * Validate auto-log data
 */
function validateAutoLog(data) {
  try {
    // First validate the base structure
    const baseResult = baseAutoLogSchema.parse(data);
    
    // Then validate the specific data based on kind
    const dataSchema = dataSchemas[baseResult.kind];
    if (!dataSchema) {
      throw new Error(`Unknown auto-log kind: ${baseResult.kind}`);
    }
    
    const validatedData = dataSchema.parse(baseResult.data);
    
    return {
      success: true,
      data: {
        ...baseResult,
        data: validatedData,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors || [{ message: error.message }],
    };
  }
}

/**
 * Validation middleware for auto-log
 */
function validateAutoLogMiddleware(req, res, next) {
  const result = validateAutoLog(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      ok: false,
      code: 'ERR_VALIDATION_FAILED',
      message: 'Invalid auto-log data',
      details: result.error,
    });
  }
  
  req.validatedData = result.data;
  next();
}

module.exports = {
  baseAutoLogSchema,
  mealDataSchema,
  workoutDataSchema,
  sleepDataSchema,
  moodDataSchema,
  validateAutoLog,
  validateAutoLogMiddleware,
};