/**
 * Data Export Service
 *
 * Handles Subject Access Requests (SAR) for GDPR Article 15 compliance.
 * Exports ALL user data in structured JSON format.
 */

const { supabaseAdmin } = require('../lib/supabaseServer');
const logger = require('../lib/logger');

/**
 * Export all user data for SAR (Subject Access Request)
 * GDPR Article 15 - Right of Access
 *
 * @param {string} userId - User ID to export data for
 * @returns {Promise<Object>} Complete user data export
 */
async function exportUserData(userId) {
  if (!userId) {
    throw new Error('User ID is required for data export');
  }

  logger.info('SAR data export requested', {
    userIdMasked: logger.maskUserId(userId),
    operation: 'sar-export',
    timestamp: new Date().toISOString(),
  });

  try {
    const exportData = {
      export_info: {
        export_date: new Date().toISOString(),
        format: 'JSON',
        gdpr_article: 'Article 15 - Right of Access',
        user_id: userId,
      },
      profile: null,
      workouts: [],
      meals: [],
      sleep_logs: [],
      mood_logs: [],
      supplements: [],
      weight_logs: [],
      photos: [],
      chat_history: [],
      ai_coach_logs: [],
      plans: [],
      templates: [],
      consents: [],
    };

    // 1. Export user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      logger.error('Error exporting user profile', {
        userId: logger.maskUserId(userId),
        error: profileError.message,
      });
    } else {
      exportData.profile = profile;
    }

    // 2. Export workouts
    const { data: workouts, error: workoutsError } = await supabaseAdmin
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (workoutsError) {
      logger.error('Error exporting workouts', {
        userId: logger.maskUserId(userId),
        error: workoutsError.message,
      });
    } else {
      exportData.workouts = workouts || [];
    }

    // 3. Export meals
    const { data: meals, error: mealsError } = await supabaseAdmin
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (mealsError) {
      logger.error('Error exporting meals', {
        userId: logger.maskUserId(userId),
        error: mealsError.message,
      });
    } else {
      exportData.meals = meals || [];
    }

    // 4. Export sleep logs
    const { data: sleepLogs, error: sleepError } = await supabaseAdmin
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sleepError) {
      logger.error('Error exporting sleep logs', {
        userId: logger.maskUserId(userId),
        error: sleepError.message,
      });
    } else {
      exportData.sleep_logs = sleepLogs || [];
    }

    // 5. Export mood logs
    const { data: moodLogs, error: moodError } = await supabaseAdmin
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (moodError) {
      logger.error('Error exporting mood logs', {
        userId: logger.maskUserId(userId),
        error: moodError.message,
      });
    } else {
      exportData.mood_logs = moodLogs || [];
    }

    // 6. Export supplements
    const { data: supplements, error: supplementsError } = await supabaseAdmin
      .from('supplements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (supplementsError) {
      logger.error('Error exporting supplements', {
        userId: logger.maskUserId(userId),
        error: supplementsError.message,
      });
    } else {
      exportData.supplements = supplements || [];
    }

    // 7. Export weight logs (if table exists)
    try {
      const { data: weightLogs, error: weightError } = await supabaseAdmin
        .from('weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!weightError) {
        exportData.weight_logs = weightLogs || [];
      }
    } catch (e) {
      // Table might not exist
      logger.warn('Weight logs table not found', { userId: logger.maskUserId(userId) });
    }

    // 8. Export photos (metadata only, not actual files)
    const { data: photos, error: photosError } = await supabaseAdmin
      .from('photos')
      .select('id, user_id, photo_type, created_at, notes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (photosError) {
      logger.error('Error exporting photos', {
        userId: logger.maskUserId(userId),
        error: photosError.message,
      });
    } else {
      exportData.photos = photos || [];
    }

    // 9. Export chat interactions
    const { data: chatHistory, error: chatError } = await supabaseAdmin
      .from('chat_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (chatError) {
      logger.error('Error exporting chat history', {
        userId: logger.maskUserId(userId),
        error: chatError.message,
      });
    } else {
      exportData.chat_history = chatHistory || [];
    }

    // 10. Export AI coach logs
    const { data: aiLogs, error: aiError } = await supabaseAdmin
      .from('ai_coach_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (aiError) {
      logger.error('Error exporting AI coach logs', {
        userId: logger.maskUserId(userId),
        error: aiError.message,
      });
    } else {
      exportData.ai_coach_logs = aiLogs || [];
    }

    // 11. Export plans
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false });

    if (plansError) {
      logger.error('Error exporting plans', {
        userId: logger.maskUserId(userId),
        error: plansError.message,
      });
    } else {
      exportData.plans = plans || [];
    }

    // 12. Export templates
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (templatesError) {
      logger.error('Error exporting templates', {
        userId: logger.maskUserId(userId),
        error: templatesError.message,
      });
    } else {
      exportData.templates = templates || [];
    }

    // 13. Export user consents
    const { data: consents, error: consentsError } = await supabaseAdmin
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false });

    if (consentsError) {
      logger.error('Error exporting consents', {
        userId: logger.maskUserId(userId),
        error: consentsError.message,
      });
    } else {
      exportData.consents = consents || [];
    }

    // Log successful export
    logger.info('SAR data export completed', {
      userIdMasked: logger.maskUserId(userId),
      operation: 'sar-export',
      recordCounts: {
        workouts: exportData.workouts.length,
        meals: exportData.meals.length,
        sleep_logs: exportData.sleep_logs.length,
        mood_logs: exportData.mood_logs.length,
        supplements: exportData.supplements.length,
        photos: exportData.photos.length,
        chat_history: exportData.chat_history.length,
        ai_coach_logs: exportData.ai_coach_logs.length,
        plans: exportData.plans.length,
        templates: exportData.templates.length,
        consents: exportData.consents.length,
      },
    });

    return exportData;

  } catch (error) {
    logger.error('SAR data export failed', {
      userIdMasked: logger.maskUserId(userId),
      operation: 'sar-export',
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = {
  exportUserData,
};
