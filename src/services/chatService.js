/**
 * Chat Service for v1 API
 * Implements "Magic Log" - conversational logging with intent recognition
 */

const { logChatInteraction } = require('./logs/chat');
const { recognizeIntent } = require('./aiExtensions');
const { getAIReply } = require('../../services/openaiService');
const { getStruktSystemPrompt } = require('../ai/struktSystem');
const { getUserProfile } = require('./userProfiles');
const { logMeal } = require('./logs/meals');
const { logWorkout } = require('./logs/workouts');
const { logSleep } = require('./logs/sleep');
const { logMood } = require('./logs/mood');
const { logSupplement } = require('./logs/supplements');
const { parseFoodFromText } = require('./foodParsingService');
const { getNutritionForFoods, calculateTotals } = require('./nutritionDatabaseService');
const { supabaseAdmin } = require('../lib/supabaseServer');
const logger = require('../lib/logger');

/**
 * Create new chat interaction with magic logging
 * Automatically detects if user wants to log activity and handles it
 */
async function createChatInteraction(userId, chatData) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  if (!chatData || typeof chatData !== 'object') {
    throw new Error('Chat data is required');
  }
  
  const userMessage = chatData.message;
  
  if (!userMessage) {
    throw new Error('Message is required');
  }
  
  try {
    // Step 1: Perform intent recognition
    const intent = await recognizeIntent(userMessage);
    
    let aiResponse = '';
    let logCreated = null;
    
    // Step 2: Handle based on intent
    if (intent.intent === 'log_activity' && intent.type && intent.entities) {
      // Step 3: Create the appropriate log
      try {
        logCreated = await createLogFromIntent(userId, intent, userMessage);

        // Step 4: Generate confirmation message
        aiResponse = generateConfirmationMessage(intent.type, logCreated);
        
        logger.info('Magic log created', {
          userIdMasked: logger.maskUserId(userId),
          logType: intent.type,
          logId: logCreated.id,
        });
      } catch (logError) {
        logger.error('Failed to create log from intent', {
          userIdMasked: logger.maskUserId(userId),
          intent: intent.type,
          error: logError.message,
        });
        // Fall back to normal chat if logging fails
        aiResponse = await generateChatReply(userId, userMessage);
      }
    } else {
      // Step 5: Normal chat flow
      aiResponse = await generateChatReply(userId, userMessage);
    }
    
    // Save the interaction
    const interaction = await logChatInteraction(userId, {
      message: userMessage,
      response: aiResponse,
      context: {
        intent: intent.intent,
        logType: intent.type || null,
        logId: logCreated?.id || null,
      }
    });
    
    return {
      ...interaction,
      response: aiResponse,
    };
  } catch (error) {
    logger.error('Chat service creation failed', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
    });
    throw error;
  }
}

/**
 * Create a log entry based on recognized intent
 */
async function createLogFromIntent(userId, intent, userMessage) {
  const { type, entities } = intent;

  switch (type) {
    case 'meal':
      // Use enhanced GPT-4 food parsing for meals
      return await logMealWithParsing(userId, userMessage, entities);

    case 'workout':
      return await logWorkout(userId, {
        type: entities.type,
        duration_minutes: entities.duration_minutes,
        distance_km: entities.distance_km,
        calories: entities.calories,
        notes: entities.notes,
      });
      
    case 'sleep':
      return await logSleep(userId, {
        duration_minutes: entities.duration_hours ? entities.duration_hours * 60 : entities.duration_minutes,
        quality: entities.quality,
        notes: entities.notes,
      });
      
    case 'mood':
      return await logMood(userId, {
        mood_score: entities.mood_score,
        stress_level: entities.stress_level,
        notes: entities.notes,
      });
      
    case 'supplement':
      return await logSupplement(userId, {
        supplement_name: entities.supplement_name,
        dose: entities.dose,
        notes: entities.notes,
      });
      
    default:
      throw new Error(`Unknown log type: ${type}`);
  }
}

/**
 * Log meal with enhanced GPT-4 food parsing and nutrition lookup
 */
async function logMealWithParsing(userId, userMessage, entities) {
  try {
    logger.info('Logging meal with GPT-4 food parsing', {
      userIdMasked: logger.maskUserId(userId),
    });

    // Step 1: Parse food from message using GPT-4
    const parsedMeal = await parseFoodFromText(userMessage, userId, {
      timestamp: new Date().toISOString(),
    });

    if (!parsedMeal.foods || parsedMeal.foods.length === 0) {
      // Fallback to simple logging if parsing fails
      logger.warn('Food parsing returned no foods, using fallback', {
        userIdMasked: logger.maskUserId(userId),
      });
      return await logMeal(userId, {
        description: entities.description || userMessage,
        calories: entities.calories,
        macros: entities.macros,
        notes: 'Auto-logged via chat',
      });
    }

    // Step 2: Look up nutrition data for each food
    const foodsWithNutrition = await getNutritionForFoods(parsedMeal.foods);

    // Step 3: Calculate totals
    const totals = calculateTotals(foodsWithNutrition);

    // Step 4: Save to database with enhanced fields
    const mealTimestamp = new Date().toISOString();
    const mealDate = mealTimestamp.split('T')[0];

    const mealPayload = {
      user_id: userId,
      meal_type: parsedMeal.meal_type,
      timestamp: mealTimestamp,
      date: mealDate,
      foods: foodsWithNutrition,
      source: 'chat', // Source is chat, not voice
      confidence: parsedMeal.confidence,
      transcription: userMessage,
      // Legacy fields for backward compatibility
      description: userMessage,
      calories: totals.calories,
      macros: {
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        fiber: totals.fiber,
      },
      notes: 'Auto-logged via chat',
    };

    const { data: savedMeal, error } = await supabaseAdmin
      .from('meals')
      .insert(mealPayload)
      .select()
      .single();

    if (error) {
      logger.error('Failed to save meal to database', {
        userIdMasked: logger.maskUserId(userId),
        error: error.message,
      });
      throw error;
    }

    logger.info('Meal logged successfully with nutrition data', {
      userIdMasked: logger.maskUserId(userId),
      mealId: savedMeal.id,
      totalCalories: totals.calories,
      foodCount: foodsWithNutrition.length,
    });

    // Return meal with nutrition totals for confirmation message
    return {
      ...savedMeal,
      totals,
      foodCount: foodsWithNutrition.length,
    };
  } catch (error) {
    logger.error('Enhanced meal logging failed, using fallback', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
    });

    // Fallback to simple logging on error
    return await logMeal(userId, {
      description: entities.description || userMessage,
      calories: entities.calories,
      macros: entities.macros,
      notes: 'Auto-logged via chat (fallback)',
    });
  }
}

/**
 * Generate a confirmation message for a logged activity
 */
function generateConfirmationMessage(logType, logData) {
  // Enhanced meal confirmation with nutrition data
  if (logType === 'meal' && logData.totals) {
    const { calories, protein } = logData.totals;
    const foodCount = logData.foodCount || 0;
    return `Logged! ${calories} cal, ${protein}g protein (${foodCount} ${foodCount === 1 ? 'item' : 'items'}). Nice ${logData.meal_type || 'meal'}! 🍽️`;
  }

  // Standard confirmations for other log types
  const confirmations = {
    meal: `Got it! I've logged that meal for you. 🍽️`,
    workout: `Awesome! I've logged your workout. 🏋️‍♂️`,
    sleep: `Thanks for the update. I've logged your sleep. 😴`,
    mood: `I've noted how you're feeling today. 🧠`,
    supplement: `Got it! I've logged your supplement. 💊`,
  };

  return confirmations[logType] || `I've logged that for you.`;
}

/**
 * Generate AI chat reply with context
 */
async function generateChatReply(userId, userMessage) {
  try {
    // Get user profile for context
    const profile = await getUserProfile(userId);
    
    // Get recent chat history for context
    const chatHistory = await getChatHistory(userId, 5);
    
    // Build system prompt with context
    const systemPrompt = getStruktSystemPrompt(profile, null, chatHistory);
    
    // Generate reply
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];
    
    const reply = await getAIReply(messages);
    return reply;
  } catch (error) {
    logger.error('Failed to generate chat reply', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
    });
    return "I'm here to help! Could you tell me more about what you need?";
  }
}

/**
 * Get chat history for user
 */
async function getChatHistory(userId, limit = 5) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  try {
    const { supabaseAdmin } = require('../lib/supabaseServer');
    
    const { data, error } = await supabaseAdmin
      .from('chat_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    logger.error('Chat service history retrieval failed', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  createChatInteraction,
  getChatHistory,
};