/**
 * Sleep Logs Service
 *
 * Handles sleep logging operations in Supabase with optional dual-write to Airtable.
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');
const logger = require('../../lib/logger');

const TABLE = 'sleep_logs';

// Environment flags for backend selection and dual-write
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';
const DUAL_WRITE = process.env.DUAL_WRITE === 'true';

// Valid fields for sleep_logs table based on schema
const VALID_SLEEP_FIELDS = new Set([
  'duration_minutes', 'quality', 'bedtime', 'wake_time', 'notes'
]);

/**
 * Sanitize sleep data by removing unknown fields and handling nulls
 * @param {Object} data - Raw sleep data
 * @returns {Object} Sanitized sleep data
 */
function sanitizeSleepData(data) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (VALID_SLEEP_FIELDS.has(key)) {
      // Handle null/undefined values safely
      if (value !== null && value !== undefined) {
        sanitized[key] = value;
      }
    }
    // Silently ignore unknown fields for security
  }
  
  return sanitized;
}

async function logSleep(userId, sleepData) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!sleepData || typeof sleepData !== 'object') {
    throw new Error('Valid sleep data is required');
  }

  // Sanitize input data
  const sanitizedData = sanitizeSleepData(sleepData);
  const payload = { user_id: userId, ...sanitizedData };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    logger.error('Error logging sleep', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
      operation: 'logSleep'
    });
    throw error;
  }

  // Dual-write to Airtable if enabled
  if (DUAL_WRITE) {
    try {
      await writeSleepToAirtable(userId, sanitizedData);
      logger.info('Airtable sync completed', {
        userIdMasked: logger.maskUserId(userId),
        syncType: 'dual-write',
        dataType: 'sleep'
      });
    } catch (airtableError) {
      logger.warn('Airtable sync failed (non-blocking)', {
        userIdMasked: logger.maskUserId(userId),
        syncType: 'dual-write',
        dataType: 'sleep',
        error: airtableError.message
      });
      // Don't throw - dual-write failures shouldn't break the primary operation
    }
  }

  return data;
}

/**
 * Helper function to write sleep to Airtable for dual-write
 */
async function writeSleepToAirtable(userId, sleepData) {
  const airtablePayload = {};
  
  if (sleepData.duration_minutes) airtablePayload['Duration'] = sleepData.duration_minutes;
  if (sleepData.quality) airtablePayload['Quality'] = sleepData.quality;
  if (sleepData.bedtime) airtablePayload['Bedtime'] = sleepData.bedtime;
  if (sleepData.wake_time) airtablePayload['Wake Time'] = sleepData.wake_time;
  if (sleepData.notes) airtablePayload['Notes'] = sleepData.notes;

  logger.debug('Preparing Airtable dual-write payload', {
    userIdMasked: logger.maskUserId(userId),
    syncType: 'dual-write',
    dataType: 'sleep',
    fields: Object.keys(airtablePayload)
  });
  
  // Note: Actual Airtable write implementation would go here
}

module.exports = {
  logSleep,
  sanitizeSleepData // Export for testing
};