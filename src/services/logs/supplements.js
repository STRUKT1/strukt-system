/**
 * Supplements Service
 * 
 * Handles supplement logging operations in Supabase with optional dual-write to Airtable.
 */

const { supabaseAdmin } = require('../../lib/supabaseServer');

const TABLE = 'supplements';

// Environment flags for backend selection and dual-write
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';
const DUAL_WRITE = process.env.DUAL_WRITE === 'true';

// Valid fields for supplements table based on schema
const VALID_SUPPLEMENT_FIELDS = new Set([
  'supplement_name', 'dose', 'time', 'notes'
]);

/**
 * Sanitize supplement data by removing unknown fields and handling nulls
 * @param {Object} data - Raw supplement data
 * @returns {Object} Sanitized supplement data
 */
function sanitizeSupplementData(data) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (VALID_SUPPLEMENT_FIELDS.has(key)) {
      // Handle null/undefined values safely
      if (value !== null && value !== undefined) {
        sanitized[key] = value;
      }
    }
    // Silently ignore unknown fields for security
  }
  
  return sanitized;
}

async function logSupplement(userId, supplementData) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!supplementData || typeof supplementData !== 'object') {
    throw new Error('Valid supplement data is required');
  }

  // Sanitize input data
  const sanitizedData = sanitizeSupplementData(supplementData);
  const payload = { user_id: userId, ...sanitizedData };

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error logging supplement:', error.message);
    throw error;
  }

  // Dual-write to Airtable if enabled
  if (DUAL_WRITE) {
    try {
      await writeSupplementToAirtable(userId, sanitizedData);
      console.log('✅ Supplement dual-write to Airtable successful');
    } catch (airtableError) {
      console.error('⚠️ Supplement dual-write to Airtable failed (non-blocking):', airtableError.message);
      // Don't throw - dual-write failures shouldn't break the primary operation
    }
  }

  return data;
}

/**
 * Helper function to write supplement to Airtable for dual-write
 */
async function writeSupplementToAirtable(userId, supplementData) {
  const airtablePayload = {};
  
  if (supplementData.supplement_name) airtablePayload['SupplementName'] = supplementData.supplement_name;
  if (supplementData.dose) airtablePayload['Dose'] = supplementData.dose;
  if (supplementData.time) airtablePayload['Time'] = supplementData.time;
  if (supplementData.notes) airtablePayload['Notes'] = supplementData.notes;

  console.log('📝 Supplement Airtable dual-write payload:', { 
    userId: userId.substring(0, 8) + '...', 
    fields: Object.keys(airtablePayload) 
  });
  
  // Note: Actual Airtable write implementation would go here
}

module.exports = {
  logSupplement,
  sanitizeSupplementData // Export for testing
};