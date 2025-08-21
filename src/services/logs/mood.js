/**
 * Mood Logs Service (Skeleton)
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');

const TABLE = 'mood_logs';

async function logMood(userId, moodData) {
  const payload = {
    user_id: userId,
    ...moodData,
    date: moodData.date || new Date().toISOString().split('T')[0]
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
  logMood
};