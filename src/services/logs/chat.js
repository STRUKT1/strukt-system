/**
 * Chat Interactions Service
 *
 * Handles chat interaction logging in Supabase with optional dual-write to Airtable.
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');
const logger = require('../../lib/logger');

const TABLE = 'chat_interactions';

// Environment flags for backend selection and dual-write
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';
const DUAL_WRITE = process.env.DUAL_WRITE === 'true';

// Valid fields for chat_interactions table based on schema
const VALID_CHAT_FIELDS = new Set([
  'message', 'response', 'context', 'timestamp'
]);

/**
 * Sanitize chat data by removing unknown fields and handling nulls
 * @param {Object} data - Raw chat data
 * @returns {Object} Sanitized chat data
 */
function sanitizeChatData(data) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (VALID_CHAT_FIELDS.has(key)) {
      // Handle null/undefined values safely
      if (value !== null && value !== undefined) {
        sanitized[key] = value;
      }
    }
    // Silently ignore unknown fields for security
  }
  
  return sanitized;
}

async function logChatInteraction(userId, chatData) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!chatData || typeof chatData !== 'object') {
    throw new Error('Valid chat data is required');
  }

  // Sanitize input data
  const sanitizedData = sanitizeChatData(chatData);

  const payload = {
    user_id: userId,
    ...sanitizedData,
    timestamp: sanitizedData.timestamp || new Date().toISOString()
  };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    logger.error('Error logging chat interaction', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
      operation: 'logChatInteraction'
    });
    throw error;
  }

  // Dual-write to Airtable if enabled
  if (DUAL_WRITE) {
    try {
      await writeChatToAirtable(userId, sanitizedData);
      logger.info('Airtable sync completed', {
        userIdMasked: logger.maskUserId(userId),
        syncType: 'dual-write',
        dataType: 'chat'
      });
    } catch (airtableError) {
      logger.warn('Airtable sync failed (non-blocking)', {
        userIdMasked: logger.maskUserId(userId),
        syncType: 'dual-write',
        dataType: 'chat',
        error: airtableError.message
      });
      // Don't throw - dual-write failures shouldn't break the primary operation
    }
  }

  return data;
}

/**
 * Helper function to write chat to Airtable for dual-write
 */
async function writeChatToAirtable(userId, chatData) {
  const airtablePayload = {};
  
  if (chatData.message) airtablePayload['User_Message'] = chatData.message;
  if (chatData.response) airtablePayload['AI_Response'] = chatData.response;
  if (chatData.context) airtablePayload['Context'] = JSON.stringify(chatData.context);
  if (chatData.timestamp) airtablePayload['Created'] = chatData.timestamp;

  logger.debug('Preparing Airtable dual-write payload', {
    userIdMasked: logger.maskUserId(userId),
    syncType: 'dual-write',
    dataType: 'chat',
    fields: Object.keys(airtablePayload)
  });
  
  // Note: Actual Airtable write implementation would go here
}

module.exports = {
  logChatInteraction,
  sanitizeChatData // Export for testing
};