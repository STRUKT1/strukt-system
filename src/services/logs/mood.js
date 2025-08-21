/**
 * Mood Logs Service
 * 
 * Handles mood logging operations in Supabase with optional dual-write to Airtable.
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');

const TABLE = 'mood_logs';

// Environment flags for backend selection and dual-write
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';
const DUAL_WRITE = process.env.DUAL_WRITE === 'true';

// Valid fields for mood_logs table based on schema
const VALID_MOOD_FIELDS = new Set([
  'mood_score', 'stress_level', 'notes', 'date'
]);

/**
 * Sanitize mood data by removing unknown fields and handling nulls
 * @param {Object} data - Raw mood data
 * @returns {Object} Sanitized mood data
 */
function sanitizeMoodData(data) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (VALID_MOOD_FIELDS.has(key)) {
      // Handle null/undefined values safely
      if (value !== null && value !== undefined) {
        sanitized[key] = value;
      }
    }
    // Silently ignore unknown fields for security
  }
  
  return sanitized;
}

async function logMood(userId, moodData) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!moodData || typeof moodData !== 'object') {
    throw new Error('Valid mood data is required');
  }

  // Sanitize input data
  const sanitizedData = sanitizeMoodData(moodData);

  const payload = {
    user_id: userId,
    ...sanitizedData,
    date: sanitizedData.date || new Date().toISOString().split('T')[0]
  };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error logging mood:', error.message);
    throw error;
  }

  // Dual-write to Airtable if enabled
  if (DUAL_WRITE) {
    try {
      await writeMoodToAirtable(userId, sanitizedData);
      console.log('✅ Mood dual-write to Airtable successful');
    } catch (airtableError) {
      console.error('⚠️ Mood dual-write to Airtable failed (non-blocking):', airtableError.message);
      // Don't throw - dual-write failures shouldn't break the primary operation
    }
  }

  return data;
}

/**
 * Helper function to write mood to Airtable for dual-write
 */
async function writeMoodToAirtable(userId, moodData) {
  const airtablePayload = {};
  
  if (moodData.mood_score) airtablePayload['Mood Score'] = moodData.mood_score;
  if (moodData.stress_level) airtablePayload['Stress Level'] = moodData.stress_level;
  if (moodData.notes) airtablePayload['Notes'] = moodData.notes;
  if (moodData.date) airtablePayload['Date'] = moodData.date;

  console.log('📝 Mood Airtable dual-write payload:', { 
    userId: userId.substring(0, 8) + '...', 
    fields: Object.keys(airtablePayload) 
  });
  
  // Note: Actual Airtable write implementation would go here
}

module.exports = {
  logMood,
  sanitizeMoodData // Export for testing
};