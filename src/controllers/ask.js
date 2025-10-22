/**
 * AI Coach Controller
 * 
 * Handles AI coach /ask endpoint with comprehensive validation, safety checks,
 * logging, and fallback handling.
 */

const Joi = require('joi');
const { getAIReply, getFallbackResponse } = require('../../services/openaiService');
const { validateResponse } = require('../services/safetyValidator');
const { logInteraction } = require('../services/coachLogService');
const { buildCompletePrompt } = require('../services/promptService');

// Validation schema for the /ask payload
const askSchema = Joi.object({
  messages: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid('system', 'user', 'assistant').required(),
        content: Joi.string().max(1000).required(),
      }),
    )
    .min(1)
    .required(),
  userId: Joi.string().uuid().optional(),
  sessionId: Joi.string().optional(),
  email: Joi.string().email().optional(),
});

/**
 * Controller for POST /ask
 * 
 * Validates input, generates AI response with safety checks, and logs interactions.
 */
async function askController(req, res, next) {
  const sessionId = req.body.sessionId || `session_${Date.now()}`;
  let userId = req.body.userId || null;
  let success = false;
  let reply = null;
  let issues = null;

  try {
    // 1. Validate request payload
    const { value, error } = askSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: `Validation error: ${error.message}` 
      });
    }

    const { messages } = value;

    // 2. Validate for empty or whitespace-only user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      const trimmedContent = lastMessage.content.trim();
      if (!trimmedContent) {
        return res.status(400).json({
          success: false,
          message: 'User message cannot be empty or contain only whitespace.',
        });
      }

      // 3. Enforce 1000-character limit (already in schema, but explicit check)
      if (lastMessage.content.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'User message exceeds 1000 character limit.',
        });
      }
    }

    // 4. Build complete prompt with user context
    // Note: In production, you would fetch user profile/memory here
    const userMessage = lastMessage.content;
    let messagesWithPrompt = messages;
    
    // If no system message exists, use prompt service
    const hasSystemMessage = messages.some(m => m.role === 'system');
    if (!hasSystemMessage) {
      const systemPrompt = buildCompletePrompt({
        profile: null, // TODO: Fetch from DB using userId
        memory: null,  // TODO: Fetch recent history
        plan: null,    // TODO: Fetch user plan
      });
      
      messagesWithPrompt = [
        { role: 'system', content: systemPrompt },
        ...messages,
      ];
    }

    // 5. Get AI response with error handling
    try {
      reply = await getAIReply(messagesWithPrompt);
    } catch (aiError) {
      console.error('[Ask Controller] OpenAI error:', aiError.message);
      
      // Use fallback response based on error type
      const fallbackType = aiError.message.includes('timeout') ? 'timeout' : 'error';
      reply = getFallbackResponse(fallbackType);
      success = false;
      
      // Still log the failed interaction
      return res.status(200).json({
        success: false,
        reply,
        fallback: true,
      });
    }

    // 6. Validate safety of response
    const safetyCheck = validateResponse(reply);
    
    if (!safetyCheck.safe) {
      console.warn('[Ask Controller] Unsafe response detected:', safetyCheck.issues);
      issues = safetyCheck.issues;
      
      // Return safe fallback instead of unsafe content
      reply = getFallbackResponse('unsafe');
      success = false;
      
      return res.status(200).json({
        success: false,
        reply,
        safety_fallback: true,
      });
    }

    // 7. Response is safe and successful
    success = true;

    return res.json({
      success: true,
      reply,
    });

  } catch (err) {
    // Unexpected error - log and return fallback
    console.error('[Ask Controller] Unexpected error:', err);
    
    reply = getFallbackResponse('error');
    success = false;
    
    return res.status(500).json({
      success: false,
      reply,
      error: true,
    });
    
  } finally {
    // 8. Always log the interaction (success or failure)
    if (userId && reply) {
      const userMessage = req.body.messages?.[req.body.messages.length - 1]?.content || '';
      
      // Log asynchronously, don't block response
      logInteraction({
        userId,
        sessionId,
        userMessage,
        aiResponse: reply,
        success,
        issues,
      }).catch(logErr => {
        console.error('[Ask Controller] Failed to log interaction:', logErr.message);
      });
    }
  }
}

module.exports = { askController };
