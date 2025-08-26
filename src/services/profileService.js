/**
 * Profile Service for v1 API
 * Wraps existing userProfiles service with v1 API patterns
 */

const { getProfile: getUserProfile, upsertProfile: upsertUserProfile } = require('./userProfiles');
const logger = require('../lib/logger');

/**
 * Get user profile by user ID
 */
async function getProfile(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  try {
    const profile = await getUserProfile(userId);
    return profile;
  } catch (error) {
    logger.error('Profile service get failed', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
    });
    throw error;
  }
}

/**
 * Upsert user profile
 */
async function upsertProfile(userId, profileData) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  if (!profileData || typeof profileData !== 'object') {
    throw new Error('Profile data is required');
  }
  
  try {
    const profile = await upsertUserProfile(userId, profileData);
    return profile;
  } catch (error) {
    logger.error('Profile service upsert failed', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
    });
    throw error;
  }
}

/**
 * Complete onboarding for user
 */
async function completeOnboarding(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  try {
    const profile = await upsertUserProfile(userId, { 
      onboarding_completed: true 
    });
    
    logger.info('Onboarding completed', {
      userIdMasked: logger.maskUserId(userId),
    });
    
    return profile;
  } catch (error) {
    logger.error('Onboarding completion failed', {
      userIdMasked: logger.maskUserId(userId),
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  getProfile,
  upsertProfile,
  completeOnboarding,
};