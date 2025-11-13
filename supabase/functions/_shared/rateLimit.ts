/**
 * STRUKT Rate Limiting Module
 *
 * Prevents abuse by limiting requests per hour per function.
 * Uses Upstash Redis for fast, serverless request counting.
 *
 * Features:
 * - 100 requests per hour limit per function
 * - Automatic expiration (1 hour windows)
 * - Detailed logging of rate limit violations
 * - Returns 429 Too Many Requests when limit exceeded
 *
 * Usage:
 * ```typescript
 * import { checkRateLimit } from '../_shared/rateLimit.ts';
 *
 * serve(async (req) => {
 *   const rateLimitResult = await checkRateLimit('checkUserStatus');
 *   if (!rateLimitResult.allowed) {
 *     return rateLimitResult.response;
 *   }
 *   // Function logic...
 * });
 * ```
 */

export interface RateLimitResult {
  allowed: boolean;
  response?: Response;
  metadata?: {
    requestCount: number;
    limit: number;
    resetTime: string;
  };
}

/**
 * Rate limit configuration
 */
const RATE_LIMIT_CONFIG = {
  windowMinutes: 60,        // 1 hour window
  maxRequests: 100,         // 100 requests per hour
};

/**
 * Checks if a request is within rate limits
 *
 * @param functionName - Name of the Edge Function being rate limited
 * @returns RateLimitResult with allowed status and optional error response
 */
export async function checkRateLimit(functionName: string): Promise<RateLimitResult> {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();

  // Get Upstash credentials
  const upstashUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const upstashToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  // Critical: If Redis not configured, allow request but log warning
  if (!upstashUrl || !upstashToken) {
    console.warn('[RATE_LIMIT] WARNING: Upstash Redis not configured', {
      requestId,
      timestamp,
      functionName,
      error: 'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN'
    });

    // Fail open - allow request if rate limiting isn't configured
    return {
      allowed: true,
      metadata: {
        requestCount: 0,
        limit: RATE_LIMIT_CONFIG.maxRequests,
        resetTime: timestamp
      }
    };
  }

  // Create a unique key for this function's rate limit
  const rateLimitKey = `rate_limit:${functionName}`;

  try {
    // Increment the counter in Redis
    const incrResponse = await fetch(`${upstashUrl}/incr/${rateLimitKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${upstashToken}`
      }
    });

    if (!incrResponse.ok) {
      throw new Error(`Redis INCR failed: ${incrResponse.status}`);
    }

    const incrData = await incrResponse.json();
    const requestCount = incrData.result as number;

    // If this is the first request, set expiration (1 hour)
    if (requestCount === 1) {
      const expirySeconds = RATE_LIMIT_CONFIG.windowMinutes * 60;
      await fetch(`${upstashUrl}/expire/${rateLimitKey}/${expirySeconds}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${upstashToken}`
        }
      });
    }

    // Get TTL (time to live) for reset time
    const ttlResponse = await fetch(`${upstashUrl}/ttl/${rateLimitKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${upstashToken}`
      }
    });

    const ttlData = await ttlResponse.json();
    const ttlSeconds = ttlData.result as number;
    const resetTime = new Date(Date.now() + (ttlSeconds * 1000)).toISOString();

    // Log the rate limit check
    console.log('[RATE_LIMIT] Request counted', {
      requestId,
      timestamp,
      functionName,
      requestCount,
      limit: RATE_LIMIT_CONFIG.maxRequests,
      resetTime
    });

    // Check if over limit
    if (requestCount > RATE_LIMIT_CONFIG.maxRequests) {
      console.warn('[RATE_LIMIT] LIMIT EXCEEDED', {
        requestId,
        timestamp,
        functionName,
        requestCount,
        limit: RATE_LIMIT_CONFIG.maxRequests,
        resetTime
      });

      return {
        allowed: false,
        response: new Response(
          JSON.stringify({
            error: 'Too Many Requests',
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Maximum ${RATE_LIMIT_CONFIG.maxRequests} requests per hour.`,
            requestId,
            retryAfter: resetTime,
            requestCount,
            limit: RATE_LIMIT_CONFIG.maxRequests
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(ttlSeconds).toString(),
              'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': resetTime
            }
          }
        )
      };
    }

    // Under limit - allowed!
    return {
      allowed: true,
      metadata: {
        requestCount,
        limit: RATE_LIMIT_CONFIG.maxRequests,
        resetTime
      }
    };

  } catch (error) {
    console.error('[RATE_LIMIT] ERROR: Redis operation failed', {
      requestId,
      timestamp,
      functionName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Fail open - if Redis is down, allow the request
    // This prevents rate limiting from breaking the entire system
    return {
      allowed: true,
      metadata: {
        requestCount: 0,
        limit: RATE_LIMIT_CONFIG.maxRequests,
        resetTime: timestamp
      }
    };
  }
}

/**
 * Resets rate limit for a specific function (useful for testing)
 *
 * @param functionName - Name of the Edge Function
 */
export async function resetRateLimit(functionName: string): Promise<void> {
  const upstashUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const upstashToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!upstashUrl || !upstashToken) {
    console.warn('[RATE_LIMIT] Cannot reset - Redis not configured');
    return;
  }

  const rateLimitKey = `rate_limit:${functionName}`;

  await fetch(`${upstashUrl}/del/${rateLimitKey}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${upstashToken}`
    }
  });

  console.log('[RATE_LIMIT] Rate limit reset', {
    functionName,
    timestamp: new Date().toISOString()
  });
}
