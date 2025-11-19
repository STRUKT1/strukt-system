/**
 * Nutrition Database Service
 * Retrieves nutrition data from USDA FoodData Central API
 * Falls back to GPT-4 estimation when API data unavailable
 */

const { OpenAI } = require('openai');
const logger = require('../lib/logger');

// Initialize OpenAI client for fallback estimation
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      project: process.env.OPENAI_PROJECT_ID || undefined,
    });
  }
} catch (error) {
  logger.warn('OpenAI client initialization failed', { error: error.message });
}

// USDA API Configuration
const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';

/**
 * Search USDA FoodData Central for a food item
 * @param {string} foodName - Name of the food to search
 * @returns {Promise<Object|null>} USDA food data or null if not found
 */
async function searchUSDA(foodName) {
  if (!USDA_API_KEY) {
    logger.warn('USDA API key not configured, skipping USDA search');
    return null;
  }

  try {
    const searchUrl = `${USDA_API_BASE}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(foodName)}&pageSize=1&dataType=Survey (FNDDS)`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
      logger.warn('USDA API request failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = await response.json();

    if (!data.foods || data.foods.length === 0) {
      logger.info('No USDA results found', { foodName });
      return null;
    }

    // Return the first (best) match
    const food = data.foods[0];

    logger.info('USDA food found', {
      foodName,
      usdaDescription: food.description,
      fdcId: food.fdcId,
    });

    return food;
  } catch (error) {
    logger.error('USDA API search failed', {
      foodName,
      error: error.message,
    });
    return null;
  }
}

/**
 * Extract nutrition data from USDA food item
 * @param {Object} usdaFood - USDA food data
 * @param {string} amount - Portion size (e.g., "150g", "1 cup")
 * @returns {Object} Nutrition data
 */
function extractUSDANutrition(usdaFood, amount) {
  // USDA nutrition is per 100g
  const nutrients = usdaFood.foodNutrients || [];

  // Map USDA nutrient IDs to our fields
  const nutrientMap = {
    1008: 'calories', // Energy (kcal)
    1003: 'protein',  // Protein (g)
    1005: 'carbs',    // Carbohydrate (g)
    1004: 'fat',      // Total lipid (fat) (g)
    1079: 'fiber',    // Fiber, total dietary (g)
  };

  const nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  // Extract nutrient values
  nutrients.forEach(nutrient => {
    const field = nutrientMap[nutrient.nutrientId];
    if (field && nutrient.value !== undefined) {
      nutrition[field] = nutrient.value;
    }
  });

  // Scale nutrition based on portion size
  const multiplier = parsePortionMultiplier(amount);

  return {
    calories: Math.round(nutrition.calories * multiplier),
    protein: Math.round(nutrition.protein * multiplier * 10) / 10,
    carbs: Math.round(nutrition.carbs * multiplier * 10) / 10,
    fat: Math.round(nutrition.fat * multiplier * 10) / 10,
    fiber: Math.round(nutrition.fiber * multiplier * 10) / 10,
  };
}

/**
 * Parse portion size and calculate multiplier (assumes USDA data is per 100g)
 * @param {string} amount - Portion size string (e.g., "150g", "1 cup", "2 slices")
 * @returns {number} Multiplier for 100g base
 */
function parsePortionMultiplier(amount) {
  if (!amount) return 1.0;

  const lower = amount.toLowerCase();

  // Extract numeric value
  const numMatch = lower.match(/(\d+(?:\.\d+)?)/);
  const num = numMatch ? parseFloat(numMatch[1]) : 1;

  // Grams - direct conversion
  if (lower.includes('g') && !lower.includes('kg')) {
    return num / 100;
  }

  // Kilograms
  if (lower.includes('kg')) {
    return (num * 1000) / 100;
  }

  // Common portion sizes (approximate grams)
  const portionSizes = {
    'cup': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tsp': 5,
    'teaspoon': 5,
    'oz': 28,
    'ounce': 28,
    'lb': 454,
    'pound': 454,
    'slice': 30,
    'piece': 100,
    'serving': 100,
    'scoop': 30,
    'medium': 150,
    'large': 200,
    'small': 100,
  };

  for (const [unit, grams] of Object.entries(portionSizes)) {
    if (lower.includes(unit)) {
      return (num * grams) / 100;
    }
  }

  // Default to 1x (100g) if we can't parse
  return 1.0;
}

/**
 * Estimate nutrition using GPT-4 when USDA data unavailable
 * @param {string} foodName - Name of the food
 * @param {string} amount - Portion size
 * @returns {Promise<Object>} Estimated nutrition data
 */
async function estimateNutritionGPT4(foodName, amount) {
  if (!openai) {
    logger.warn('OpenAI not configured, cannot estimate nutrition');
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      estimated: true,
      error: true,
    };
  }

  try {
    const prompt = `Estimate the nutrition information for: ${amount} of ${foodName}

Provide your response ONLY as a JSON object with these exact fields:
{
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "fiber": <number in grams>
}

Be accurate and use your knowledge of nutrition. For example:
- 150g chicken breast, grilled: {"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0}
- 1 cup cooked white rice: {"calories": 205, "protein": 4.2, "carbs": 45, "fat": 0.4, "fiber": 0.6}
- 2 large eggs: {"calories": 143, "protein": 12.6, "carbs": 0.7, "fat": 9.5, "fiber": 0}

Only respond with the JSON object, nothing else.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a nutrition expert. Provide accurate nutrition estimates in JSON format only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const response = completion.choices[0].message.content.trim();

    // Parse JSON response
    const nutrition = JSON.parse(response);

    logger.info('GPT-4 nutrition estimation successful', {
      foodName,
      amount,
      calories: nutrition.calories,
    });

    return {
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein * 10) / 10,
      carbs: Math.round(nutrition.carbs * 10) / 10,
      fat: Math.round(nutrition.fat * 10) / 10,
      fiber: Math.round(nutrition.fiber * 10) / 10,
      estimated: true,
      source: 'gpt4',
    };
  } catch (error) {
    logger.error('GPT-4 nutrition estimation failed', {
      foodName,
      amount,
      error: error.message,
    });

    // Return safe defaults
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      estimated: true,
      error: true,
    };
  }
}

/**
 * Get nutrition data for a food item
 * Tries USDA API first, falls back to GPT-4 estimation
 * @param {string} foodName - Name of the food
 * @param {string} amount - Portion size
 * @returns {Promise<Object>} Nutrition data
 */
async function getNutritionData(foodName, amount) {
  try {
    logger.info('Looking up nutrition data', { foodName, amount });

    // Try USDA API first
    const usdaFood = await searchUSDA(foodName);

    if (usdaFood) {
      const nutrition = extractUSDANutrition(usdaFood, amount);

      return {
        food: foodName,
        amount,
        ...nutrition,
        estimated: false,
        source: 'usda',
      };
    }

    // Fallback to GPT-4 estimation
    logger.info('USDA lookup failed, using GPT-4 estimation', { foodName });
    const estimated = await estimateNutritionGPT4(foodName, amount);

    return {
      food: foodName,
      amount,
      ...estimated,
    };
  } catch (error) {
    logger.error('Nutrition lookup failed completely', {
      foodName,
      amount,
      error: error.message,
    });

    // Return safe defaults with error flag
    return {
      food: foodName,
      amount,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      estimated: true,
      error: true,
      source: 'error',
    };
  }
}

/**
 * Get nutrition data for multiple food items
 * @param {Array<Object>} foods - Array of {name, amount} objects
 * @returns {Promise<Array<Object>>} Array of nutrition data
 */
async function getNutritionForFoods(foods) {
  if (!Array.isArray(foods)) {
    throw new Error('Foods must be an array');
  }

  // Process all foods in parallel for speed
  const nutritionPromises = foods.map(food =>
    getNutritionData(food.name, food.amount)
  );

  const nutritionResults = await Promise.all(nutritionPromises);

  // Add estimated flag from original food items
  return nutritionResults.map((nutrition, index) => ({
    ...nutrition,
    portionEstimated: foods[index].estimated || false,
  }));
}

/**
 * Calculate totals from multiple food items
 * @param {Array<Object>} foods - Array of food items with nutrition
 * @returns {Object} Total nutrition
 */
function calculateTotals(foods) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  foods.forEach(food => {
    totals.calories += food.calories || 0;
    totals.protein += food.protein || 0;
    totals.carbs += food.carbs || 0;
    totals.fat += food.fat || 0;
    totals.fiber += food.fiber || 0;
  });

  // Round totals
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
  };
}

module.exports = {
  getNutritionData,
  getNutritionForFoods,
  calculateTotals,
  searchUSDA,
  estimateNutritionGPT4,
};
