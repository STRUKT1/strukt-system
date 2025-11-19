/**
 * Tone Filter Service
 *
 * Validates AI responses for tone safety, inclusivity, and ethical guidelines.
 * Ensures every AI Coach reply is safe, non-judgmental, inclusive, and contextually aware.
 */

const logger = require('../lib/logger');

// Define tone safety rules as pattern-based checks
const TONE_SAFETY_RULES = [
  // Judgmental and triggering phrases
  {
    pattern: /\b(you\s+)?(failed|failure|gave\s+up|quit)\b/i,
    issue: 'Judgmental language: using failure-oriented language',
    severity: 'medium',
  },
  {
    pattern: /why\s+(didn't|haven't|don't)\s+you/i,
    issue: 'Judgmental tone: accusatory questioning',
    severity: 'medium',
  },
  {
    pattern: /\b(should\s+have|could\s+have)\s+(done|been|tried)\b/i,
    issue: 'Judgmental tone: past regret inducing',
    severity: 'low',
  },
  {
    pattern: /\b(lazy|unmotivated|weak|pathetic|worthless)\b/i,
    issue: 'Harmful language: using derogatory terms',
    severity: 'high',
  },
  
  // Sarcasm and passive-aggression
  {
    pattern: /(oh\s+really|sure\s+you\s+did|yeah\s+right|obviously)/i,
    issue: 'Sarcastic or dismissive tone',
    severity: 'medium',
  },
  {
    pattern: /good\s+luck\s+with\s+that/i,
    issue: 'Passive-aggressive tone',
    severity: 'medium',
  },
  
  // Harmful diet/fitness advice
  {
    pattern: /skip\s+(all\s+)?(meals?|eating)/i,
    issue: 'Harmful advice: recommending meal skipping',
    severity: 'high',
  },
  {
    pattern: /don'?t\s+eat/i,
    issue: 'Harmful advice: restrictive eating',
    severity: 'high',
  },
  {
    pattern: /starve|starvation/i,
    issue: 'Harmful advice: promoting starvation',
    severity: 'high',
  },
  {
    pattern: /just\s+(ignore|push\s+through)\s+(the\s+)?pain/i,
    issue: 'Harmful advice: encouraging ignoring pain',
    severity: 'high',
  },
  {
    pattern: /no\s+pain,?\s+no\s+gain/i,
    issue: 'Harmful advice: promoting pain tolerance',
    severity: 'medium',
  },
  
  // Prescriptive/commanding tone
  {
    pattern: /\b(must|have\s+to|need\s+to)\s+(do|eat|exercise|workout|train)\b/i,
    issue: 'Prescriptive tone: using commanding language',
    severity: 'low',
  },
  {
    pattern: /\byou\s+(will|shall)\s+(do|eat|stop|start)\b/i,
    issue: 'Prescriptive tone: commanding future actions',
    severity: 'medium',
  },
  
  // Body shaming and triggering weight language
  {
    pattern: /\b(fat|obese|overweight|skinny|too\s+thin)\b/i,
    issue: 'Body-negative language: using weight-based labels',
    severity: 'high',
  },
  {
    pattern: /lose\s+weight\s+(fast|quickly|rapidly)/i,
    issue: 'Harmful advice: promoting rapid weight loss',
    severity: 'high',
  },
  {
    pattern: /\b(cheat\s+meal|cheat\s+day|being\s+bad|being\s+good)\b/i,
    issue: 'Moral framing: assigning morality to food choices',
    severity: 'medium',
  },
  
  // Gender and identity insensitivity
  {
    pattern: /\b(he\/she|his\/her|him\/her)\b/i,
    issue: 'Non-inclusive language: binary gender assumptions',
    severity: 'low',
  },
  {
    pattern: /\b(guys|dude|bro)\b/i,
    issue: 'Non-inclusive language: gendered casual terms',
    severity: 'low',
  },
  
  // Dismissive of mental health or emotions
  {
    pattern: /(just|simply)\s+(get\s+over\s+it|move\s+on|stop\s+worrying)/i,
    issue: 'Emotionally insensitive: dismissing mental health concerns',
    severity: 'high',
  },
  {
    pattern: /\b(it'?s\s+(all\s+)?in\s+your\s+head|all\s+in\s+your\s+head)\b/i,
    issue: 'Emotionally insensitive: invalidating feelings',
    severity: 'high',
  },
  {
    pattern: /stop\s+(being|feeling)\s+(sad|anxious|depressed|stressed)/i,
    issue: 'Emotionally insensitive: commanding emotional change',
    severity: 'high',
  },
  
  // Ableist language
  {
    pattern: /\b(crazy|insane|psycho|mental|retarded|lame)\b/i,
    issue: 'Ableist language detected',
    severity: 'high',
  },
];

/**
 * Check if response contains unsafe tone or language
 * 
 * @param {string} response - The AI-generated response text
 * @returns {Object} { safe: boolean, issues: Array<string>, severity: 'low' | 'medium' | 'high' }
 */
function checkToneSafety(response) {
  if (!response || typeof response !== 'string') {
    return { safe: true, issues: [], severity: 'low' };
  }

  const detectedIssues = [];
  let maxSeverity = 'low';

  // Check each tone safety rule
  for (const rule of TONE_SAFETY_RULES) {
    if (rule.pattern.test(response)) {
      detectedIssues.push({
        issue: rule.issue,
        severity: rule.severity,
      });
      
      // Track highest severity level
      if (rule.severity === 'high') {
        maxSeverity = 'high';
      } else if (rule.severity === 'medium' && maxSeverity !== 'high') {
        maxSeverity = 'medium';
      }
      
      // Log the issue with context
      const match = response.match(rule.pattern);
      if (match) {
        const excerpt = getExcerpt(response, match.index, 100);
        logger.warn('Tone safety issue detected', {
          issue: rule.issue,
          severity: rule.severity,
          excerpt: excerpt.substring(0, 100), // Limit excerpt length for logs
        });
      }
    }
  }

  const safe = detectedIssues.length === 0;
  const issues = detectedIssues.map(i => i.issue);

  return { 
    safe, 
    issues, 
    severity: detectedIssues.length > 0 ? maxSeverity : 'low' 
  };
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
 * Perform sentiment analysis heuristic
 * Simple keyword-based sentiment to detect overly negative tone
 * 
 * @param {string} response - The AI-generated response text
 * @returns {Object} { sentiment: 'positive' | 'neutral' | 'negative', confidence: number }
 */
function analyzeSentiment(response) {
  if (!response || typeof response !== 'string') {
    return { sentiment: 'neutral', confidence: 0 };
  }

  const positiveWords = [
    'great', 'excellent', 'wonderful', 'amazing', 'proud', 'success',
    'progress', 'improvement', 'well done', 'fantastic', 'awesome',
    'encourage', 'support', 'celebrate', 'achievement', 'win',
  ];

  const negativeWords = [
    'terrible', 'awful', 'horrible', 'disgusting', 'pathetic',
    'useless', 'hopeless', 'impossible', 'never', 'can\'t',
  ];

  const lowerText = response.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) positiveCount += matches.length;
  });

  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) negativeCount += matches.length;
  });

  const total = positiveCount + negativeCount;
  if (total === 0) {
    return { sentiment: 'neutral', confidence: 0 };
  }

  const ratio = positiveCount / total;
  if (ratio > 0.6) {
    return { sentiment: 'positive', confidence: ratio };
  } else if (ratio < 0.4) {
    return { sentiment: 'negative', confidence: 1 - ratio };
  } else {
    return { sentiment: 'neutral', confidence: 0.5 };
  }
}

/**
 * Main validation function that combines all tone checks
 * 
 * @param {string} response - The AI-generated response text
 * @returns {Object} Complete tone safety report
 */
function validateTone(response) {
  const toneCheck = checkToneSafety(response);
  const sentiment = analyzeSentiment(response);

  // Flag as unsafe if high severity issues or very negative sentiment
  const safe = toneCheck.safe && 
    (toneCheck.severity !== 'high') && 
    (sentiment.sentiment !== 'negative' || sentiment.confidence < 0.7);

  return {
    safe,
    issues: toneCheck.issues,
    severity: toneCheck.severity,
    sentiment: sentiment.sentiment,
    details: {
      toneIssuesFound: toneCheck.issues.length,
      sentimentScore: sentiment.confidence,
    },
  };
}

module.exports = {
  validateTone,
  checkToneSafety,
  analyzeSentiment,
  TONE_SAFETY_RULES,
};
