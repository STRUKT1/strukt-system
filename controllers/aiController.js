// controllers/aiController.js

const Joi = require('joi');
const { getAIReply } = require('../services/openaiService');
const { logChatInteraction, findUserIdByEmail } = require('../utils/logging');
const { fetchUserData, buildPersonalisationPrompt } = require('../services/personalisationService');
const { getRecentChatHistory, buildMemoryPrompt } = require('../services/memoryService');
const { getStruktSystemPrompt } = require('../src/ai/struktSystem');
const fs = require('fs');
const path = require('path');

// Validation schema for the /ask payload.  Expects an array of messages
// adhering to the OpenAI format and optional email/topic for logging.
const askSchema = Joi.object({
  messages: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid('system', 'user', 'assistant').required(),
        content: Joi.string().max(2000).required(),
      }),
    )
    .min(1)
    .required(),
  email: Joi.string().email().optional(),
  topic: Joi.string().optional(),
});

/**
 * Handles POST /ask.  Validates input, generates an AI reply using the
 * OpenAI service and logs the interaction to Airtable if an email is
 * provided.
 */
async function askController(req, res, next) {
  try {
    const { value, error } = askSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    const { messages, email, topic } = value;
    let userId = null;
    let normalisedEmail;
    // If an email is provided, look up the user record in Airtable first.
    if (email) {
      normalisedEmail = email.toLowerCase();
      try {
        userId = await findUserIdByEmail(normalisedEmail);
      } catch (err) {
        // Propagate Airtable lookup errors to the global error handler with details
        const wrapped = new Error('Failed to look up user');
        wrapped.status = err.response?.status || 500;
        wrapped.cause = err;
        return next(wrapped);
      }
      if (!userId) {
        // Return a 404 when the user cannot be found
        return res.status(404).json({ success: false, message: 'User not found' });
      }
    }
    // Build context for the assistant: personalisation and memory.  We
    // construct a custom system prompt combining the default system
    // prompt, the recent chat summary and the user’s onboarding data.
    let systemPromptCombined;
    try {
      let profile = null;
      let memory = null;
      let plan = null; // TODO: Add plan retrieval when plans are implemented
      
      if (userId) {
        // Fetch user profile data
        const userFields = await fetchUserData(normalisedEmail);
        profile = userFields;
        
        // Fetch recent chat history
        const history = await getRecentChatHistory(userId, 5);
        memory = history;
      }
      
      // Use the canonical system prompt function
      systemPromptCombined = getStruktSystemPrompt(profile, plan, memory);
    } catch (contextErr) {
      // If context construction fails, log the error and fall back to
      // using the default system prompt only.  Do not block the chat.
      console.error('Context construction failed', contextErr);
      systemPromptCombined = getStruktSystemPrompt(); // Use base prompt without context
    }
    // Insert the custom system prompt as the first message in the
    // conversation.  Because this is a system message, getAIReply
    // will not inject its own system prompt.
    const messagesWithContext = [
      { role: 'system', content: systemPromptCombined },
      ...messages,
    ];
    const reply = await getAIReply(messagesWithContext);
    // Log the chat only if we have a user ID
    if (userId) {
      const userMessage = messages[messages.length - 1].content;
      logChatInteraction(normalisedEmail, topic, userMessage, reply);
    }
    return res.json({ success: true, reply });
  } catch (err) {
    next(err);
  }
}

module.exports = { askController };