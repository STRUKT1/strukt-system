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
        logCreated = await createLogFromIntent(userId, intent);
        
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
async function createLogFromIntent(userId, intent) {
  const { type, entities } = intent;
  
  switch (type) {
    case 'meal':
      return await logMeal(userId, {
        description: entities.description,
        calories: entities.calories,
        macros: entities.macros,
        notes: entities.notes,
      });
      
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
 * Generate a confirmation message for a logged activity
 */
function generateConfirmationMessage(logType, logData) {
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