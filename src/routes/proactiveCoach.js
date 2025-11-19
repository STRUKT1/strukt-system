/**
 * Proactive Coach endpoints
 * Dynamic AI-powered dashboard and planning features
 */

const express = require('express');
const { authenticateJWT } = require('../lib/auth');
const { getUserProfile } = require('../services/userProfiles');
const { getUserWeightLogs } = require('../services/logs/weight');
const { generateInitialPlans, generateDailyFocus, generateWeeklyReview } = require('../services/aiExtensions');
const { supabaseAdmin } = require('../lib/supabaseServer');
const logger = require('../lib/logger');
const { createPlanGenerationLimiter } = require('../lib/rateLimit');

const router = express.Router();
const planLimiter = createPlanGenerationLimiter();

/**
 * POST /v1/plans/generate
 * Generate initial workout and nutrition plans based on user profile
 */
router.post('/v1/plans/generate', authenticateJWT, planLimiter, async (req, res) => {
  try {
    logger.info('Plan generation requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    // Fetch complete user profile
    const profile = await getUserProfile(req.userId);
    
    if (!profile) {
      return res.status(404).json({
        ok: false,
        code: 'ERR_PROFILE_NOT_FOUND',
        message: 'User profile not found',
      });
    }
    
    // Generate plans using AI
    const plans = await generateInitialPlans(profile);
    
    // Store plans in user profile (as JSONB fields or separate table)
    // For now, we'll return them - storage can be implemented based on schema
    
    logger.info('Plans generated successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    res.json({
      ok: true,
      data: plans,
    });
    
  } catch (error) {
    logger.error('Plan generation failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_PLAN_GENERATION_FAILED',
      message: 'Failed to generate plans',
    });
  }
});

/**
 * GET /v1/dashboard/today-focus
 * Get personalized daily focus point
 */
router.get('/v1/dashboard/today-focus', authenticateJWT, async (req, res) => {
  try {
    logger.info('Daily focus requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    // Fetch user profile
    const profile = await getUserProfile(req.userId);
    
    if (!profile) {
      return res.status(404).json({
        ok: false,
        code: 'ERR_PROFILE_NOT_FOUND',
        message: 'User profile not found',
      });
    }
    
    // Fetch recent activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentActivity = {};
    
    // Get recent sleep
    const { data: sleepData } = await supabaseAdmin
      .from('sleep_logs')
      .select('*')
      .eq('user_id', req.userId)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (sleepData && sleepData.length > 0) {
      const sleep = sleepData[0];
      recentActivity.sleep = `${sleep.duration_minutes ? Math.round(sleep.duration_minutes / 60) + ' hours' : 'not recorded'}, quality: ${sleep.quality || 'not rated'}`;
    }
    
    // Get recent mood
    const { data: moodData } = await supabaseAdmin
      .from('mood_logs')
      .select('*')
      .eq('user_id', req.userId)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (moodData && moodData.length > 0) {
      const mood = moodData[0];
      recentActivity.mood = `score ${mood.mood_score || 'not rated'}/10, stress ${mood.stress_level || 'not rated'}/10`;
    }
    
    // Get last workout
    const { data: workoutData } = await supabaseAdmin
      .from('workouts')
      .select('*')
      .eq('user_id', req.userId)
      .order('date', { ascending: false })
      .limit(1);
    
    if (workoutData && workoutData.length > 0) {
      const workout = workoutData[0];
      recentActivity.lastWorkout = `${workout.type || 'workout'} ${workout.duration_minutes ? workout.duration_minutes + ' min' : ''}`;
    }
    
    // Generate daily focus
    const focusText = await generateDailyFocus(profile, recentActivity);
    
    logger.info('Daily focus generated', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    res.json({
      ok: true,
      data: {
        focus: focusText,
        generatedAt: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    logger.error('Daily focus generation failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_FOCUS_GENERATION_FAILED',
      message: 'Failed to generate daily focus',
    });
  }
});

/**
 * GET /v1/dashboard/weekly-review
 * Get weekly progress summary and insights
 */
router.get('/v1/dashboard/weekly-review', authenticateJWT, async (req, res) => {
  try {
    logger.info('Weekly review requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    // Fetch user profile
    const profile = await getUserProfile(req.userId);
    
    if (!profile) {
      return res.status(404).json({
        ok: false,
        code: 'ERR_PROFILE_NOT_FOUND',
        message: 'User profile not found',
      });
    }
    
    // Fetch logs from past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyLogs = {};
    
    // Get workouts
    const { data: workouts } = await supabaseAdmin
      .from('workouts')
      .select('*')
      .eq('user_id', req.userId)
      .gte('created_at', sevenDaysAgo.toISOString());
    
    weeklyLogs.workouts = workouts || [];
    
    // Get meals
    const { data: meals } = await supabaseAdmin
      .from('meals')
      .select('*')
      .eq('user_id', req.userId)
      .gte('created_at', sevenDaysAgo.toISOString());
    
    weeklyLogs.meals = meals || [];
    
    // Get sleep logs
    const { data: sleepLogs } = await supabaseAdmin
      .from('sleep_logs')
      .select('*')
      .eq('user_id', req.userId)
      .gte('created_at', sevenDaysAgo.toISOString());
    
    // Calculate avg sleep quality
    if (sleepLogs && sleepLogs.length > 0) {
      const qualities = sleepLogs.map(s => s.quality).filter(Boolean);
      weeklyLogs.avgSleepQuality = qualities.length > 0 ? qualities.join(', ') : 'Not tracked';
    }
    
    // Get mood logs
    const { data: moodLogs } = await supabaseAdmin
      .from('mood_logs')
      .select('*')
      .eq('user_id', req.userId)
      .gte('created_at', sevenDaysAgo.toISOString());
    
    // Calculate mood trend
    if (moodLogs && moodLogs.length > 0) {
      const avgMood = moodLogs.reduce((sum, m) => sum + (m.mood_score || 0), 0) / moodLogs.length;
      weeklyLogs.moodTrend = avgMood > 7 ? 'positive' : avgMood > 5 ? 'stable' : 'needs attention';
    }
    
    // Generate weekly review
    const reviewText = await generateWeeklyReview(profile, weeklyLogs);
    
    logger.info('Weekly review generated', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    res.json({
      ok: true,
      data: {
        review: reviewText,
        stats: {
          workouts: weeklyLogs.workouts.length,
          meals: weeklyLogs.meals.length,
          avgSleepQuality: weeklyLogs.avgSleepQuality,
          moodTrend: weeklyLogs.moodTrend,
        },
        generatedAt: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    logger.error('Weekly review generation failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_REVIEW_GENERATION_FAILED',
      message: 'Failed to generate weekly review',
    });
  }
});

/**
 * GET /v1/dashboard/weight-graph
 * Get weight tracking data for graph rendering
 */
router.get('/v1/dashboard/weight-graph', authenticateJWT, async (req, res) => {
  try {
    logger.info('Weight graph data requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
    });
    
    const weightLogs = await getUserWeightLogs(req.userId);
    
    res.json({
      ok: true,
      data: weightLogs,
    });
    
  } catch (error) {
    logger.error('Weight graph data retrieval failed', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });
    
    res.status(500).json({
      ok: false,
      code: 'ERR_WEIGHT_DATA_FAILED',
      message: 'Failed to retrieve weight data',
    });
  }
});

module.exports = router;
