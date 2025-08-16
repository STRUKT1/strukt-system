// services/personalisationService.js

/**
 * Service for loading a user’s onboarding data and constructing a
 * personalisation prompt.  This prompt is used to inform the AI
 * assistant about the user’s preferences, goals and context so that
 * replies feel bespoke.  Data is sourced from the Airtable User
 * table using the record ID derived from the email address.
 */

const axios = require('axios');
const { AIRTABLE_BASE_ID, AIRTABLE_API_KEY } = process.env;
const { TABLE_IDS } = require('../utils/logging');

const { findUserIdByEmail } = require('../utils/logging');

/**
 * Fetch the user’s Airtable record by email and return the fields.  If
 * the user does not exist, resolves to null.
 *
 * @param {string} email Lower‑case user email
 * @returns {Promise<Object|null>} User fields or null if not found
 */
async function fetchUserData(email) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return null;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.users}/${userId}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });
  return res.data.fields;
}

/**
 * Compose a personalisation string from the user’s onboarding fields.  You
 * can adjust this template to include additional fields as needed.  If
 * a field is missing, it will be omitted.  This string will be
 * included in the system prompt so that the assistant adapts its tone
 * and guidance.
 *
 * @param {Object} fields User record fields from Airtable
 * @returns {string} Personalisation prompt text
 */
function buildPersonalisationPrompt(fields) {
  if (!fields) return '';
  const lines = [];
  if (fields['Full Name']) lines.push(`Name: ${fields['Full Name']}`);
  if (fields['Gender Identity']) lines.push(`Gender: ${fields['Gender Identity']}`);
  if (fields['Pronouns']) lines.push(`Pronouns: ${fields['Pronouns']}`);
  if (fields['Body Type']) lines.push(`Body type: ${fields['Body Type']}`);
  if (fields['Main Goal']) lines.push(`Goals: ${Array.isArray(fields['Main Goal']) ? fields['Main Goal'].join(', ') : fields['Main Goal']}`);
  if (fields['Dietary Needs/Allergies']) lines.push(`Dietary needs: ${fields['Dietary Needs/Allergies']}`);
  if (fields['Medical Considerations']) lines.push(`Medical considerations: ${fields['Medical Considerations']}`);
  if (fields['Preferred Coaching Tone']) lines.push(`Coaching tone: ${Array.isArray(fields['Preferred Coaching Tone']) ? fields['Preferred Coaching Tone'].join(', ') : fields['Preferred Coaching Tone']}`);
  if (fields['Vision of Success']) lines.push(`Vision of success: ${fields['Vision of Success']}`);
  // Join lines into a human‑readable paragraph.  You can adjust the
  // separators to fit your prompt style (commas vs newlines).
  return lines.length ? `Here is the user’s profile for context:\n${lines.join('\n')}` : '';
}

module.exports = { fetchUserData, buildPersonalisationPrompt };