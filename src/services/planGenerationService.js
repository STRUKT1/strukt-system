/**
 * Plan Generation Service
 * 
 * Production-grade service for generating AI-powered training/nutrition plans.
 * Implements robust error handling, validation, and fallback mechanisms.
 * 
 * Features:
 * - Null guards for all profile fields
 * - AI plan structure validation
 * - Fallback plan generation on AI failure
 * - Save confirmation and logging
 * - Consistent wellness context injection
 * - Optional preview mode for dev/testing
 */

const { getAIReply, getFallbackResponse } = require('../../services/openaiService');
const { getUserProfile } = require('./userProfiles');
const { savePlan, getLatestPlan } = require('./planservice');
const { supabaseAdmin } = require('../lib/supabaseServer');

// Environment flags
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ENABLE_PREVIEW_MODE = !IS_PRODUCTION && process.env.ENABLE_PLAN_PREVIEW === 'true';

/**
 * Validate that AI-generated plan has required structure
 * @param {Object} plan - Plan object from AI
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validatePlanStructure(plan) {
  const errors = [];
  
  if (!plan || typeof plan !== 'object') {
    errors.push('Plan must be an object');
    return { isValid: false, errors };
  }

  // Check for required top-level keys
  const requiredKeys = ['training', 'nutrition', 'recovery', 'coaching'];
  const missingKeys = requiredKeys.filter(key => !plan[key]);
  
  if (missingKeys.length > 0) {
    errors.push(`Missing required sections: ${missingKeys.join(', ')}`);
  }

  // Validate each section has content
  for (const key of requiredKeys) {
    if (plan[key]) {
      if (typeof plan[key] !== 'object' && typeof plan[key] !== 'string') {
        errors.push(`${key} section must be an object or string`);
      } else if (typeof plan[key] === 'object' && Object.keys(plan[key]).length === 0) {
        errors.push(`${key} section is empty`);
      } else if (typeof plan[key] === 'string' && plan[key].trim().length === 0) {
        errors.push(`${key} section is empty`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate a static fallback plan when AI fails
 * @param {Object} profile - User profile
 * @returns {Object} Fallback plan structure
 */
function generateFallbackPlan(profile) {
  const goal = profile?.primary_goal || 'general fitness';
  const experienceLevel = profile?.experience_level || 'beginner';
  
  return {
    training: {
      overview: `Personalized ${experienceLevel} training plan for ${goal}`,
      schedule: {
        frequency: profile?.days_per_week || 3,
        duration: profile?.session_minutes || 45,
        location: profile?.workout_location || 'home'
      },
      workouts: [
        {
          day: 'Monday',
          type: 'Full Body Strength',
          exercises: [
            'Warm-up: 5-10 minutes light cardio',
            'Bodyweight squats: 3 sets of 10-12 reps',
            'Push-ups (modified if needed): 3 sets of 8-10 reps',
            'Plank: 3 sets of 20-30 seconds',
            'Cool-down: 5 minutes stretching'
          ]
        },
        {
          day: 'Wednesday',
          type: 'Cardio & Core',
          exercises: [
            'Warm-up: 5 minutes dynamic stretching',
            'Brisk walking or jogging: 20-30 minutes',
            'Core circuit: 3 rounds',
            'Cool-down: 5 minutes stretching'
          ]
        },
        {
          day: 'Friday',
          type: 'Active Recovery',
          exercises: [
            'Gentle yoga or stretching: 20-30 minutes',
            'Walking: 20 minutes',
            'Mobility work'
          ]
        }
      ]
    },
    nutrition: {
      overview: 'Balanced nutrition plan aligned with your goals',
      daily_targets: {
        calories: profile?.daily_kcal_target || 2000,
        protein_g: profile?.macro_targets?.protein_g || 100,
        carbs_g: profile?.macro_targets?.carbs_g || 200,
        fat_g: profile?.macro_targets?.fat_g || 60
      },
      guidelines: [
        'Eat whole, minimally processed foods',
        'Stay hydrated with 8-10 glasses of water daily',
        'Include protein with each meal',
        'Eat plenty of vegetables and fruits',
        'Plan and prep meals in advance when possible'
      ],
      sample_meals: {
        breakfast: 'Oatmeal with berries and protein powder, or eggs with whole grain toast',
        lunch: 'Grilled chicken or tofu with quinoa and roasted vegetables',
        dinner: 'Baked fish or lean meat with sweet potato and salad',
        snacks: 'Greek yogurt, nuts, fruit, or protein shake'
      }
    },
    recovery: {
      overview: 'Recovery strategies for optimal progress',
      sleep: {
        target_hours: profile?.avg_sleep_hours || 7.5,
        bedtime_routine: 'Wind down 30-60 minutes before bed, avoid screens',
        quality_tips: [
          'Keep bedroom cool and dark',
          'Maintain consistent sleep schedule',
          'Avoid caffeine after 2pm'
        ]
      },
      active_recovery: [
        'Light walking on rest days',
        'Gentle stretching or yoga',
        'Foam rolling or self-massage',
        'Stay hydrated throughout the day'
      ],
      stress_management: [
        'Practice deep breathing exercises',
        'Take short breaks throughout the day',
        'Spend time in nature',
        'Connect with supportive friends/family'
      ]
    },
    coaching: {
      overview: 'Your personalized coaching guidance',
      tone: profile?.coaching_tone || 'supportive',
      weekly_check_ins: 'Track progress and adjust as needed',
      key_focus_areas: [
        'Build sustainable habits',
        'Progress at your own pace',
        'Listen to your body',
        'Celebrate small wins',
        'Ask for help when needed'
      ],
      motivation: profile?.success_definition || 'Stay consistent and trust the process. Progress takes time, and every small step counts toward your goals.'
    }
  };
}

/**
 * Safely build wellness context from user data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Wellness context object
 */
async function buildWellnessContext(userId) {
  try {
    // Fetch recent health data from multiple tables
    const [workouts, meals, sleepLogs, moodLogs] = await Promise.allSettled([
      supabaseAdmin
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(7),
      
      supabaseAdmin
        .from('meals')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(7),
      
      supabaseAdmin
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(7),
      
      supabaseAdmin
        .from('mood_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(7)
    ]);

    const context = {
      recent_activity: {
        workouts: workouts.status === 'fulfilled' ? (workouts.value?.data || []) : [],
        meals: meals.status === 'fulfilled' ? (meals.value?.data || []) : [],
        sleep: sleepLogs.status === 'fulfilled' ? (sleepLogs.value?.data || []) : [],
        mood: moodLogs.status === 'fulfilled' ? (moodLogs.value?.data || []) : []
      },
      summary: {
        total_workouts: workouts.status === 'fulfilled' ? (workouts.value?.data?.length || 0) : 0,
        total_meals: meals.status === 'fulfilled' ? (meals.value?.data?.length || 0) : 0,
        avg_sleep_hours: calculateAvgSleep(sleepLogs.status === 'fulfilled' ? (sleepLogs.value?.data || []) : []),
        avg_mood: calculateAvgMood(moodLogs.status === 'fulfilled' ? (moodLogs.value?.data || []) : [])
      }
    };

    return context;
  } catch (error) {
    console.warn('⚠️ Failed to build full wellness context:', error.message);
    // Return minimal context on error
    return {
      recent_activity: { workouts: [], meals: [], sleep: [], mood: [] },
      summary: { total_workouts: 0, total_meals: 0, avg_sleep_hours: 0, avg_mood: 0 }
    };
  }
}

/**
 * Helper: Calculate average sleep hours
 */
function calculateAvgSleep(sleepLogs) {
  if (!sleepLogs || sleepLogs.length === 0) return 0;
  
  const totalMinutes = sleepLogs.reduce((sum, log) => {
    return sum + (log?.duration_minutes || 0);
  }, 0);
  
  return totalMinutes > 0 ? Math.round((totalMinutes / sleepLogs.length / 60) * 10) / 10 : 0;
}

/**
 * Helper: Calculate average mood score
 */
function calculateAvgMood(moodLogs) {
  if (!moodLogs || moodLogs.length === 0) return 0;
  
  const totalScore = moodLogs.reduce((sum, log) => {
    return sum + (log?.mood_score || 0);
  }, 0);
  
  return totalScore > 0 ? Math.round((totalScore / moodLogs.length) * 10) / 10 : 0;
}

/**
 * Build AI prompt for plan generation
 * @param {Object} profile - User profile
 * @param {Object} wellnessContext - Recent wellness data
 * @returns {string} Formatted prompt
 */
function buildPlanPrompt(profile, wellnessContext) {
  // Null-safe field access with optional chaining and nullish coalescing
  const fullName = profile?.full_name || 'User';
  const primaryGoal = profile?.primary_goal || 'general wellness';
  const experienceLevel = profile?.experience_level || 'beginner';
  const injuries = profile?.injuries?.join(', ') || 'none reported';
  const conditions = profile?.conditions?.join(', ') || 'none reported';
  const dietPattern = profile?.diet_pattern || 'no specific pattern';
  const allergies = profile?.allergies?.join(', ') || 'none reported';
  const coachingTone = profile?.coaching_tone || 'supportive';
  const daysPerWeek = profile?.days_per_week || 3;
  const sessionMinutes = profile?.session_minutes || 45;
  const equipmentAccess = profile?.equipment_access?.join(', ') || 'bodyweight only';
  
  // Log warning if critical fields are missing
  if (!profile?.user_id) {
    console.warn('⚠️ Profile missing user_id - plan may not be saved correctly');
  }

  return `Generate a comprehensive personalized fitness and nutrition plan for ${fullName}.

PROFILE INFORMATION:
- Primary Goal: ${primaryGoal}
- Experience Level: ${experienceLevel}
- Training Frequency: ${daysPerWeek} days per week
- Session Duration: ${sessionMinutes} minutes
- Equipment Access: ${equipmentAccess}
- Coaching Tone Preference: ${coachingTone}

HEALTH CONSIDERATIONS:
- Injuries: ${injuries}
- Chronic Conditions: ${conditions}
- Dietary Pattern: ${dietPattern}
- Allergies/Intolerances: ${allergies}

RECENT ACTIVITY SUMMARY:
- Workouts logged (past 7 days): ${wellnessContext?.summary?.total_workouts || 0}
- Meals logged (past 7 days): ${wellnessContext?.summary?.total_meals || 0}
- Average sleep: ${wellnessContext?.summary?.avg_sleep_hours || 'N/A'} hours
- Average mood: ${wellnessContext?.summary?.avg_mood || 'N/A'}/10

Please generate a structured plan with the following sections:

1. TRAINING: Weekly workout schedule with specific exercises, sets, reps, and progression guidelines
2. NUTRITION: Daily calorie and macro targets, meal timing, and sample meal ideas
3. RECOVERY: Sleep recommendations, rest days, and recovery strategies
4. COACHING: Motivational guidance, habit-building tips, and check-in framework

Return the plan as a JSON object with keys: training, nutrition, recovery, coaching
Each section should be detailed and actionable.`;
}

/**
 * Parse AI response into plan structure
 * @param {string} aiResponse - Raw AI response
 * @returns {Object} Parsed plan object
 */
function parseAIResponse(aiResponse) {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonStr = aiResponse.trim();
    
    // Remove markdown code block markers
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const plan = JSON.parse(jsonStr);
    return plan;
  } catch (error) {
    console.error('❌ Failed to parse AI response as JSON:', error.message);
    throw new Error('AI response is not valid JSON');
  }
}

/**
 * Generate plan from user profile with wellness context
 * @param {string} userId - User ID
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated plan with metadata
 */
async function regenerateFromProfileWithWellness(userId, options = {}) {
  const { previewMode = false, saveResult = true } = options;

  // Validate preview mode is only used in non-production
  if (previewMode && IS_PRODUCTION) {
    throw new Error('Preview mode is not available in production');
  }

  try {
    console.log(`🔄 Generating plan for user ${userId}...`);

    // Step 1: Fetch user profile with null guards
    const profile = await getUserProfile(userId);
    if (!profile) {
      throw new Error(`User profile not found for user ${userId}`);
    }

    // Step 2: Build wellness context
    console.log('📊 Building wellness context...');
    const wellnessContext = await buildWellnessContext(userId);

    // Step 3: Build AI prompt
    const prompt = buildPlanPrompt(profile, wellnessContext);

    // Step 4: Call AI to generate plan
    let planData;
    let generationMethod = 'ai';
    let fallbackReason = null;
    let isValid = true;
    let validationErrors = null;

    try {
      console.log('🤖 Requesting AI-generated plan...');
      const aiResponse = await getAIReply([
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0.7
      });

      // Parse AI response
      planData = parseAIResponse(aiResponse);

      // Validate plan structure
      const validation = validatePlanStructure(planData);
      if (!validation.isValid) {
        console.warn('⚠️ AI plan validation failed:', validation.errors);
        throw new Error(`AI plan structure invalid: ${validation.errors.join(', ')}`);
      }

      console.log('✅ AI plan generated and validated successfully');
    } catch (aiError) {
      console.error('❌ AI plan generation failed:', aiError.message);
      console.log('🔄 Using fallback plan generation...');
      
      // Generate fallback plan
      planData = generateFallbackPlan(profile);
      generationMethod = 'fallback';
      fallbackReason = `AI generation failed: ${aiError.message}`;
      
      // Validate fallback plan too
      const validation = validatePlanStructure(planData);
      isValid = validation.isValid;
      if (!validation.isValid) {
        validationErrors = validation.errors;
        console.warn('⚠️ Even fallback plan has validation issues:', validationErrors);
      }
    }

    // Step 5: Preview mode - just log and return without saving
    if (previewMode) {
      console.log('🔍 PREVIEW MODE - Plan generated but NOT saved:');
      console.log(JSON.stringify(planData, null, 2));
      return {
        plan: planData,
        metadata: {
          userId,
          generationMethod,
          fallbackReason,
          isValid,
          validationErrors,
          previewMode: true,
          saved: false
        }
      };
    }

    // Step 6: Save plan to database (both AI and fallback plans)
    if (saveResult) {
      console.log(`💾 Saving plan to database (method: ${generationMethod})...`);
      
      const savedPlan = await savePlan(userId, planData, {
        generationMethod,
        fallbackReason,
        wellnessContext,
        profileSnapshot: profile,
        isValid,
        validationErrors
      });

      console.log(`✅ Plan saved successfully - ID: ${savedPlan.id}, Version: ${savedPlan.version}`);
      
      return {
        plan: planData,
        metadata: {
          planId: savedPlan.id,
          userId,
          version: savedPlan.version,
          generationMethod,
          fallbackReason,
          isValid,
          validationErrors,
          savedAt: savedPlan.created_at,
          saved: true
        }
      };
    }

    // Return without saving
    return {
      plan: planData,
      metadata: {
        userId,
        generationMethod,
        fallbackReason,
        isValid,
        validationErrors,
        saved: false
      }
    };

  } catch (error) {
    console.error('❌ Plan generation failed completely:', error);
    throw error;
  }
}

/**
 * Generate plan from user profile (backward compatible - now includes wellness context)
 * @param {string} userId - User ID
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated plan with metadata
 */
async function regenerateFromProfile(userId, options = {}) {
  // This method now always includes wellness context for consistency
  console.log('📝 regenerateFromProfile called - wellness context will be included');
  return regenerateFromProfileWithWellness(userId, options);
}

module.exports = {
  regenerateFromProfile,
  regenerateFromProfileWithWellness,
  validatePlanStructure,
  generateFallbackPlan,
  buildWellnessContext,
};
