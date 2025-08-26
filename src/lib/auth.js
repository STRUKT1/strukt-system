/**
 * JWT Authentication Middleware
 * Verifies Supabase JWT tokens and extracts user_id for RLS
 */

const { createClient } = require('@supabase/supabase-js');
const { config } = require('../config');

// Create Supabase client for JWT verification (with fallback for missing config)
let supabase = null;

try {
  if (config.supabase.url && config.supabase.anonKey) {
    supabase = createClient(config.supabase.url, config.supabase.anonKey);
  }
} catch (error) {
  console.warn('Supabase client initialization failed:', error.message);
}

/**
 * Extract and verify JWT token from Authorization header
 * Sets req.userId on successful verification
 */
async function authenticateJWT(req, res, next) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      return res.status(503).json({
        ok: false,
        code: 'ERR_AUTH_UNAVAILABLE',
        message: 'Authentication service not configured',
      });
    }
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        code: 'ERR_NO_TOKEN',
        message: 'Authorization header with Bearer token required',
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        ok: false,
        code: 'ERR_INVALID_TOKEN',
        message: 'Invalid or expired token',
      });
    }
    
    // Extract user_id for use in services
    req.userId = user.id;
    req.user = user;
    
    next();
  } catch (error) {
    console.error('JWT authentication error:', error.message);
    return res.status(401).json({
      ok: false,
      code: 'ERR_AUTH_FAILED',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication middleware - sets userId if token is valid
 * but doesn't reject if no token is provided
 */
async function optionalAuth(req, res, next) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      return next();
    }
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user) {
      req.userId = user.id;
      req.user = user;
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on errors
    console.warn('Optional auth warning:', error.message);
    next();
  }
}

module.exports = {
  authenticateJWT,
  optionalAuth,
};