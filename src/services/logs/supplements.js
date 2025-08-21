/**
 * Supplements Service (Skeleton)
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');

const TABLE = 'supplements';

async function logSupplement(userId, supplementData) {
  const payload = { user_id: userId, ...supplementData };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  logSupplement
};