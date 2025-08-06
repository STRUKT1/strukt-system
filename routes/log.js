// routes/log.js

const express = require('express');
const router = express.Router();
const { logController } = require('../controllers/logController');

// POST /log
router.post('/log', logController);

module.exports = router;