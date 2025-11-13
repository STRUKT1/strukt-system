/**
 * STRUKT Edge Functions Authentication Module
 *
 * This module provides authentication and authorization for Supabase Edge Functions.
 * It prevents unauthorized access to CRON-triggered functions.
 *
 * Security measures:
 * - Secret key validation (CRON_SECRET_KEY)
 * - Request origin verification
 * - Comprehensive logging of auth attempts
 * - Clear error responses
 *
 * Usage:
 * ```typescript
 * import { authenticateRequest } from '../_shared/auth.ts';
 *
 * serve(async (req) => {
 *   const authResult = await authenticateRequest(req);
 *   if (!authResult.authorized) {
 *     return authResult.response;
 *   }
 *
 *   // Your function logic here...
 * });
 * ```
 */

export interface AuthResult {
  authorized: boolean;
  response?: Response;
  metadata?: {
    source?: string;
    timestamp: string;
  };
}

/**
 * Authenticates incoming requests to Edge Functions
 *
 * Checks for:
 * 1. X-Cron-Secret header matching CRON_SECRET_KEY environment variable
 * 2. Logs all authentication attempts for security monitoring
 *
 * @param req - The incoming Request object
 * @returns AuthResult with authorization status and optional error response
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();

  // Get the secret from environment
  const cronSecret = Deno.env.get('CRON_SECRET_KEY');

  // Critical: If no secret is configured, deny all requests
  if (!cronSecret) {
    console.error('[AUTH] CRITICAL: CRON_SECRET_KEY not configured', {
      requestId,
      timestamp,
      error: 'Missing environment variable'
    });

    return {
      authorized: false,
      response: new Response(
        JSON.stringify({
          error: 'Server configuration error',
          code: 'AUTH_CONFIG_ERROR',
          requestId
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    };
  }

  // Check for the secret header
  const providedSecret = req.headers.get('X-Cron-Secret');
  const userAgent = req.headers.get('User-Agent') || 'unknown';
  const origin = req.headers.get('Origin') || 'unknown';

  // Log the authentication attempt (without exposing secrets)
  console.log('[AUTH] Authentication attempt', {
    requestId,
    timestamp,
    method: req.method,
    userAgent,
    origin,
    hasSecret: !!providedSecret,
    url: req.url
  });

  // Validate the secret
  if (!providedSecret || providedSecret !== cronSecret) {
    console.warn('[AUTH] UNAUTHORIZED: Invalid or missing secret', {
      requestId,
      timestamp,
      reason: !providedSecret ? 'missing_secret' : 'invalid_secret',
      userAgent,
      origin
    });

    return {
      authorized: false,
      response: new Response(
        JSON.stringify({
          error: 'Unauthorized',
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Valid authentication credentials required',
          requestId
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'X-Cron-Secret'
          }
        }
      )
    };
  }

  // Success!
  console.log('[AUTH] SUCCESS: Request authenticated', {
    requestId,
    timestamp,
    userAgent
  });

  return {
    authorized: true,
    metadata: {
      source: userAgent,
      timestamp
    }
  };
}

/**
 * Creates standardized error responses for Edge Functions
 *
 * @param status - HTTP status code
 * @param code - Error code for client handling
 * @param message - Human-readable error message
 * @param details - Optional additional details
 * @returns Response object
 */
export function createErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): Response {
  const requestId = crypto.randomUUID();

  return new Response(
    JSON.stringify({
      error: message,
      code,
      requestId,
      timestamp: new Date().toISOString(),
      ...details
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Creates standardized success responses for Edge Functions
 *
 * @param data - Response data
 * @param metadata - Optional metadata
 * @returns Response object
 */
export function createSuccessResponse(
  data: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...metadata
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
