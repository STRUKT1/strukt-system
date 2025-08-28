/**
 * Nutrition Service
 * 
 * Handles nutrition summary and aggregation operations in Supabase.
 */

const { supabaseAdmin } = require('../lib/supabaseServer');
const { getUserProfile } = require('./userProfiles');

/**
 * Get nutrition summary for a user with timezone support
 * @param {string} userId - Auth user ID (UUID)
 * @param {string} range - 'today' or '7d'
 * @param {string} timezone - IANA timezone string (e.g., 'Europe/London')
 * @returns {Promise<Object>} Nutrition summary with totals, byDay, and targets
 */
async function getNutritionSummary(userId, range = 'today', timezone = 'UTC') {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  if (!['today', '7d'].includes(range)) {
    throw new Error('Range must be "today" or "7d"');
  }

  try {
    // Get meals data based on range
    let mealsData;
    
    if (range === 'today') {
      mealsData = await getTodayNutrition(userId, timezone);
    } else {
      mealsData = await getSevenDayNutrition(userId, timezone);
    }

    // Get user's nutrition targets
    const profile = await getUserProfile(userId);
    const targets = extractNutritionTargets(profile);

    // Calculate totals
    const totals = calculateTotals(mealsData);

    return {
      totals,
      byDay: mealsData,
      targets,
    };
  } catch (error) {
    console.error('Error getting nutrition summary:', error);
    throw error;
  }
}

/**
 * Get today's nutrition with timezone support
 */
async function getTodayNutrition(userId, timezone) {
  const { data, error } = await supabaseAdmin.rpc('get_today_nutrition', {
    user_id_param: userId,
    timezone_param: timezone,
  });

  if (error) {
    // Fallback to direct query if RPC doesn't exist
    console.warn('RPC function not found, using direct query:', error.message);
    return await getTodayNutritionDirect(userId, timezone);
  }

  return data || [];
}

/**
 * Direct SQL query for today's nutrition (fallback)
 */
async function getTodayNutritionDirect(userId, timezone) {
  const query = `
    select
      date_trunc('day', timezone($2, m.date)) as date,
      coalesce(sum(m.calories),0) as kcal,
      coalesce(sum((m.macros->>'protein')::numeric),0) as protein,
      coalesce(sum((m.macros->>'carbs')::numeric),0) as carbs,
      coalesce(sum((m.macros->>'fat')::numeric),0) as fat,
      coalesce(sum((m.macros->>'fiber')::numeric),0) as fiber
    from meals m
    where m.user_id = $1
      and date_trunc('day', timezone($2, m.date)) = date_trunc('day', timezone($2, now()))
    group by 1
  `;

  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    sql_query: query,
    params: [userId, timezone],
  });

  if (error) {
    // Final fallback using Supabase client query
    const { data: mealsData, error: mealsError } = await supabaseAdmin
      .from('meals')
      .select('date, calories, macros')
      .eq('user_id', userId)
      .gte('date', new Date().toISOString().split('T')[0])
      .lte('date', new Date().toISOString().split('T')[0]);

    if (mealsError) {
      throw mealsError;
    }

    return aggregateMealsData(mealsData, 'today');
  }

  return data;
}

/**
 * Get 7-day nutrition with timezone support
 */
async function getSevenDayNutrition(userId, timezone) {
  const { data, error } = await supabaseAdmin.rpc('get_seven_day_nutrition', {
    user_id_param: userId,
    timezone_param: timezone,
  });

  if (error) {
    // Fallback to direct query if RPC doesn't exist
    console.warn('RPC function not found, using direct query:', error.message);
    return await getSevenDayNutritionDirect(userId, timezone);
  }

  return data || [];
}

/**
 * Direct SQL query for 7-day nutrition (fallback)
 */
async function getSevenDayNutritionDirect(userId, timezone) {
  // Calculate date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startDate = sevenDaysAgo.toISOString().split('T')[0];

  const { data: mealsData, error } = await supabaseAdmin
    .from('meals')
    .select('date, calories, macros')
    .eq('user_id', userId)
    .gte('date', startDate)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return aggregateMealsData(mealsData, '7d');
}

/**
 * Aggregate meals data by day
 */
function aggregateMealsData(mealsData, range) {
  const dayMap = new Map();

  for (const meal of mealsData) {
    const date = meal.date;
    
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        date,
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      });
    }

    const day = dayMap.get(date);
    day.kcal += meal.calories || 0;
    
    if (meal.macros) {
      day.protein += parseFloat(meal.macros.protein || 0);
      day.carbs += parseFloat(meal.macros.carbs || 0);
      day.fat += parseFloat(meal.macros.fat || 0);
      day.fiber += parseFloat(meal.macros.fiber || 0);
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Calculate totals from daily data
 */
function calculateTotals(byDayData) {
  const totals = {
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  for (const day of byDayData) {
    totals.kcal += day.kcal || 0;
    totals.protein += day.protein || 0;
    totals.carbs += day.carbs || 0;
    totals.fat += day.fat || 0;
    totals.fiber += day.fiber || 0;
  }

  return totals;
}

/**
 * Extract nutrition targets from user profile
 */
function extractNutritionTargets(profile) {
  if (!profile) {
    return null;
  }

  // Prefer nutrition_targets if available (full computed object)
  if (profile.nutrition_targets && typeof profile.nutrition_targets === 'object') {
    return {
      kcal: profile.nutrition_targets.kcal || null,
      protein_g: profile.nutrition_targets.protein_g || null,
      carbs_g: profile.nutrition_targets.carbs_g || null,
      fat_g: profile.nutrition_targets.fat_g || null,
      fiber_g: profile.nutrition_targets.fiber_g || null,
    };
  }

  // Fallback to daily_kcal_target + macro_targets
  const targets = {};
  
  if (profile.daily_kcal_target) {
    targets.kcal = profile.daily_kcal_target;
  }

  if (profile.macro_targets && typeof profile.macro_targets === 'object') {
    if (profile.macro_targets.protein_g) targets.protein_g = profile.macro_targets.protein_g;
    if (profile.macro_targets.carbs_g) targets.carbs_g = profile.macro_targets.carbs_g;
    if (profile.macro_targets.fat_g) targets.fat_g = profile.macro_targets.fat_g;
    if (profile.macro_targets.fiber_g) targets.fiber_g = profile.macro_targets.fiber_g;
  }

  return Object.keys(targets).length > 0 ? targets : null;
}

module.exports = {
  getNutritionSummary,
  getTodayNutrition,
  getSevenDayNutrition,
  extractNutritionTargets,
};