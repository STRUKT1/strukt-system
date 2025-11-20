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

/**
 * Permanently delete all user data
 * GDPR Article 17 - Right to Erasure ("Right to be Forgotten")
 *
 * WARNING: This is PERMANENT and IRREVERSIBLE!
 *
 * @param {string} userId - User ID to delete
 * @returns {Promise<Object>} Deletion result with counts
 */
async function deleteUserData(userId) {
  if (!userId) {
    throw new Error('User ID is required for data deletion');
  }

  logger.warn('ACCOUNT DELETION INITIATED', {
    userIdMasked: logger.maskUserId(userId),
    operation: 'account-deletion',
    timestamp: new Date().toISOString(),
    WARNING: 'PERMANENT_DELETION',
  });

  const deletionResult = {
    user_id: userId,
    deletion_timestamp: new Date().toISOString(),
    gdpr_article: 'Article 17 - Right to Erasure',
    deletion_counts: {},
    errors: [],
  };

  try {
    // CRITICAL: Delete in reverse dependency order to avoid foreign key violations

    // 1. Delete AI coach logs
    const { count: aiLogsCount, error: aiLogsError } = await supabaseAdmin
      .from('ai_coach_logs')
      .delete()
      .eq('user_id', userId);

    if (aiLogsError) {
      logger.error('Error deleting AI coach logs', {
        userId: logger.maskUserId(userId),
        error: aiLogsError.message,
      });
      deletionResult.errors.push({ table: 'ai_coach_logs', error: aiLogsError.message });
    } else {
      deletionResult.deletion_counts.ai_coach_logs = aiLogsCount || 0;
    }

    // 2. Delete log embeddings (AI memory)
    const { count: embeddingsCount, error: embeddingsError } = await supabaseAdmin
      .from('log_embeddings')
      .delete()
      .eq('user_id', userId);

    if (embeddingsError) {
      logger.error('Error deleting log embeddings', {
        userId: logger.maskUserId(userId),
        error: embeddingsError.message,
      });
      deletionResult.errors.push({ table: 'log_embeddings', error: embeddingsError.message });
    } else {
      deletionResult.deletion_counts.log_embeddings = embeddingsCount || 0;
    }

    // 3. Delete chat interactions
    const { count: chatCount, error: chatError } = await supabaseAdmin
      .from('chat_interactions')
      .delete()
      .eq('user_id', userId);

    if (chatError) {
      logger.error('Error deleting chat interactions', {
        userId: logger.maskUserId(userId),
        error: chatError.message,
      });
      deletionResult.errors.push({ table: 'chat_interactions', error: chatError.message });
    } else {
      deletionResult.deletion_counts.chat_interactions = chatCount || 0;
    }

    // 4. Delete workouts
    const { count: workoutsCount, error: workoutsError } = await supabaseAdmin
      .from('workouts')
      .delete()
      .eq('user_id', userId);

    if (workoutsError) {
      logger.error('Error deleting workouts', {
        userId: logger.maskUserId(userId),
        error: workoutsError.message,
      });
      deletionResult.errors.push({ table: 'workouts', error: workoutsError.message });
    } else {
      deletionResult.deletion_counts.workouts = workoutsCount || 0;
    }

    // 5. Delete meals
    const { count: mealsCount, error: mealsError } = await supabaseAdmin
      .from('meals')
      .delete()
      .eq('user_id', userId);

    if (mealsError) {
      logger.error('Error deleting meals', {
        userId: logger.maskUserId(userId),
        error: mealsError.message,
      });
      deletionResult.errors.push({ table: 'meals', error: mealsError.message });
    } else {
      deletionResult.deletion_counts.meals = mealsCount || 0;
    }

    // 6. Delete sleep logs
    const { count: sleepCount, error: sleepError } = await supabaseAdmin
      .from('sleep_logs')
      .delete()
      .eq('user_id', userId);

    if (sleepError) {
      logger.error('Error deleting sleep logs', {
        userId: logger.maskUserId(userId),
        error: sleepError.message,
      });
      deletionResult.errors.push({ table: 'sleep_logs', error: sleepError.message });
    } else {
      deletionResult.deletion_counts.sleep_logs = sleepCount || 0;
    }

    // 7. Delete mood logs
    const { count: moodCount, error: moodError } = await supabaseAdmin
      .from('mood_logs')
      .delete()
      .eq('user_id', userId);

    if (moodError) {
      logger.error('Error deleting mood logs', {
        userId: logger.maskUserId(userId),
        error: moodError.message,
      });
      deletionResult.errors.push({ table: 'mood_logs', error: moodError.message });
    } else {
      deletionResult.deletion_counts.mood_logs = moodCount || 0;
    }

    // 8. Delete supplements
    const { count: supplementsCount, error: supplementsError } = await supabaseAdmin
      .from('supplements')
      .delete()
      .eq('user_id', userId);

    if (supplementsError) {
      logger.error('Error deleting supplements', {
        userId: logger.maskUserId(userId),
        error: supplementsError.message,
      });
      deletionResult.errors.push({ table: 'supplements', error: supplementsError.message });
    } else {
      deletionResult.deletion_counts.supplements = supplementsCount || 0;
    }

    // 9. Delete weight logs (if exists)
    try {
      const { count: weightCount, error: weightError } = await supabaseAdmin
        .from('weight_logs')
        .delete()
        .eq('user_id', userId);

      if (!weightError) {
        deletionResult.deletion_counts.weight_logs = weightCount || 0;
      }
    } catch (e) {
      logger.warn('Weight logs table not found', { userId: logger.maskUserId(userId) });
    }

    // 10. Delete photos (metadata - actual files would need separate cleanup)
    const { count: photosCount, error: photosError } = await supabaseAdmin
      .from('photos')
      .delete()
      .eq('user_id', userId);

    if (photosError) {
      logger.error('Error deleting photos', {
        userId: logger.maskUserId(userId),
        error: photosError.message,
      });
      deletionResult.errors.push({ table: 'photos', error: photosError.message });
    } else {
      deletionResult.deletion_counts.photos = photosCount || 0;
    }

    // 11. Delete plans
    const { count: plansCount, error: plansError } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('user_id', userId);

    if (plansError) {
      logger.error('Error deleting plans', {
        userId: logger.maskUserId(userId),
        error: plansError.message,
      });
      deletionResult.errors.push({ table: 'plans', error: plansError.message });
    } else {
      deletionResult.deletion_counts.plans = plansCount || 0;
    }

    // 12. Delete templates
    const { count: templatesCount, error: templatesError } = await supabaseAdmin
      .from('templates')
      .delete()
      .eq('user_id', userId);

    if (templatesError) {
      logger.error('Error deleting templates', {
        userId: logger.maskUserId(userId),
        error: templatesError.message,
      });
      deletionResult.errors.push({ table: 'templates', error: templatesError.message });
    } else {
      deletionResult.deletion_counts.templates = templatesCount || 0;
    }

    // 13. Delete user consents
    const { count: consentsCount, error: consentsError } = await supabaseAdmin
      .from('user_consents')
      .delete()
      .eq('user_id', userId);

    if (consentsError) {
      logger.error('Error deleting user consents', {
        userId: logger.maskUserId(userId),
        error: consentsError.message,
      });
      deletionResult.errors.push({ table: 'user_consents', error: consentsError.message });
    } else {
      deletionResult.deletion_counts.user_consents = consentsCount || 0;
    }

    // 14. Delete user profile (LAST - this is the main record)
    const { count: profileCount, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      logger.error('Error deleting user profile', {
        userId: logger.maskUserId(userId),
        error: profileError.message,
      });
      deletionResult.errors.push({ table: 'user_profiles', error: profileError.message });
    } else {
      deletionResult.deletion_counts.user_profiles = profileCount || 0;
    }

    // 15. Delete from auth.users (Supabase Auth) - FINAL STEP
    // NOTE: This requires admin API access
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      logger.error('Error deleting auth user', {
        userId: logger.maskUserId(userId),
        error: authError.message,
      });
      deletionResult.errors.push({ table: 'auth.users', error: authError.message });
    } else {
      deletionResult.deletion_counts.auth_user = 1;
    }

    // Log successful deletion
    logger.warn('ACCOUNT DELETION COMPLETED', {
      userIdMasked: logger.maskUserId(userId),
      operation: 'account-deletion',
      deletion_counts: deletionResult.deletion_counts,
      errors_count: deletionResult.errors.length,
      PERMANENT: true,
    });

    return deletionResult;

  } catch (error) {
    logger.error('ACCOUNT DELETION FAILED', {
      userIdMasked: logger.maskUserId(userId),
      operation: 'account-deletion',
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = {
  exportUserData,
  deleteUserData,
};
