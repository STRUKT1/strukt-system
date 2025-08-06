// controllers/chatController.js

const Joi = require('joi');
const axios = require('axios');
const {
  findUserIdByEmail,
  TABLE_IDS,
  FIELD_IDS,
} = require('../utils/logging');

// Validate query parameters for chat history.  Supports optional limit and
// offset for pagination.
const historySchema = Joi.object({
  email: Joi.string().email().required(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

/**
 * Fetches chat history for a given user from Airtable.  Uses the same
 * Airtable base and table identifiers as the logging functions.  Results
 * are ordered by created time descending.
 */
async function chatHistoryController(req, res, next) {
  try {
    const { value, error } = historySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    const { email, limit, offset } = value;
    const userId = await findUserIdByEmail(email);
    if (!userId) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${TABLE_IDS.chat}`;
    // Filter records by user record ID; Airtable requires the field value
    // to be an array of record IDs because it's a linked field.
    const filter = `SEARCH('${userId}', ARRAYJOIN({${FIELD_IDS.chat.User}}, ','))`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
      params: {
        filterByFormula: filter,
        sort: [{ field: 'Created', direction: 'desc' }],
        maxRecords: limit,
        offset: offset,
      },
    });
    const records = response.data.records.map(r => ({ id: r.id, fields: r.fields }));
    return res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
}

module.exports = { chatHistoryController };