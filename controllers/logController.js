// controllers/logController.js

const Joi = require('joi');
const {
  logMeal,
  logWorkout,
  logSleep,
  logMood,
  logSupplement,
  logReflection,
} = require('../utils/logging');

// Schema for log entries.  Requires an email, a type, and a data object.
const logSchema = Joi.object({
  email: Joi.string().email().required(),
  type: Joi.string()
    .valid('meal', 'workout', 'sleep', 'mood', 'supplement', 'reflection')
    .required(),
  data: Joi.object().required(),
});

/**
 * Handles POST /log.  Dispatches to the appropriate logging function based
 * on the `type` field.  Returns 201 on success.
 */
async function logController(req, res, next) {
  try {
    const { value, error } = logSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    const { email, type, data } = value;
    switch (type) {
      case 'meal':
        await logMeal(email, data);
        break;
      case 'workout':
        await logWorkout(email, data);
        break;
      case 'sleep':
        await logSleep(email, data);
        break;
      case 'mood':
        await logMood(email, data);
        break;
      case 'supplement':
        await logSupplement(email, data);
        break;
      case 'reflection':
        await logReflection(email, data);
        break;
      default:
        // This should never happen due to validation but acts as a safety net
        return res.status(400).json({ success: false, message: 'Unknown log type' });
    }
    return res.status(201).json({ success: true, message: `${type} log added` });
  } catch (err) {
    next(err);
  }
}

module.exports = { logController };