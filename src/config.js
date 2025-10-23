/**
 * Configuration management for STRUKT System
 * Centralizes all environment variable access and validation
 */

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const config = {
  // Server Configuration
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  
  // Backend Configuration
  dataBackendPrimary: process.env.DATA_BACKEND_PRIMARY || 'supabase',
  dualWrite: process.env.DUAL_WRITE === 'true',
  
  // CORS Configuration
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:19006'],
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    projectId: process.env.OPENAI_PROJECT_ID,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  },
    
  // Logging Configuration
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Rate Limiting
  rateLimit: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute per user
  },
};

// Validation
function validateConfig() {
  const errors = [];
  const warnings = [];
  
  if (!config.supabase.url || config.supabase.url.includes('your-supabase')) {
    warnings.push('SUPABASE_URL not configured - using development mode');
  }
  
  if (!config.supabase.serviceRoleKey || config.supabase.serviceRoleKey.includes('your-supabase')) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY not configured - using development mode');
  }
  
  if (!config.supabase.anonKey || config.supabase.anonKey.includes('your-supabase')) {
    warnings.push('SUPABASE_ANON_KEY not configured - JWT auth will be disabled');
  }
  
  if (config.dataBackendPrimary !== 'supabase') {
    errors.push('DATA_BACKEND_PRIMARY must be "supabase" for Phase 1.5');
  }
  
  return { errors, warnings };
}

module.exports = {
  config,
  validateConfig,
};