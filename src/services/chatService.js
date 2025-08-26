/**
 * Chat Service for v1 API
 * Wraps existing chat logging service with v1 API patterns
 */

const { logChatInteraction, getChatInteractions } = require('./logs/chat');
const logger = require('../lib/logger');

/**
 * Create new chat interaction
 */
async function createChatInteraction(userId, chatData) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  if (!chatData || typeof chatData !== 'object') {
    throw new Error('Chat data is required');
  }
  
  try {
    const interaction = await logChatInteraction(userId, chatData);
    return interaction;
  } catch (error) {
    logger.error('Chat service creation failed', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
    });
    throw error;
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
    // Check if getChatInteractions function exists
    if (typeof getChatInteractions !== 'function') {
      // For now, we'll implement a basic version using the supabase client
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
    }
    
    const interactions = await getChatInteractions(userId, { limit });
    return interactions;
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