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
const dashboardAuditService = require('./services/dashboardAuditService');
const dashboardMetricsService = require('./services/dashboardMetricsService');
const { SERVER } = require('./config/constants');

// Validate configuration
const { errors, warnings } = validateConfig();

if (warnings.length > 0) {
  logger.warn('Configuration warnings detected', { warnings });
}

if (errors.length > 0) {
  logger.error('Configuration errors detected', { errors });
  process.exit(1);
}

// Create Express app
const app = express();

// Initialize audit and metrics services
dashboardAuditService.initialize().catch(err => {
  logger.warn('Dashboard audit service initialization failed', { error: err.message });
});
dashboardMetricsService.initialize();

// Request logging middleware
app.use(logger.requestLogger);

// Correlation ID middleware for audit traceability
app.use(dashboardAuditService.correlationMiddleware);

// Metrics tracking middleware
app.use(dashboardMetricsService.metricsMiddleware);

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

// JSON parsing error handler
// Catches SyntaxError from malformed JSON and returns 400 instead of 500
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('Invalid JSON received', {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      error: err.message,
    });

    return res.status(400).json({
      ok: false,
      code: 'ERR_INVALID_JSON',
      message: 'Invalid JSON format in request body',
    });
  }

  // Pass other errors to next error handler
  next(err);
});

// Handle request timeouts gracefully
app.use((req, res, next) => {
  // Set timeout for this specific request
  req.setTimeout(SERVER.REQUEST_TIMEOUT, () => {
    logger.warn('Request timeout', {
      method: req.method,
      path: req.path,
      requestId: req.requestId,
      ip: req.ip,
    });

    if (!res.headersSent) {
      res.status(408).json({
        ok: false,
        code: 'ERR_REQUEST_TIMEOUT',
        message: 'Request timeout - operation took too long to complete',
      });
    }
  });

  next();
});

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
const metricsRoutes = require('./routes/metrics');
const mealLoggingRoutes = require('./routes/mealLogging');
const photoAnalysisRoutes = require('./routes/photoAnalysis');
const templatesRoutes = require('./routes/templates');
const workoutRoutes = require('./routes/workout');

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
app.use('/', metricsRoutes);
app.use('/', mealLoggingRoutes);
app.use('/', photoAnalysisRoutes);
app.use('/', templatesRoutes);
app.use('/', workoutRoutes);

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
  logger.info('Server started successfully', {
    port: config.port,
    env: config.nodeEnv,
    version: require('../package.json').version,
    supabaseConfigured: !!config.supabase.url,
    dualWriteEnabled: config.dualWrite,
  });
});

// Set request timeout to 30 seconds
server.timeout = SERVER.REQUEST_TIMEOUT;

// Set keep-alive timeout (should be higher than timeout)
server.keepAliveTimeout = SERVER.KEEP_ALIVE_TIMEOUT;

// Set headers timeout (should be higher than keepAliveTimeout)
server.headersTimeout = SERVER.HEADERS_TIMEOUT;

logger.info('Server timeout configuration applied', {
  requestTimeout: '30s',
  keepAliveTimeout: '35s',
  headersTimeout: '36s',
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