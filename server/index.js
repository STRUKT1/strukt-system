/**
 * Entry point for the STRUKT backend.  This file wires up the Express
 * application, applies global middleware (security headers, CORS, rate
 * limiting) and mounts all API routes.  Keeping this file slim makes it
 * straightforward to see the composition of the app at a glance.  Actual
 * business logic lives in controllers and services.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create the Express application
const app = express();

// Parse JSON bodies (built-in to Express 4.18)
app.use(express.json());

// Apply security headers
app.use(helmet());

// Configure CORS. Allowed origins can be specified via the
// ALLOWED_ORIGINS environment variable as a comma-separated list. If not
// provided, all origins are allowed (useful during local development).
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || !allowedOrigins) return callback(null, true);
      return allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS'));
    },
  }),
);

// Apply rate limiting to all requests. Adjust the window and limit as
// necessary to fit your anticipated traffic patterns. A short window is
// chosen here to protect the OpenAI endpoint from abuse.
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Mount route modules
const askRoutes = require('../routes/ask');
const logRoutes = require('../routes/log');
const chatHistoryRoutes = require('../routes/chatHistory');

app.use('/', askRoutes);
app.use('/', logRoutes);
app.use('/', chatHistoryRoutes);

// Root route to verify the service is alive
app.get('/', (req, res) => {
  res.send('👋 Hello from STRUKT Coach Server!');
});

// Global error handler. Any error thrown in async route handlers will be
// passed to this middleware, resulting in a consistent JSON response.
const errorHandler = require('../middleware/errorHandler');
app.use(errorHandler);

// 🔑 ENV DEBUG
const port = process.env.PORT || 3000;
console.log('✅ ENV DEBUG:', {
  PORT: port,
  OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY?.length,
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 STRUKT Coach server running on port ${port}`);
});

module.exports = app;
