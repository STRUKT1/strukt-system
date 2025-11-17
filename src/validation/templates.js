/**
 * Template validation
 */

const validTypes = ['meal_breakfast', 'meal_lunch', 'meal_dinner', 'meal_snack', 'workout'];

function validateTemplate({ name, type, data }) {
  // Validate name
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Template name is required' };
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 3) {
    return { valid: false, error: 'Template name must be at least 3 characters' };
  }
  if (trimmedName.length > 50) {
    return { valid: false, error: 'Template name must not exceed 50 characters' };
  }

  // Validate type
  if (!type || !validTypes.includes(type)) {
    return { valid: false, error: 'Invalid template type' };
  }

  // Validate data
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Template data is required' };
  }

  // Validate meal template data
  if (type.startsWith('meal_')) {
    if (!data.foods || !Array.isArray(data.foods) || data.foods.length === 0) {
      return { valid: false, error: 'Meal template must include at least one food' };
    }

    if (!data.totals || typeof data.totals !== 'object') {
      return { valid: false, error: 'Meal template must include nutrition totals' };
    }

    // Validate each food item
    for (const food of data.foods) {
      if (!food.name || typeof food.name !== 'string') {
        return { valid: false, error: 'Each food must have a name' };
      }
      if (!food.amount || typeof food.amount !== 'string') {
        return { valid: false, error: 'Each food must have an amount' };
      }
      if (typeof food.calories !== 'number' || food.calories < 0) {
        return { valid: false, error: 'Each food must have valid calories' };
      }
    }

    // Validate totals
    if (typeof data.totals.calories !== 'number' || data.totals.calories < 0) {
      return { valid: false, error: 'Template must have valid total calories' };
    }
  }

  // Validate workout template data
  if (type === 'workout') {
    if (!data.workout || typeof data.workout !== 'object') {
      return { valid: false, error: 'Workout template must include workout data' };
    }

    if (!data.workout.exercise || typeof data.workout.exercise !== 'string') {
      return { valid: false, error: 'Workout must include exercise type' };
    }

    if (typeof data.workout.duration !== 'number' || data.workout.duration <= 0) {
      return { valid: false, error: 'Workout must include valid duration' };
    }
  }

  return { valid: true };
}

function validateTemplateUpdate(updates) {
  // Name validation (if provided)
  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string') {
      return { valid: false, error: 'Template name must be a string' };
    }

    const trimmedName = updates.name.trim();
    if (trimmedName.length < 3) {
      return { valid: false, error: 'Template name must be at least 3 characters' };
    }
    if (trimmedName.length > 50) {
      return { valid: false, error: 'Template name must not exceed 50 characters' };
    }
  }

  // Data validation (if provided)
  if (updates.data !== undefined) {
    if (typeof updates.data !== 'object') {
      return { valid: false, error: 'Template data must be an object' };
    }
    // Additional data validation could go here
  }

  return { valid: true };
}

module.exports = {
  validateTemplate,
  validateTemplateUpdate
};
