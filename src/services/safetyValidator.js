/**
 * Safety Validator Service
 *
 * Validates AI responses for unsafe health advice, medical recommendations,
 * or other potentially harmful content before returning to users.
 */

const logger = require('../lib/logger');

// Define safety rules as pattern-based checks
const SAFETY_RULES = [
  {
    pattern: /skip\s+(breakfast|lunch|dinner|meals?)/i,
    issue: 'Recommending to skip meals',
  },
  {
    pattern: /fast(ing)?\s+for\s+\d+\s+(hours?|days?)/i,
    issue: 'Suggesting extended fasting without medical supervision',
  },
  {
    pattern: /(take|start|stop|discontinue)\s+(medication|medicine|pills?|drugs?)/i,
    issue: 'Medication advice - should defer to healthcare provider',
  },
  {
    pattern: /(you\s+(might|may|could)\s+have|diagnos(e|is|ing)|sounds?\s+like\s+(you\s+have)?)\s*[a-z\s]*(disease|condition|disorder|syndrome|diabetes|cancer|heart\s+disease)/i,
    issue: 'Attempting to diagnose medical condition',
  },
  {
    pattern: /no\s+need\s+(to\s+)?(see|consult|visit)\s+(a\s+)?(doctor|physician|healthcare)/i,
    issue: 'Discouraging medical consultation',
  },
  {
    pattern: /(cure|heal|fix)\s+(your|the)\s+(injury|pain|condition)/i,
    issue: 'Claiming to cure medical conditions',
  },
  {
    pattern: /push\s+through\s+(the\s+)?(pain|injury)/i,
    issue: 'Encouraging exercising through pain or injury',
  },
  {
    pattern: /don'?t\s+(worry|bother)\s+about\s+(that\s+)?(injury|pain|condition)/i,
    issue: 'Dismissing user concerns about injury or pain',
  },
  {
    pattern: /(this|that)\s+supplement\s+(will|can)\s+(cure|fix|heal)/i,
    issue: 'Making medical claims about supplements',
  },
  {
    pattern: /stop\s+taking\s+your\s+(medication|medicine|prescription)/i,
    issue: 'Advising to stop prescribed medication',
  },
  {
    pattern: /(lose|drop)\s+\d+\s+(pounds?|lbs?|kg|kilos?)\s+(in|within)\s+\d+\s+(days?|weeks?)/i,
    issue: 'Promoting rapid/extreme weight loss',
  },
  {
    pattern: /(only|just)\s+eat\s+\d+\s+calories?/i,
    issue: 'Suggesting very low calorie intake',
  },
];

/**
 * Validate AI response for safety issues
 * 
 * @param {string} response - The AI-generated response text
 * @returns {Object} { safe: boolean, issues: Array<string> }
 */
function validateResponse(response) {
  if (!response || typeof response !== 'string') {
    return { safe: true, issues: [] };
  }

  const issues = [];

  // Check each safety rule
  for (const rule of SAFETY_RULES) {
    if (rule.pattern.test(response)) {
      issues.push(rule.issue);

      // Log the unsafe content with context
      const match = response.match(rule.pattern);
      if (match) {
        const excerpt = getExcerpt(response, match.index, 100);
        logger.warn('Safety validation issue detected', {
          issue: rule.issue,
          excerpt: excerpt.substring(0, 100), // Limit excerpt length for logs
        });
      }
    }
  }

  const safe = issues.length === 0;

  return { safe, issues };
}

/**
 * Get a text excerpt around a match position
 * 
 * @param {string} text - Full text
 * @param {number} position - Position of match
 * @param {number} maxLength - Maximum excerpt length
 * @returns {string} Text excerpt
 */
function getExcerpt(text, position, maxLength = 100) {
  const start = Math.max(0, position - Math.floor(maxLength / 2));
  const end = Math.min(text.length, start + maxLength);
  let excerpt = text.substring(start, end);
  
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  
  return excerpt.trim();
}

/**
 * Check if response contains borderline content that should be logged
 * 
 * @param {string} response - The AI-generated response text
 * @returns {boolean} True if borderline content detected
 */
function hasBorderlineContent(response) {
  const borderlinePatterns = [
    /consult\s+(your\s+)?(doctor|physician|healthcare)/i,
    /talk\s+to\s+(your\s+)?(doctor|physician|healthcare)/i,
    /see\s+(your\s+)?(doctor|physician|healthcare)/i,
    /medical\s+professional/i,
    /within\s+(your|the)\s+limits?/i,
    /listen\s+to\s+your\s+body/i,
  ];

  return borderlinePatterns.some(pattern => pattern.test(response));
}

module.exports = {
  validateResponse,
  hasBorderlineContent,
  SAFETY_RULES,
};
