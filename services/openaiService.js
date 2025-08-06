// services/openaiService.js

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Load system prompt once at module initialization.  Reading synchronously
// during startup is acceptable here because it happens only once and
// simplifies error handling.  If this file cannot be found, throw an
// error to fail fast.
const systemPrompt = fs.readFileSync(
  path.join(__dirname, '../utils/prompts/strukt-system-prompt.txt'),
  'utf-8',
);

// Create a single OpenAI client instance.  Reusing the instance
// improves connection reuse and avoids re‑initialisation costs on every
// request.  If the API key is missing, an error will be thrown when
// attempting to send a request.
// Initialise the OpenAI client.  When using a project‑scoped API key
// (sk‑proj‑…) the `project` option MUST be provided so that the API
// knows which models are available.  Falling back to undefined
// allows older keys to continue working without a project id.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.OPENAI_PROJECT_ID || undefined,
});

/**
 * Generate a chat completion from OpenAI.  Accepts an array of message
 * objects (role/content) which may include a system message with the
 * STRUKT system prompt or additional context.  Additional options (e.g.
 * max_tokens, temperature) can be supplied via the optional options
 * parameter.
 *
 * @param {Array<{ role: string, content: string }>} messages The chat
 *   conversation history passed from the client
 * @param {Object} options Additional options for OpenAI (model, max_tokens)
 * @returns {Promise<string>} The assistant’s reply as plain text
 */
async function getAIReply(messages = [], options = {}) {
  // Prepend the system prompt if the caller hasn’t provided one.  This
  // ensures the assistant always stays on brand and respects the STRUKT
  // guidelines.
  let msgs = messages;
  const hasSystem = messages.find(msg => msg.role === 'system');
  if (!hasSystem) {
    msgs = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];
  }
  // Determine the primary model.  Default to GPT‑4o, but allow
  // override via options.model or environment.  A fallback model is
  // prepared in case the primary model is not authorised for the
  // project key.
  const primaryModel = options.model || process.env.OPENAI_MODEL || 'gpt-4o';
  const fallbackModel = 'gpt-3.5-turbo';

  try {
    const completion = await openai.chat.completions.create({
      model: primaryModel,
      messages: msgs,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 500,
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    // If the error relates to invalid permissions or unknown model,
    // attempt to call again with a fallback model.  This ensures the
    // assistant still responds when GPT‑4o is unavailable under the
    // current API key.  Only retry once to avoid infinite loops.
    const errorType = err?.response?.data?.error?.type || '';
    if (
      (errorType === 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND' ||
        errorType === 'model_not_found') &&
      primaryModel !== fallbackModel
    ) {
      try {
        const fallback = await openai.chat.completions.create({
          model: fallbackModel,
          messages: msgs,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 500,
        });
        return fallback.choices[0].message.content.trim();
      } catch (fallbackErr) {
        // If the fallback also fails, capture both errors and throw
        const wrapped = new Error('Failed to generate AI reply (fallback failed)');
        wrapped.status = fallbackErr.response?.status || 500;
        wrapped.cause = fallbackErr;
        // Attach original error for context
        wrapped.originalError = err;
        throw wrapped;
      }
    }
    // Re‑throw with a user‑friendly message and attach the original
    // error details for debugging.
    const wrapped = new Error('Failed to generate AI reply');
    wrapped.status = err.response?.status || 500;
    wrapped.cause = err;
    throw wrapped;
  }
}

module.exports = { getAIReply };