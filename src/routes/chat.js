/**
 * Chat interaction endpoints
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { validateChatMiddleware, validateChatQueryMiddleware } = require('../validation/chat');
const { createChatInteraction, getChatHistory } = require('../services/chatService');
const logger = require('../lib/logger');

const router = express.Router();

/**
 * POST /v1/chat
 * Create a new chat interaction with magic logging
 */
router.post('/v1/chat', authenticateJWT, validateChatMiddleware, async (req, res) => {
  try {
    logger.info('Chat interaction requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      messageLength: req.validatedData.message?.length,
    });
    
    const interaction = await createChatInteraction(req.userId, req.validatedData);
    
    logger.info('Chat interaction created', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      interactionId: interaction.id,
    });
    
    res.json({
      ok: true,
      data: {
        id: interaction.id,
        response: interaction.response,
        timestamp: interaction.timestamp,
        context: interaction.context,
      },
    });
  } catch (error) {
    logger.error('Chat interaction failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_CHAT_FAILED',
      message: 'Failed to create chat interaction',
    });
  }
});

/**
 * GET /v1/chat
 * Get chat history for user
 */
router.get('/v1/chat', authenticateJWT, validateChatQueryMiddleware, async (req, res) => {
  try {
    logger.info('Chat history requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      limit: req.validatedQuery.limit,
    });
    
    const interactions = await getChatHistory(req.userId, req.validatedQuery.limit);
    
    res.json({
      ok: true,
      data: interactions,
    });
  } catch (error) {
    logger.error('Chat history retrieval failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_CHAT_HISTORY_FAILED',
      message: 'Failed to retrieve chat history',
    });
  }
});

module.exports = router;