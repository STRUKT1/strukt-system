/**
 * Photo Analysis Service
 * Uses GPT-4 Vision to analyze workout screenshots and meal photos
 * Extracts structured data for auto-filling workout/meal logs
 */

const { OpenAI } = require('openai');
const logger = require('../lib/logger');

// Initialize OpenAI client
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      project: process.env.OPENAI_PROJECT_ID || undefined,
    });
  }
} catch (error) {
  console.warn('OpenAI client initialization failed:', error.message);
}

// System prompt for workout photo analysis
const WORKOUT_ANALYSIS_PROMPT = `You are a fitness data extraction expert analyzing screenshots from fitness tracking apps.

Carefully examine this image and extract ALL visible workout data.

Common apps: Strava, Apple Fitness, Garmin Connect, Fitbit, Oura, Whoop, Peloton, Nike Run Club, MapMyRun, etc.

Extract the following if visible:
- Exercise type (running, cycling, walking, strength training, swimming, yoga, etc.)
- Duration (in minutes - convert hours:minutes to decimal minutes)
- Distance (in km - convert miles if needed, 1 mile = 1.60934 km)
- Calories burned
- Average heart rate (bpm)
- Maximum heart rate (bpm)
- Pace (min/km or min/mile)
- Elevation gain (if visible)
- Date and time of workout
- Source app name (if identifiable)

IMPORTANT RULES:
1. Only extract data that is CLEARLY VISIBLE in the image
2. Do NOT hallucinate or guess data that isn't shown
3. If a field is not visible, set it to null
4. Convert all units to metric (km, kg, etc.)
5. Format time durations as decimal minutes (e.g., 1:30:00 = 90.0)
6. Be precise with numbers - don't round unless necessary

Confidence levels:
- "high": All key data clearly visible and readable
- "medium": Most data visible but some may be partially obscured or unclear
- "low": Only partial data visible or image quality is poor

Return ONLY a valid JSON object with this structure:
{
  "confidence": "high|medium|low",
  "exercise": "string or null",
  "duration": number or null,
  "distance": number or null,
  "calories": number or null,
  "avgHeartRate": number or null,
  "maxHeartRate": number or null,
  "pace": "string or null",
  "elevationGain": number or null,
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM or null",
  "source": "string or null",
  "notes": "any additional relevant information visible"
}`;

// System prompt for meal photo analysis
const MEAL_ANALYSIS_PROMPT = `You are a nutrition expert analyzing food photos to estimate nutrition content.

Carefully examine this image and identify all foods visible.

Image types you might see:
1. Photo of a meal on a plate
2. Nutrition facts label
3. Restaurant menu item
4. Recipe screenshot
5. Packaged food

For NUTRITION LABELS: Extract exact values as shown

For MEAL PHOTOS: Estimate based on visible portion sizes
- Use standard serving sizes as reference
- Consider cooking methods (grilled, fried, steamed, etc.)
- Be realistic with portion estimates

For RECIPES: Extract ingredients and estimate total nutrition

Extract and calculate:
- All food items identified
- Portion sizes (in grams, cups, pieces, etc.)
- Calories (kcal)
- Protein (grams)
- Carbohydrates (grams)
- Fat (grams)
- Fiber (grams, if applicable)

IMPORTANT RULES:
1. For nutrition labels: Use EXACT values shown
2. For meal photos: Estimate conservatively (don't over or underestimate)
3. Consider visible cooking methods
4. Account for typical restaurant/home portion sizes
5. If uncertain, indicate with lower confidence
6. List ALL visible food items separately
7. Provide totals for the entire meal

Confidence levels:
- "high": Nutrition label with exact values OR very clear meal with standard portions
- "medium": Clear meal photo with estimatable portions
- "low": Unclear photo, unusual portions, or difficult to identify foods

Return ONLY a valid JSON object:
{
  "confidence": "high|medium|low",
  "mealType": "breakfast|lunch|dinner|snack",
  "foods": [
    {
      "name": "food name",
      "amount": "portion description",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number or null
    }
  ],
  "totals": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number or null
  },
  "notes": "any relevant information (cooking method, brand, etc.)"
}`;

/**
 * Parse JSON from GPT-4 response, handling markdown code blocks
 * @param {string} response - Raw GPT-4 response
 * @returns {Object} Parsed JSON object
 */
function parseGPTResponse(response) {
  try {
    // Try direct JSON parse first
    return JSON.parse(response);
  } catch (e) {
    // Attempt to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to find any JSON object in the response
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error('Could not parse JSON from GPT response');
  }
}

/**
 * Validate base64 image format and size
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Object} Validation result { valid: boolean, error: string }
 */
function validateImage(imageBase64) {
  // Check format
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return { valid: false, error: 'Image data is required' };
  }

  if (!imageBase64.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid image format. Must be base64 encoded with data URI scheme' };
  }

  // Check size (approximate bytes from base64)
  const base64Size = imageBase64.length * 0.75; // approximate bytes
  const maxSize = 20 * 1024 * 1024; // 20MB limit

  if (base64Size > maxSize) {
    return { valid: false, error: 'Image too large. Maximum size is 20MB' };
  }

  return { valid: true };
}

/**
 * Analyze image using GPT-4 Vision
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} prompt - System prompt for analysis
 * @param {string} userId - User ID for logging
 * @returns {Promise<Object>} Parsed response from GPT-4 Vision
 */
async function analyzeImageWithVision(imageBase64, prompt, userId) {
  if (!openai) {
    const error = new Error('OpenAI is not configured. Please set OPENAI_API_KEY environment variable.');
    logger.error('Photo analysis failed - OpenAI not configured', {
      userIdMasked: logger.maskUserId(userId),
    });
    throw error;
  }

  try {
    const startTime = Date.now();

    logger.info('Starting GPT-4 Vision analysis', {
      userIdMasked: logger.maskUserId(userId),
      imageSize: imageBase64.length,
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
                detail: 'high', // Use high detail for better accuracy
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1, // Low temperature for consistent extraction
    });

    const content = response.choices[0].message.content;
    const duration = Date.now() - startTime;

    logger.info('GPT-4 Vision analysis complete', {
      userIdMasked: logger.maskUserId(userId),
      durationMs: duration,
      tokensUsed: response.usage?.total_tokens,
    });

    // Parse the JSON response
    const parsedData = parseGPTResponse(content);
    return parsedData;
  } catch (error) {
    logger.error('GPT-4 Vision analysis failed', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
      code: error.code,
    });

    // Check for specific OpenAI errors
    if (error.code === 'rate_limit_exceeded' || error.status === 429) {
      const rateLimitError = new Error('Rate limit exceeded. Please try again in a moment.');
      rateLimitError.status = 429;
      rateLimitError.code = 'RATE_LIMIT_EXCEEDED';
      throw rateLimitError;
    }

    if (error.status === 401) {
      const authError = new Error('OpenAI API authentication failed.');
      authError.status = 500;
      authError.code = 'API_AUTH_FAILED';
      throw authError;
    }

    // Re-throw with context
    const wrappedError = new Error(`Vision analysis failed: ${error.message}`);
    wrappedError.status = error.status || 500;
    wrappedError.code = error.code || 'VISION_ANALYSIS_FAILED';
    wrappedError.cause = error;
    throw wrappedError;
  }
}

/**
 * Analyze a workout photo and extract structured data
 * @param {string} imageBase64 - Base64 encoded workout screenshot
 * @param {string} userId - User ID for logging
 * @param {string} hint - Optional hint about the image type
 * @returns {Promise<Object>} Extracted workout data
 */
async function analyzeWorkoutPhoto(imageBase64, userId, hint = null) {
  // Validate image
  const validation = validateImage(imageBase64);
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.code = 'INVALID_IMAGE';
    throw error;
  }

  logger.info('Analyzing workout photo', {
    userIdMasked: logger.maskUserId(userId),
    hint,
  });

  try {
    const extractedData = await analyzeImageWithVision(
      imageBase64,
      WORKOUT_ANALYSIS_PROMPT,
      userId
    );

    // Validate that we got meaningful data
    const hasData = extractedData.exercise ||
                    extractedData.duration ||
                    extractedData.distance ||
                    extractedData.calories;

    if (!hasData) {
      logger.info('No workout data found in image', {
        userIdMasked: logger.maskUserId(userId),
        confidence: extractedData.confidence,
      });

      return {
        confidence: 'low',
        extracted: {},
        message: "Couldn't find clear workout data. Try a different photo or manual entry.",
      };
    }

    // Generate confirmation message
    const message = generateWorkoutMessage(extractedData);

    logger.info('Workout photo analysis successful', {
      userIdMasked: logger.maskUserId(userId),
      confidence: extractedData.confidence,
      exercise: extractedData.exercise,
    });

    return {
      confidence: extractedData.confidence || 'medium',
      extracted: {
        exercise: extractedData.exercise,
        duration: extractedData.duration,
        distance: extractedData.distance,
        calories: extractedData.calories,
        avgHeartRate: extractedData.avgHeartRate,
        maxHeartRate: extractedData.maxHeartRate,
        pace: extractedData.pace,
        elevationGain: extractedData.elevationGain,
        date: extractedData.date,
        time: extractedData.time,
        source: extractedData.source,
        notes: extractedData.notes,
      },
      message,
    };
  } catch (error) {
    logger.error('Workout photo analysis failed', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
    });
    throw error;
  }
}

/**
 * Analyze a meal photo and extract nutrition data
 * @param {string} imageBase64 - Base64 encoded meal photo
 * @param {string} userId - User ID for logging
 * @param {string} mealType - Optional meal type hint (breakfast, lunch, dinner, snack)
 * @returns {Promise<Object>} Extracted meal data
 */
async function analyzeMealPhoto(imageBase64, userId, mealType = null) {
  // Validate image
  const validation = validateImage(imageBase64);
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.code = 'INVALID_IMAGE';
    throw error;
  }

  logger.info('Analyzing meal photo', {
    userIdMasked: logger.maskUserId(userId),
    mealType,
  });

  try {
    // Add meal type hint to prompt if provided
    let prompt = MEAL_ANALYSIS_PROMPT;
    if (mealType) {
      prompt += `\n\nHint: User indicated this is a ${mealType}.`;
    }

    const extractedData = await analyzeImageWithVision(
      imageBase64,
      prompt,
      userId
    );

    // Validate that we got food data
    if (!extractedData.foods || extractedData.foods.length === 0) {
      logger.info('No food data found in image', {
        userIdMasked: logger.maskUserId(userId),
        confidence: extractedData.confidence,
      });

      return {
        confidence: 'low',
        mealType: mealType || 'snack',
        foods: [],
        totals: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
        },
        message: "Couldn't find clear food items. Try a different photo or manual entry.",
      };
    }

    // Generate confirmation message
    const message = generateMealMessage(extractedData);

    logger.info('Meal photo analysis successful', {
      userIdMasked: logger.maskUserId(userId),
      confidence: extractedData.confidence,
      foodCount: extractedData.foods?.length || 0,
      totalCalories: extractedData.totals?.calories,
    });

    return {
      confidence: extractedData.confidence || 'medium',
      mealType: extractedData.mealType || mealType || 'snack',
      foods: extractedData.foods,
      totals: extractedData.totals,
      notes: extractedData.notes,
      message,
    };
  } catch (error) {
    logger.error('Meal photo analysis failed', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
    });
    throw error;
  }
}

/**
 * Generate confirmation message for workout analysis
 * @param {Object} data - Extracted workout data
 * @returns {string} Confirmation message
 */
function generateWorkoutMessage(data) {
  const parts = [];

  if (data.exercise) {
    parts.push(`Found ${data.exercise.toLowerCase()} workout!`);
  }

  if (data.distance && data.duration) {
    const formattedDuration = formatDuration(data.duration);
    parts.push(`${data.distance}km in ${formattedDuration}`);
  } else if (data.duration) {
    const formattedDuration = formatDuration(data.duration);
    parts.push(`${formattedDuration}`);
  } else if (data.distance) {
    parts.push(`${data.distance}km`);
  }

  if (data.calories) {
    parts.push(`${data.calories} cal burned`);
  }

  let message = parts.join('. ') + '.';

  // Add confidence note
  if (data.confidence === 'low') {
    message += ' Please review and adjust if needed.';
  } else {
    message += ' Ready to log?';
  }

  return message;
}

/**
 * Generate confirmation message for meal analysis
 * @param {Object} data - Extracted meal data
 * @returns {string} Confirmation message
 */
function generateMealMessage(data) {
  const foodCount = data.foods?.length || 0;
  const calories = data.totals?.calories || 0;
  const protein = data.totals?.protein || 0;

  let message = `Found ${foodCount} food${foodCount !== 1 ? 's' : ''}!`;

  if (calories > 0) {
    message += ` ${calories} cal`;
  }

  if (protein > 0) {
    message += `, ${protein}g protein`;
  }

  message += '.';

  // Add confidence note
  if (data.confidence === 'low') {
    message += ' Please review portions carefully.';
  } else if (data.confidence === 'medium') {
    message += ' Some portions were estimated - please review.';
  } else {
    message += ' Ready to log?';
  }

  return message;
}

/**
 * Format duration in minutes to human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
function formatDuration(minutes) {
  if (!minutes) return '0min';

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  return `${mins}min`;
}

module.exports = {
  analyzeWorkoutPhoto,
  analyzeMealPhoto,
};
