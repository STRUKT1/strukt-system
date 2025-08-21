/**
 * Sleep Logs Service (Skeleton)
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');

const TABLE = 'sleep_logs';

async function logSleep(userId, sleepData) {
  const payload = { user_id: userId, ...sleepData };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  logSleep
};