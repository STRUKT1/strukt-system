/**
 * Auto-log Service for v1 API
 * Routes auto-log requests to appropriate service modules
 */

const { logWorkout } = require('./logs/workouts');
const { logMeal } = require('./logs/meals'); 
const { logSleep } = require('./logs/sleep');
const { logMood } = require('./logs/mood');
const logger = require('../lib/logger');

/**
 * Create auto-log entry based on kind
 */
async function createAutoLog(userId, autoLogData) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  if (!autoLogData || typeof autoLogData !== 'object') {
    throw new Error('Auto-log data is required');
  }
  
  const { kind, data, ts } = autoLogData;
  
  try {
    let result;
    const timestamp = ts || new Date().toISOString();
    
    switch (kind) {
      case 'meal':
        result = await logMeal(userId, { ...data, timestamp });
        break;
        
      case 'workout':
        result = await logWorkout(userId, { ...data, timestamp });
        break;
        
      case 'sleep':
        result = await logSleep(userId, { ...data, timestamp });
        break;
        
      case 'mood':
        result = await logMood(userId, { ...data, timestamp });
        break;
        
      default:
        throw new Error(`Unsupported auto-log kind: ${kind}`);
    }
    
    logger.info('Auto-log created successfully', {
      userIdMasked: logger.maskUserId(userId),
      kind,
      id: result.id,
    });
    
    return {
      id: result.id,
      kind,
      created_at: result.created_at || timestamp,
    };
  } catch (error) {
    logger.error('Auto-log service creation failed', {
      userIdMasked: logger.maskUserId(userId),
      kind,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  createAutoLog,
};