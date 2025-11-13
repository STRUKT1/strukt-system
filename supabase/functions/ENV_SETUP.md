# Edge Functions Environment Setup

This document describes the environment variables required for STRUKT Edge Functions and how to configure them for secure operation.

## 🔐 Security Notice

All Edge Functions in this project now require authentication via the `X-Cron-Secret` header. This prevents unauthorized execution and protects sensitive user data.

---

## Required Environment Variables

### All Edge Functions

These variables must be set for all Edge Functions:

#### `CRON_SECRET_KEY` (Required)
- **Purpose**: Authentication secret for Edge Function requests
- **Format**: Strong random string (minimum 32 characters recommended)
- **Security**: Keep this secret! Never commit to version control
- **Usage**: Must be provided in the `X-Cron-Secret` header for all requests

#### `SUPABASE_URL` (Required)
- **Purpose**: Your Supabase project URL
- **Format**: `https://your-project.supabase.co`
- **Source**: Supabase Dashboard → Settings → API

#### `SUPABASE_SERVICE_ROLE_KEY` (Required)
- **Purpose**: Service role key for elevated database access
- **Format**: Long JWT token starting with `eyJ...`
- **Security**: Keep this secret! Grants full database access
- **Source**: Supabase Dashboard → Settings → API → Service Role Key

### Function-Specific Variables

#### `generateWeeklyDigest` Only

##### `OPENAI_API_KEY` (Required)
- **Purpose**: OpenAI API key for generating AI summaries
- **Format**: `sk-...`
- **Source**: OpenAI Platform → API Keys
- **Security**: Keep this secret! Grants access to OpenAI services

---

## 🚀 Deployment Setup

### Step 1: Generate CRON_SECRET_KEY

Generate a strong secret key:

```bash
# Option 1: Using OpenSSL (recommended)
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Step 2: Set Environment Variables in Supabase

**Via Supabase Dashboard:**
1. Navigate to: Project Settings → Edge Functions → Configuration
2. Add each environment variable as a secret
3. Click "Save" after each addition

**Via Supabase CLI:**
```bash
# Set CRON_SECRET_KEY
supabase secrets set CRON_SECRET_KEY=your_generated_secret_here

# Verify secrets are set
supabase secrets list
```

### Step 3: Deploy Edge Functions

Deploy all functions with the new authentication:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy checkUserStatus
supabase functions deploy generateWeeklyDigest
```

### Step 4: Update CRON Jobs

**CRITICAL**: Update your CRON job configurations to include the authentication header.

**Example for Supabase CRON:**
```sql
-- Update existing CRON jobs to include authentication header
SELECT cron.schedule(
  'check-user-status-daily',
  '0 10 * * *',  -- Daily at 10:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/checkUserStatus',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'X-Cron-Secret', current_setting('app.settings.cron_secret_key')
      )
    );
  $$
);
```

**For external CRON services (e.g., GitHub Actions, cron-job.org):**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/checkUserStatus \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "X-Cron-Secret: YOUR_CRON_SECRET_KEY"
```

---

## 🧪 Testing Edge Functions

### Test Authentication

**Test 1: Request without authentication (should fail with 401)**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/checkUserStatus \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "error": "Unauthorized",
#   "code": "AUTH_INVALID_CREDENTIALS",
#   "message": "Valid authentication credentials required",
#   "requestId": "..."
# }
```

**Test 2: Request with invalid secret (should fail with 401)**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/checkUserStatus \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: wrong-secret"

# Expected response: 401 Unauthorized
```

**Test 3: Request with valid secret (should succeed)**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/checkUserStatus \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: YOUR_CRON_SECRET_KEY"

# Expected response: 200 OK with function results
```

### Test Individual Functions

#### checkUserStatus
```bash
curl -X POST https://your-project.supabase.co/functions/v1/checkUserStatus \
  -H "X-Cron-Secret: YOUR_CRON_SECRET_KEY" \
  -v

# Check logs for authentication success:
# [AUTH] SUCCESS: Request authenticated
```

#### generateWeeklyDigest
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generateWeeklyDigest \
  -H "X-Cron-Secret: YOUR_CRON_SECRET_KEY" \
  -v

# Check logs for authentication success:
# [AUTH] SUCCESS: Request authenticated
```

---

## 🔍 Monitoring & Logging

### Authentication Logs

All authentication attempts are logged with the following format:

**Successful authentication:**
```
[AUTH] SUCCESS: Request authenticated
{
  requestId: "uuid-here",
  timestamp: "2025-11-13T10:00:00Z",
  userAgent: "..."
}
```

**Failed authentication (missing secret):**
```
[AUTH] UNAUTHORIZED: Invalid or missing secret
{
  requestId: "uuid-here",
  timestamp: "2025-11-13T10:00:00Z",
  reason: "missing_secret",
  userAgent: "...",
  origin: "..."
}
```

**Configuration error:**
```
[AUTH] CRITICAL: CRON_SECRET_KEY not configured
{
  requestId: "uuid-here",
  timestamp: "2025-11-13T10:00:00Z",
  error: "Missing environment variable"
}
```

### View Logs

**Via Supabase Dashboard:**
- Navigate to: Edge Functions → Select Function → Logs

**Via Supabase CLI:**
```bash
# View logs for specific function
supabase functions logs checkUserStatus

# Follow logs in real-time
supabase functions logs checkUserStatus --follow
```

---

## 🚨 Troubleshooting

### Problem: "AUTH_CONFIG_ERROR" (500 status)
**Cause**: `CRON_SECRET_KEY` environment variable not set in Supabase
**Solution**:
1. Run `supabase secrets list` to verify secrets
2. Set the secret: `supabase secrets set CRON_SECRET_KEY=your_secret`
3. Redeploy the function: `supabase functions deploy functionName`

### Problem: "AUTH_INVALID_CREDENTIALS" (401 status)
**Cause**: Missing or incorrect `X-Cron-Secret` header
**Solution**:
1. Verify you're sending the `X-Cron-Secret` header in your request
2. Confirm the header value matches the deployed `CRON_SECRET_KEY`
3. Check for typos or extra whitespace in the secret

### Problem: CRON jobs failing after deployment
**Cause**: CRON configuration not updated with authentication header
**Solution**: Update CRON job configuration to include `X-Cron-Secret` header (see Step 4 above)

### Problem: "Missing environment variable" in function logs
**Cause**: Required environment variables not set
**Solution**: Verify all required variables are set for the specific function (see "Required Environment Variables" above)

---

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Edge Functions Secrets Management](https://supabase.com/docs/guides/functions/secrets)

---

## 🔒 Security Best Practices

1. **Never commit secrets to version control**
   - Use `.env.local` for local development (gitignored)
   - Use Supabase secrets for production deployment

2. **Rotate secrets regularly**
   - Update `CRON_SECRET_KEY` every 90 days
   - Update immediately if compromise is suspected

3. **Use strong secrets**
   - Minimum 32 characters for `CRON_SECRET_KEY`
   - Use cryptographically secure random generation

4. **Monitor authentication logs**
   - Review failed authentication attempts regularly
   - Set up alerts for repeated unauthorized access attempts

5. **Limit secret exposure**
   - Only share secrets with authorized team members
   - Use separate secrets for development and production

---

**Last Updated**: 2025-11-13
**Security Audit**: P0-1 (Edge Functions Authentication)
**Compliance Sprint**: 6-week GDPR implementation
