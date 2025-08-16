// services/memoryService.js

/**
 * Service for retrieving and summarising a user’s chat history.  The
 * memory system helps the assistant remember past conversations and
 * preferences.  Currently this implementation fetches the most recent
 * N chat interactions and concatenates them.  Future versions could
 * leverage GPT to produce a concise summary.
 */

const axios = require('axios');
const { AIRTABLE_BASE_ID, AIRTABLE_API_KEY } = process.env;
const { TABLE_IDS, FIELD_IDS } = require('../utils/logging');

/**
 * Retrieve the latest chat interactions for a user.  The returned
 * objects include the user’s message and the AI’s response.  This
 * function uses Airtable’s sort and pageSize parameters to limit the
 * number of records.
 *
 * @param {string} userEmail User's email address (must match Airtable field "Email Address")
 * @param {number} limit Maximum number of records to fetch (default 5)
 * @returns {Promise<Array<{ message: string, aiResponse: string }>>}
 */
async function getRecentChatHistory(userEmail, limit = 5) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.chat}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    params: {
      filterByFormula: `{Email Address} = '${userEmail}'`,
      sort: `[{"field":"${FIELD_IDS.chat.Created}","direction":"desc"}]`,
      maxRecords: limit,
    },
  });
  return res.data.records.map(rec => ({
    message: rec.fields['Message'],
    aiResponse: rec.fields['AI Response'],
  }));
}

/**
 * Build a memory prompt from the chat history.  For now, the memory is
 * simply a concatenation of the last few interactions.  A more
 * advanced implementation could call the OpenAI API to summarise the
 * content into a short paragraph.
 *
 * @param {Array<{ message: string, aiResponse: string }>} history
 * @returns {string} Formatted memory prompt
 */
function buildMemoryPrompt(history) {
  if (!history || !history.length) return '';
  // Join each pair of message and response.  Use separators to make
  // memory segments clear.  Truncation logic could be added here to
  // enforce token limits.
  const lines = history.map(({ message, aiResponse }, idx) => {
    return `Conversation ${idx + 1}:\nUser: ${message}\nAssistant: ${aiResponse}`;
  });
  return `Here is a summary of recent conversations:\n${lines.join('\n---\n')}`;
}

module.exports = { getRecentChatHistory, buildMemoryPrompt };
