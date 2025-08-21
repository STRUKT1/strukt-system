/**
 * Chat Interactions Service (Skeleton)
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');

const TABLE = 'chat_interactions';

async function logChatInteraction(userId, chatData) {
  const payload = {
    user_id: userId,
    ...chatData,
    timestamp: new Date().toISOString()
  };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  logChatInteraction
};