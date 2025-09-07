// routes/ask.js

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { askController } = require('../controllers/aiController');

// Enhanced rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit to 20 AI requests per minute (stricter than general rate limit)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many AI requests. Please wait a moment before trying again.',
  },
});

// POST /ask - with enhanced rate limiting for LLM calls
router.post('/ask', aiRateLimit, askController);

module.exports = router;