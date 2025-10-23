/**
 * STRUKT System - Main Server Entry Point
 * Phase 1.5 Implementation with Supabase-first architecture
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, validateConfig } = require('./config');
const { standardRateLimit } = require('./lib/rateLimit');
const logger = require('./lib/logger');

// Validate configuration
const { errors, warnings } = validateConfig();

if (warnings.length > 0) {
  console.warn('⚠️ Configuration warnings:');
  warnings.forEach(warning => console.warn(`  - ${warning}`));
}

if (errors.length > 0) {
  console.error('❌ Configuration errors:');
  errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

// Create Express app
const app = express();

// Request logging middleware
app.use(logger.requestLogger);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origins (including wildcards)
    const isAllowed = config.allowedOrigins.some(allowedOrigin => {
      // Direct match
      if (allowedOrigin === origin) return true;
      
      // Wildcard pattern match (e.g., https://*.expo.dev)
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
          .replace(/\*/g, '.*'); // Replace * with .* for regex
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      
      return false;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(standardRateLimit);

// Mount routes
const healthRoutes = require('./routes/health');
const profileRoutes = require('./routes/profile');
const onboardingRoutes = require('./routes/onboarding');
const chatRoutes = require('./routes/chat');
const autoLogRoutes = require('./routes/autoLog');
const nutritionRoutes = require('./routes/nutrition');
const imageLogRoutes = require('./routes/imageLog');
const proactiveCoachRoutes = require('./routes/proactiveCoach');

// Legacy routes (for backward compatibility)
const askRoutes = require('../routes/ask');
const logRoutes = require('../routes/log');
const chatHistoryRoutes = require('../routes/chatHistory');

// New v1 API routes
app.use('/', healthRoutes);
app.use('/', profileRoutes);
app.use('/', onboardingRoutes);
app.use('/', chatRoutes);
app.use('/', autoLogRoutes);
app.use('/', nutritionRoutes);
app.use('/', imageLogRoutes);
app.use('/', proactiveCoachRoutes);

// Legacy routes
app.use('/', askRoutes);
app.use('/', logRoutes);
app.use('/', chatHistoryRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '👋 STRUKT System API',
    version: require('../package.json').version,
    status: 'operational',
    docs: '/health',
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });
  
  // Don't leak error details in production
  const message = config.nodeEnv === 'development' 
    ? error.message 
    : 'Internal server error';
    
  res.status(500).json({
    ok: false,
    code: 'ERR_INTERNAL_SERVER',
    message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    code: 'ERR_NOT_FOUND',
    message: 'Endpoint not found',
  });
});

// Start server
const server = app.listen(config.port, () => {
  logger.info('Server started', {
    port: config.port,
    env: config.nodeEnv,
    version: require('../package.json').version,
  });
  
  console.log(`🚀 STRUKT System running on port ${config.port}`);
  console.log(`📋 Environment: ${config.nodeEnv}`);
  console.log(`🔧 Supabase: ${config.supabase.url ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`🔄 Dual-write: ${config.dualWrite ? '✅ Enabled' : '❌ Disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server shut down complete');
    process.exit(0);
  });
});

module.exports = app;