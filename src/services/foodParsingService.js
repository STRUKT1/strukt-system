/**
 * Food Parsing Service
 * Uses GPT-4 function calling to parse natural language food descriptions
 * into structured meal data with food items and portions.
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

// System prompt for GPT-4 food parsing
const FOOD_PARSING_SYSTEM_PROMPT = `You are a nutrition expert helping users log meals quickly via voice.
Parse the user's natural language description into structured meal data.

Rules:
1. Identify meal type (breakfast, lunch, dinner, snack) from context or time of day
2. Extract all food items mentioned
3. Estimate reasonable portions if not specified (e.g., "chicken" = "150g chicken breast")
4. Use common portion sizes (cups, grams, pieces, medium/large/small)
5. Mark portions as estimated: true if you're guessing
6. Default to whole foods (e.g., "chicken" = "chicken breast, grilled" not fried)
7. Be generous but realistic with portions
8. If unclear, use medium/average portions
9. Confidence: high = clear items and portions, medium = some estimation, low = very unclear

Examples:
- "I had eggs and toast" → breakfast, [{name: "eggs", amount: "2 large eggs", estimated: true}, {name: "whole wheat toast", amount: "2 slices", estimated: true}]
- "Ate 200g salmon with quinoa for dinner" → dinner, [{name: "salmon", amount: "200g", estimated: false}, {name: "quinoa", amount: "150g cooked", estimated: true}]
- "Just had a protein shake" → snack, [{name: "protein shake", amount: "1 scoop (30g)", estimated: true}]
- "Chicken and rice" → lunch, [{name: "chicken breast, grilled", amount: "150g", estimated: true}, {name: "white rice, cooked", amount: "200g", estimated: true}]

Current time context will help you determine meal type if not explicitly stated.`;

// GPT-4 function schema for meal logging
const LOG_MEAL_FUNCTION = {
  name: 'log_meal',
  description: 'Log a meal with food items and their portions',
  parameters: {
    type: 'object',
    properties: {
      meal_type: {
        type: 'string',
        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        description: 'Type of meal',
      },
      foods: {
        type: 'array',
        description: 'Array of food items in the meal',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Food item name (be specific: e.g., "chicken breast, grilled" not just "chicken")',
            },
            amount: {
              type: 'string',
              description: 'Portion size (e.g., "150g", "1 cup", "2 large eggs", "medium banana")',
            },
            estimated: {
              type: 'boolean',
              description: 'Whether the portion size was estimated by you',
            },
          },
          required: ['name', 'amount'],
        },
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Confidence in the parsing accuracy',
      },
      notes: {
        type: 'string',
        description: 'Any clarifications or uncertainties about the parsing',
      },
    },
    required: ['meal_type', 'foods', 'confidence'],
  },
};

/**
 * Parse food from natural language text using GPT-4 function calling
 * @param {string} text - Natural language food description
 * @param {string} userId - User ID for logging
 * @param {Object} options - Additional options (timestamp, timezone)
 * @returns {Promise<Object>} Parsed meal data
 */
async function parseFoodFromText(text, userId, options = {}) {
  // Check if OpenAI is configured
  if (!openai) {
    const error = new Error('OpenAI is not configured. Please set OPENAI_API_KEY environment variable.');
    logger.error('Food parsing failed - OpenAI not configured', {
      userIdMasked: logger.maskUserId(userId),
    });
    throw error;
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Valid text description is required for food parsing');
  }

  const { timestamp, timezone = 'UTC' } = options;

  try {
    logger.info('Starting food parsing with GPT-4', {
      userIdMasked: logger.maskUserId(userId),
      textLength: text.length,
      timestamp,
    });

    // Add time context to help with meal type inference
    const timeContext = timestamp
      ? `\n\nContext: The user is logging this meal at ${new Date(timestamp).toLocaleString('en-US', { timeZone: timezone })}. Use this to infer meal type if not explicitly stated.`
      : '';

    const userMessage = `${text}${timeContext}`;

    // Call GPT-4 with function calling
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: FOOD_PARSING_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      functions: [LOG_MEAL_FUNCTION],
      function_call: { name: 'log_meal' },
      temperature: 0.3, // Lower temperature for more consistent parsing
    });

    const response = completion.choices[0];

    // Check if function was called
    if (!response.message.function_call) {
      logger.warn('GPT-4 did not call log_meal function', {
        userIdMasked: logger.maskUserId(userId),
        response: response.message.content,
      });
      throw new Error('Failed to parse food from text - no function call');
    }

    // Parse function arguments
    const functionArgs = JSON.parse(response.message.function_call.arguments);

    logger.info('Food parsing successful', {
      userIdMasked: logger.maskUserId(userId),
      mealType: functionArgs.meal_type,
      foodCount: functionArgs.foods?.length || 0,
      confidence: functionArgs.confidence,
    });

    return {
      meal_type: functionArgs.meal_type,
      foods: functionArgs.foods || [],
      confidence: functionArgs.confidence || 'medium',
      notes: functionArgs.notes || null,
      transcription: text,
    };
  } catch (error) {
    logger.error('Food parsing failed', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
      textPreview: text.substring(0, 100),
    });

    // Check for specific OpenAI errors
    if (error.response?.status === 429) {
      const rateLimitError = new Error('Rate limit exceeded. Please try again in a moment.');
      rateLimitError.status = 429;
      throw rateLimitError;
    }

    if (error.response?.status === 401) {
      const authError = new Error('OpenAI API authentication failed. Please check API key.');
      authError.status = 500;
      throw authError;
    }

    // Re-throw with more context
    const wrappedError = new Error(`Failed to parse food: ${error.message}`);
    wrappedError.status = error.status || 500;
    wrappedError.cause = error;
    throw wrappedError;
  }
}

/**
 * Detect if a message contains meal/food intent
 * Used by chat service to automatically trigger meal logging
 * @param {string} message - User message
 * @returns {boolean} True if message likely contains meal logging intent
 */
function detectMealIntent(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const lowerMessage = message.toLowerCase();

  // Keywords that indicate meal logging (past tense, present tense)
  const mealKeywords = [
    'had', 'ate', 'eating', 'eaten', 'just had', 'just ate',
    'for breakfast', 'for lunch', 'for dinner', 'for snack',
    'this morning', 'for my meal',
  ];

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'meal'];

  // Food-related action words
  const foodActions = [
    'consumed', 'finished', 'grabbed', 'cooked', 'prepared',
  ];

  // Check for meal keywords or food actions
  const hasMealKeyword = mealKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasFoodAction = foodActions.some(action => lowerMessage.includes(action));
  const hasMealType = mealTypes.some(type => lowerMessage.includes(type));

  // Check for common food words (partial list)
  const commonFoods = [
    'chicken', 'beef', 'fish', 'salmon', 'tuna',
    'eggs', 'egg', 'rice', 'pasta', 'bread', 'toast',
    'salad', 'vegetables', 'fruit', 'protein',
    'shake', 'smoothie', 'oats', 'oatmeal', 'yogurt',
    'cheese', 'milk', 'quinoa', 'beans', 'lentils',
  ];
  const hasCommonFood = commonFoods.some(food => lowerMessage.includes(food));

  // Intent detection logic:
  // 1. Has meal keyword (strong signal)
  // 2. Has food action + meal type
  // 3. Has meal type + common food
  if (hasMealKeyword) return true;
  if (hasFoodAction && (hasMealType || hasCommonFood)) return true;
  if (hasMealType && hasCommonFood) return true;

  // Exclude questions and future tense
  const excludePatterns = [
    'should i', 'what should', 'can i', 'going to',
    'will eat', 'will have', 'planning to',
    'what to eat', 'how many', 'how much',
    '?', // Questions
  ];

  const hasExcludePattern = excludePatterns.some(pattern => lowerMessage.includes(pattern));
  if (hasExcludePattern) return false;

  return false;
}

module.exports = {
  parseFoodFromText,
  detectMealIntent,
};
