/**
 * Profile validation schemas
 */

const { z } = require('zod');

// Valid profile fields based on Supabase schema
const profileSchema = z.object({
  full_name: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
  timezone: z.string().max(100).optional(),
  
  // Identity
  gender_identity: z.enum(['woman', 'man', 'non-binary', 'self-describe', 'prefer-not']).optional(),
  identity_other: z.string().max(255).optional(),
  pronouns: z.enum(['she/her', 'he/him', 'they/them', 'custom']).optional(),
  
  // Culture & Faith
  cultural_practices: z.array(z.string()).optional(),
  faith_diet_rules: z.array(z.string()).optional(),
  cultural_notes: z.string().max(1000).optional(),
  
  // Lifestyle
  obstacles: z.array(z.string()).optional(),
  work_pattern: z.string().max(255).optional(),
  support_system: z.string().max(500).optional(),
  lifestyle_notes: z.string().max(1000).optional(),
  
  // Medical
  injuries: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  emergency_ack: z.boolean().optional(),
  
  // Goals
  primary_goal: z.string().max(255).optional(),
  secondary_goals: z.array(z.string()).optional(),
  target_event: z.string().max(255).optional(),
  target_event_date: z.string().date().optional(),
  
  // Schedule
  days_per_week: z.number().int().min(1).max(7).optional(),
  session_minutes: z.number().int().min(1).max(300).optional(),
  equipment_access: z.array(z.string()).optional(),
  workout_location: z.string().max(255).optional(),
  
  // Preferences
  workout_style: z.array(z.string()).optional(),
  fitness_experience: z.string().max(255).optional(),
  intensity_preference: z.string().max(100).optional(),
  motivation_style: z.string().max(255).optional(),
  
  // Nutrition
  dietary_restrictions: z.array(z.string()).optional(),
  food_allergies: z.array(z.string()).optional(),
  nutrition_goals: z.array(z.string()).optional(),
  cooking_frequency: z.string().max(100).optional(),
  meal_prep_time: z.number().int().min(0).max(1440).optional(),
  
  // Health metrics
  current_weight: z.number().positive().optional(),
  target_weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  body_fat_percentage: z.number().min(0).max(100).optional(),
  
  // Consent and completion
  beta_consent: z.boolean().optional(),
  data_processing_consent: z.boolean().optional(),
  onboarding_completed: z.boolean().optional(),
}).strict(); // Reject unknown fields

/**
 * Validate and sanitize profile data
 */
function validateProfile(data) {
  try {
    return {
      success: true,
      data: profileSchema.parse(data),
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors,
    };
  }
}

/**
 * Validation middleware for profile updates
 */
function validateProfileMiddleware(req, res, next) {
  const result = validateProfile(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      ok: false,
      code: 'ERR_VALIDATION_FAILED',
      message: 'Invalid profile data',
      details: result.error,
    });
  }
  
  req.validatedData = result.data;
  next();
}

module.exports = {
  profileSchema,
  validateProfile,
  validateProfileMiddleware,
};