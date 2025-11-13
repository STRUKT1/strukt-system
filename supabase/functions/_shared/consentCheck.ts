/**
 * STRUKT Consent Check Module
 *
 * Checks if user has granted consent for specific data processing activities.
 * Required for GDPR compliance before sending user data to OpenAI.
 *
 * Usage:
 * ```typescript
 * import { checkUserConsent } from '../_shared/consentCheck.ts';
 *
 * const hasConsent = await checkUserConsent(supabase, userId, 'openai_processing');
 * if (!hasConsent) {
 *   // Skip OpenAI processing
 *   return;
 * }
 * ```
 */

export interface ConsentCheckResult {
  hasConsent: boolean;
  consentRecord?: {
    granted_at: string;
    privacy_policy_version: string;
  };
}

/**
 * Check if user has granted consent for a specific processing activity
 *
 * @param supabase - Supabase client instance
 * @param userId - UUID of the user
 * @param consentType - Type of consent to check ('openai_processing', 'analytics', 'marketing')
 * @returns ConsentCheckResult with hasConsent boolean and optional consent record
 */
export async function checkUserConsent(
  supabase: any,
  userId: string,
  consentType: 'openai_processing' | 'analytics' | 'marketing'
): Promise<ConsentCheckResult> {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();

  try {
    // Query user_consents table
    const { data, error } = await supabase
      .from('user_consents')
      .select('granted, granted_at, withdrawn_at, privacy_policy_version')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .single();

    if (error) {
      // If no consent record exists, user hasn't consented
      if (error.code === 'PGRST116') {
        console.log('[CONSENT_CHECK] No consent record found', {
          requestId,
          timestamp,
          userId,
          consentType,
          result: 'no_consent'
        });

        return { hasConsent: false };
      }

      // Other errors - log and fail closed (no consent)
      console.error('[CONSENT_CHECK] ERROR: Database query failed', {
        requestId,
        timestamp,
        userId,
        consentType,
        error: error.message
      });

      return { hasConsent: false };
    }

    // Check if consent is granted and not withdrawn
    const hasConsent = data.granted === true && data.withdrawn_at === null;

    console.log('[CONSENT_CHECK] Consent check completed', {
      requestId,
      timestamp,
      userId,
      consentType,
      hasConsent,
      granted_at: data.granted_at,
      withdrawn_at: data.withdrawn_at,
      privacy_policy_version: data.privacy_policy_version
    });

    if (hasConsent) {
      return {
        hasConsent: true,
        consentRecord: {
          granted_at: data.granted_at,
          privacy_policy_version: data.privacy_policy_version
        }
      };
    }

    return { hasConsent: false };

  } catch (error) {
    console.error('[CONSENT_CHECK] EXCEPTION: Unexpected error', {
      requestId,
      timestamp,
      userId,
      consentType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Fail closed - if we can't check consent, don't process
    return { hasConsent: false };
  }
}
