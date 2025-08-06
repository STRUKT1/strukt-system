// routes/chatHistory.js

const express = require('express');
const router = express.Router();
const { chatHistoryController } = require('../controllers/chatController');

// GET /chat-history
router.get('/chat-history', chatHistoryController);

module.exports = router;