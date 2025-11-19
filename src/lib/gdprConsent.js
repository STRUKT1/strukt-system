const { supabaseAdmin } = require('./supabaseServer');
const logger = require('./logger');

/**
 * Middleware to verify user has granted OpenAI processing consent
 * GDPR requirement - must check before sending data to third parties
 */
async function requireOpenAIConsent(req, res, next) {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({
      ok: false,
      code: 'ERR_UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  try {
    // Check if user has granted OpenAI consent
    const { data: consent, error } = await supabaseAdmin
      .from('user_consents')
      .select('granted, withdrawn_at, granted_at')
      .eq('user_id', userId)
      .eq('consent_type', 'openai_processing')
      .maybeSingle();

    if (error) {
      logger.error('Error checking OpenAI consent', {
        userId: logger.maskUserId(userId),
        error: error.message
      });
      return res.status(500).json({
        ok: false,
        code: 'ERR_CONSENT_CHECK_FAILED',
        message: 'Unable to verify consent status'
      });
    }

    // No consent record found
    if (!consent) {
      return res.status(403).json({
        ok: false,
        code: 'ERR_CONSENT_REQUIRED',
        message: 'AI processing requires explicit user consent. Please grant consent in app settings.',
        consentRequired: true,
        consentType: 'openai_processing'
      });
    }

    // Consent was withdrawn
    if (consent.withdrawn_at) {
      return res.status(403).json({
        ok: false,
        code: 'ERR_CONSENT_WITHDRAWN',
        message: 'AI processing consent has been withdrawn. Please re-grant consent in app settings.',
        consentRequired: true,
        consentType: 'openai_processing'
      });
    }

    // Consent not granted
    if (!consent.granted) {
      return res.status(403).json({
        ok: false,
        code: 'ERR_CONSENT_REQUIRED',
        message: 'AI processing requires explicit user consent. Please grant consent in app settings.',
        consentRequired: true,
        consentType: 'openai_processing'
      });
    }

    // Consent is valid - proceed
    logger.debug('OpenAI consent verified', {
      userId: logger.maskUserId(userId),
      grantedAt: consent.granted_at
    });

    next();

  } catch (error) {
    logger.error('Unexpected error in requireOpenAIConsent middleware', {
      userId: logger.maskUserId(userId),
      error: error.message
    });
    return res.status(500).json({
      ok: false,
      code: 'ERR_INTERNAL',
      message: 'An error occurred while processing your request'
    });
  }
}

module.exports = {
  requireOpenAIConsent
};
