/**
 * AI Service Extensions
 *
 * Provides specialized AI functions for intent recognition, entity extraction,
 * and vision analysis using OpenAI GPT-4o
 *
 * SECURITY: All user profile data is sanitized before sending to OpenAI
 * to minimize PII exposure (HIGH-005)
 */

const { OpenAI } = require('openai');
const logger = require('../lib/logger');
const { sanitizeProfileForAI } = require('../lib/piiMask');

// Initialize OpenAI client with error handling
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      project: process.env.OPENAI_PROJECT_ID || undefined,
    });
  }
} catch (error) {
  logger.warn('OpenAI client initialization failed', {
    error: error.message,
    hasApiKey: !!process.env.OPENAI_API_KEY
  });
}

/**
 * Check if OpenAI is configured
 */
function checkOpenAI() {
  if (!openai) {
    throw new Error('OpenAI is not configured. Please set OPENAI_API_KEY environment variable.');
  }
}

/**
 * Recognize user intent from a natural language message
 * Determines if user wants to log activity or just chat
 * 
 * @param {string} message - User's message
 * @returns {Promise<Object>} Intent object with type and entities
 */
async function recognizeIntent(message) {
  checkOpenAI();
  
  const intentPrompt = `You are an expert NLU system for a fitness app. Analyze the user's message and determine their primary intent. Respond ONLY with a valid JSON object.
The possible intents are: "log_activity" or "chat".
If the intent is "log_activity", identify the activity type ("meal", "workout", "sleep", "mood", "supplement") and extract the relevant entities.

Example 1:
User message: "just had a protein shake and a banana for breakfast"
Your JSON response: { "intent": "log_activity", "type": "meal", "entities": { "description": "protein shake and a banana" } }

Example 2:
User message: "i slept terribly, only 5 hours"
Your JSON response: { "intent": "log_activity", "type": "sleep", "entities": { "duration_hours": 5, "quality": "poor" } }

Example 3:
User message: "what should i do for my workout today?"
Your JSON response: { "intent": "chat" }

Example 4:
User message: "did 30 min run, burned about 300 calories"
Your JSON response: { "intent": "log_activity", "type": "workout", "entities": { "type": "running", "duration_minutes": 30, "calories": 300 } }

Example 5:
User message: "feeling really down today, stress level is high"
Your JSON response: { "intent": "log_activity", "type": "mood", "entities": { "mood_score": 3, "stress_level": 8, "notes": "feeling really down" } }

User message: "${message}"
Your JSON response:`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert NLU system. Always respond with valid JSON only.' },
        { role: 'user', content: intentPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent parsing
      max_tokens: 200,
    });

    const responseText = completion.choices[0].message.content.trim();
    
    // Parse the JSON response
    const result = JSON.parse(responseText);

    return result;
  } catch (error) {
    logger.error('Intent recognition error', {
      error: error.message,
      messageLength: message?.length
    });
    // Default to chat if parsing fails
    return { intent: 'chat' };
  }
}

/**
 * Analyze workout screenshot and extract metrics
 * 
 * @param {string} imageUrl - URL or base64 string of the image
 * @returns {Promise<Object>} Extracted workout data
 */
async function analyzeWorkoutImage(imageUrl) {
  checkOpenAI();
  
  const prompt = `You are a fitness data extraction expert. Analyze this screenshot from a fitness tracker (like Apple Watch, Strava, Whoop). Extract the key metrics: workout type, duration in minutes, distance in km (if available), and total calories burned. Respond ONLY with a valid JSON object with the keys "type", "duration_minutes", "distance_km", and "calories". If a metric is not present, omit the key.`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const responseText = completion.choices[0].message.content.trim();
    const result = JSON.parse(responseText);

    return result;
  } catch (error) {
    logger.error('Workout image analysis error', {
      error: error.message,
      hasImageUrl: !!imageUrl
    });
    throw new Error('Failed to analyze workout image');
  }
}

/**
 * Analyze meal photo and extract nutritional data
 * 
 * @param {string} imageUrl - URL or base64 string of the image
 * @returns {Promise<Object>} Extracted meal data
 */
async function analyzeMealImage(imageUrl) {
  checkOpenAI();
  
  const prompt = `You are an expert nutritionist. Analyze this photo of food. Provide your best-effort estimation for the meal's name, total calories, and macronutrients (protein, carbs, fat in grams). Respond ONLY with a valid JSON object with the keys "description", "calories", "macros": { "protein", "carbs", "fat" }.`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const responseText = completion.choices[0].message.content.trim();
    const result = JSON.parse(responseText);

    return result;
  } catch (error) {
    logger.error('Meal image analysis error', {
      error: error.message,
      hasImageUrl: !!imageUrl
    });
    throw new Error('Failed to analyze meal image');
  }
}

/**
 * Generate personalized workout and nutrition plans based on user profile
 *
 * @param {Object} userProfile - Complete user profile
 * @returns {Promise<Object>} Generated plans
 */
async function generateInitialPlans(userProfile) {
  checkOpenAI();

  // SECURITY: Sanitize profile to remove PII (email, full name, etc.)
  const profile = sanitizeProfileForAI(userProfile);

  const prompt = `You are an expert fitness and nutrition coach. Based on the user's profile, generate initial workout and nutrition plans.

User Profile:
- Name: ${profile.firstName || 'there'}
- Goals: ${profile.primary_goal || 'general fitness'}
- WHY: ${profile.why_statement || 'Not provided'}
- Target Event: ${profile.target_event || 'None'} ${profile.target_event_date ? `on ${profile.target_event_date}` : ''}
- Fitness Experience: ${profile.fitness_experience || profile.experience_level || 'beginner'}
- Days per week: ${profile.days_per_week || 3}
- Session minutes: ${profile.session_minutes || 30}
- Equipment: ${profile.equipment_access || 'bodyweight'}
- Dietary restrictions: ${profile.dietary_restrictions || 'none'}
- Medical conditions: ${profile.conditions || 'none'}
- Pregnant/Breastfeeding: ${profile.is_pregnant_or_breastfeeding ? 'Yes' : 'No'}
- Recovering from surgery: ${profile.is_recovering_from_surgery ? 'Yes' : 'No'}

Respond ONLY with a valid JSON object:
{
  "workout_plan": {
    "name": "Plan name",
    "description": "Brief description",
    "schedule": ["Day 1: ...", "Day 2: ...", ...],
    "weekly_focus": "Focus for the week"
  },
  "nutrition_plan": {
    "daily_calories": number,
    "macros": { "protein": number, "carbs": number, "fat": number },
    "meal_suggestions": ["Breakfast: ...", "Lunch: ...", "Dinner: ..."],
    "guidance": "Key nutritional guidance"
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert fitness and nutrition coach. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0].message.content.trim();
    const result = JSON.parse(responseText);

    return result;
  } catch (error) {
    logger.error('Plan generation error', {
      error: error.message,
      hasUserProfile: !!userProfile,
      primaryGoal: userProfile?.primary_goal
    });
    throw new Error('Failed to generate plans');
  }
}

/**
 * Generate daily focus point based on user profile and recent activity
 *
 * @param {Object} userProfile - User profile
 * @param {Object} recentActivity - Recent sleep, mood, etc.
 * @returns {Promise<string>} Daily focus text
 */
async function generateDailyFocus(userProfile, recentActivity = {}) {
  checkOpenAI();

  // SECURITY: Sanitize profile to remove PII (email, full name, etc.)
  const profile = sanitizeProfileForAI(userProfile);

  const prompt = `Based on the user's profile and their recent activity, provide a single, encouraging, and actionable focus point for their day. Keep it concise (2-3 sentences).

User Profile:
- Name: ${profile.firstName || 'there'}
- Goals: ${profile.primary_goal || 'general fitness'}
- WHY: ${profile.why_statement || 'Not provided'}
- Coaching Persona: ${profile.coaching_persona || 'strategist'}

Recent Activity:
- Sleep: ${recentActivity.sleep || 'No recent data'}
- Mood: ${recentActivity.mood || 'No recent data'}
- Last workout: ${recentActivity.lastWorkout || 'No recent data'}

Provide a personalized, motivating focus point:`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: `You are a ${profile.coaching_persona || 'strategic'} fitness coach.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    const focusText = completion.choices[0].message.content.trim();
    return focusText;
  } catch (error) {
    logger.error('Daily focus generation error', {
      error: error.message,
      hasUserProfile: !!userProfile,
      hasRecentActivity: !!recentActivity
    });
    throw new Error('Failed to generate daily focus');
  }
}

/**
 * Generate weekly review based on user's logs
 *
 * @param {Object} userProfile - User profile
 * @param {Object} weeklyLogs - Logs from the past 7 days
 * @returns {Promise<string>} Weekly review text
 */
async function generateWeeklyReview(userProfile, weeklyLogs = {}) {
  checkOpenAI();

  // SECURITY: Sanitize profile to remove PII (email, full name, etc.)
  const profile = sanitizeProfileForAI(userProfile);

  const prompt = `Analyze the user's data from the past 7 days and generate a summary, connecting actions to outcomes.

User Profile:
- Name: ${profile.firstName || 'there'}
- Goals: ${profile.primary_goal || 'general fitness'}
- WHY: ${profile.why_statement || 'Not provided'}

Weekly Activity:
- Workouts: ${weeklyLogs.workouts?.length || 0} sessions
- Meals logged: ${weeklyLogs.meals?.length || 0}
- Avg sleep quality: ${weeklyLogs.avgSleepQuality || 'Not tracked'}
- Mood trend: ${weeklyLogs.moodTrend || 'Not tracked'}

Provide an insightful weekly review (3-5 sentences) that:
1. Highlights patterns (e.g., "Your mood was highest on days you worked out")
2. Celebrates wins
3. Provides actionable guidance for next week`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: `You are a ${profile.coaching_persona || 'strategic'} fitness coach.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 400,
    });

    const reviewText = completion.choices[0].message.content.trim();
    return reviewText;
  } catch (error) {
    logger.error('Weekly review generation error', {
      error: error.message,
      hasUserProfile: !!userProfile,
      hasWeeklyLogs: !!weeklyLogs,
      workoutCount: weeklyLogs?.workouts?.length || 0
    });
    throw new Error('Failed to generate weekly review');
  }
}

module.exports = {
  recognizeIntent,
  analyzeWorkoutImage,
  analyzeMealImage,
  generateInitialPlans,
  generateDailyFocus,
  generateWeeklyReview,
};
