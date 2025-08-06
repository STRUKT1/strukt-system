// routes/ask.js

const express = require('express');
const router = express.Router();
const { askController } = require('../controllers/aiController');

// POST /ask
router.post('/ask', askController);

module.exports = router;