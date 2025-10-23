# AI Coach Production Deployment Guide

## Overview

This guide covers the production deployment of the STRUKT AI Coach system, including:
- `/ask` endpoint configuration and deployment
- Supabase Edge Functions (CRON jobs) for memory and proactive coaching
- Security verification and RLS policies
- Monitoring and observability setup

---

## 1. `/ask` Endpoint — Production Deployment

### Production URL
```
https://api.strukt.fit/ask
```

### CORS Configuration

The `/ask` endpoint requires CORS configuration for production domains. Update your production environment variables:

```bash
ALLOWED_ORIGINS=https://api.strukt.fit,https://app.strukt.fit,https://*.expo.dev,https://*.strukt.fit
```

#### CORS Policy Details

The server is configured to accept requests from:
- `https://*.expo.dev` - Expo preview and development builds
- `https://*.strukt.fit` - Production STRUKT domains
- `https://api.strukt.fit` - API domain
- `https://app.strukt.fit` - Web app domain

**Implementation:** The CORS configuration is in `src/server.js` and uses the `ALLOWED_ORIGINS` environment variable.

### Security Requirements

✅ **Service Role Key Protection**
- `SUPABASE_SERVICE_ROLE_KEY` must be set ONLY in server environment
- Never exposed to client builds
- Used exclusively for server-side database operations

✅ **RLS (Row Level Security)**
- All AI coach tables have RLS enabled:
  - `ai_coach_logs`
  - `ai_coach_notes`
  - `coach_notifications`
  - `log_embeddings`
- Service role can bypass RLS for backend operations
- Users can only access their own data

### Production Endpoint Testing

Test the live endpoint:

```bash
curl -X POST https://api.strukt.fit/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "test connection"
      }
    ],
    "email": "test@example.com",
    "topic": "test"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "reply": "..."
}
```

### Validation Checklist

- [ ] `/ask` route responds at `https://api.strukt.fit/ask`
- [ ] CORS allows requests from `*.expo.dev` and `*.strukt.fit`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is server-only (not in client)
- [ ] Fallback handling is active (OpenAI API failures handled gracefully)
- [ ] `ai_coach_logs` table logs all interactions with:
  - `user_id`
  - `token_usage`
  - `success` status
  - `timestamp`
- [ ] RLS protection verified on all AI coach tables
- [ ] Test request succeeds with valid JWT token

---

## 2. CRON Deployments — Supabase Edge Functions

### Prerequisites

1. **Supabase CLI installed:**
   ```bash
   npm install -g supabase
   ```

2. **Supabase project setup:**
   - Log in to Supabase CLI
   - Link to your project
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

3. **Environment variables configured:**
   Set these in your Supabase project settings (Edge Functions > Secrets):
   ```bash
   OPENAI_API_KEY=sk-...
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

### Function 1: `generateWeeklyDigest`

**Purpose:** Generate weekly natural-language summaries of user activity using GPT-4-Turbo

**Schedule:** Every Sunday at 8 PM London time (BST/GMT)
- **CRON expression:** `0 20 * * SUN` (8 PM UTC / 9 PM BST during summer)
- **Note:** London is GMT (UTC+0) in winter, BST (UTC+1) in summer

**What it does:**
1. Fetches all users with activity in the past 7 days
2. Retrieves `ai_coach_logs` for each user
3. Uses OpenAI GPT-4o-mini to generate a concise summary
4. Inserts summary into `ai_coach_notes` table with `type='weekly_summary'`

**Deployment:**

```bash
# Deploy the function
supabase functions deploy generateWeeklyDigest --project-ref <your-project-ref>

# Schedule the CRON job (8 PM UTC every Sunday)
# Note: Adjust for London timezone - use 19:00 UTC for 8 PM GMT, 20:00 UTC for 8 PM BST
supabase functions schedule generateWeeklyDigest \
  --cron "0 20 * * SUN" \
  --project-ref <your-project-ref>
```

**Local Testing:**

```bash
# Test locally before deploying
supabase functions serve generateWeeklyDigest --env-file .env

# Invoke the function locally
supabase functions invoke generateWeeklyDigest --env-file .env
```

**Function Location:** `/supabase/functions/generateWeeklyDigest/index.ts`

**Database Table:** `ai_coach_notes`
```sql
CREATE TABLE ai_coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  note TEXT NOT NULL,
  type TEXT CHECK (type IN ('weekly_summary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Function 2: `checkUserStatus`

**Purpose:** Detect stress patterns and queue proactive coaching messages

**Schedule:** Daily at 8 AM London time (BST/GMT)
- **CRON expression:** `0 8 * * *` (8 AM UTC / 9 AM BST during summer)

**What it does:**
1. Analyzes mood/stress logs from past 3 days
2. Detects stress patterns using keyword matching
3. If ≥2 days show high stress → insert notification into `coach_notifications`
4. Prevents duplicate notifications (checks last 3 days)

**Deployment:**

```bash
# Deploy the function
supabase functions deploy checkUserStatus --project-ref <your-project-ref>

# Schedule the CRON job (8 AM UTC daily)
# Note: Adjust for London timezone - use 7:00 UTC for 8 AM GMT, 8:00 UTC for 8 AM BST
supabase functions schedule checkUserStatus \
  --cron "0 8 * * *" \
  --project-ref <your-project-ref>
```

**Local Testing:**

```bash
# Test locally before deploying
supabase functions serve checkUserStatus --env-file .env

# Invoke the function locally
supabase functions invoke checkUserStatus --env-file .env
```

**Function Location:** `/supabase/functions/checkUserStatus/index.ts`

**Database Table:** `coach_notifications`
```sql
CREATE TABLE coach_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('ai_coach_proactive')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Stress Detection Logic

**Keywords detected:**
- High stress: `stress`, `stressed`, `anxious`, `anxiety`, `overwhelmed`
- Fatigue: `tired`, `exhausted`
- Difficulty: `difficult`, `tough`, `hard time`, `struggling`
- Emotional: `down`, `sad`, `depressed`, `frustrated`, `angry`, `upset`

**Trigger threshold:** ≥2 days with stress indicators in 3-day window

**Duplicate prevention:** Only sends if no notification in last 3 days

### CRON Job Verification

After deployment, verify CRON jobs are scheduled:

```bash
# View Edge Function logs
supabase functions logs --since 24h --project-ref <your-project-ref>

# Check specific function logs
supabase functions logs generateWeeklyDigest --since 7d --project-ref <your-project-ref>
supabase functions logs checkUserStatus --since 24h --project-ref <your-project-ref>
```

---

## 3. Monitoring & Observability

### AI Coach Logs

**Table:** `ai_coach_logs`

Tracks every `/ask` interaction:
- `user_id` - User who made the request
- `session_id` - Conversation session identifier
- `user_message` - User's input message
- `ai_response` - AI's generated response
- `success` - Whether interaction completed successfully
- `token_usage` - OpenAI tokens consumed
- `issues` - Array of any safety issues detected
- `timestamp` - When interaction occurred

**Query Example:**
```sql
-- Check recent logs for a specific user
SELECT 
  timestamp,
  success,
  token_usage,
  LEFT(user_message, 50) as message_preview
FROM ai_coach_logs
WHERE user_id = '<user-uuid>'
ORDER BY timestamp DESC
LIMIT 20;
```

**Monitor for:**
- Success rate (should be >95%)
- Token usage trends
- Safety issues flagged
- Response times

### Weekly Summary Logs

**Table:** `ai_coach_notes`

**Validation Query:**
```sql
-- Check weekly summaries created
SELECT 
  user_id,
  created_at,
  LEFT(note, 100) as preview
FROM ai_coach_notes
WHERE type = 'weekly_summary'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Behavior:**
- New entries appear every Sunday after CRON runs
- One summary per active user per week
- Summaries are natural language text (100-200 words)

**Test Before First CRON:**
```bash
# Manually invoke to verify
supabase functions invoke generateWeeklyDigest --env-file .env
```

### Proactive Notifications

**Table:** `coach_notifications`

**Validation Query:**
```sql
-- Check notifications triggered
SELECT 
  user_id,
  message,
  read,
  created_at
FROM coach_notifications
WHERE type = 'ai_coach_proactive'
ORDER BY created_at DESC
LIMIT 10;
```

**Uniqueness Constraint:**
Consider adding a constraint to prevent duplicates:
```sql
-- Add unique constraint (optional)
ALTER TABLE coach_notifications 
ADD CONSTRAINT unique_notification_per_user_per_day 
UNIQUE (user_id, DATE(created_at));
```

**Monitor for:**
- Notification frequency per user (should not spam)
- Read rates
- User responses after receiving notifications

### CRON Job Success Monitoring

**Check Edge Function Logs:**
```bash
# View all Edge Function logs
supabase functions logs --since 24h --project-ref <your-project-ref>

# Filter for specific function
supabase functions logs generateWeeklyDigest --since 7d --project-ref <your-project-ref>

# View errors only
supabase functions logs checkUserStatus --since 24h --level error --project-ref <your-project-ref>
```

**Optional: Webhook Notifications**

Set up error alerts to Slack/Discord:
1. Create a webhook URL in Slack/Discord
2. Add error handling in Edge Functions to POST to webhook on failures
3. Monitor critical failures in real-time

---

## 4. Security Verification

### RLS Policies

All AI coach tables have Row-Level Security enabled:

#### `ai_coach_logs`
- ✅ Users can view own logs: `auth.uid() = user_id`
- ✅ Service role can insert logs: `auth.role() = 'service_role'`
- ✅ Service role can view all: `auth.role() = 'service_role'`

#### `ai_coach_notes`
- ✅ Users can view own notes: `auth.uid() = user_id`
- ✅ Service role can insert: `auth.role() = 'service_role'`
- ✅ Service role can view all: `auth.role() = 'service_role'`

#### `coach_notifications`
- ✅ Users can view own notifications: `auth.uid() = user_id`
- ✅ Users can update own notifications: `auth.uid() = user_id`
- ✅ Service role can insert: `auth.role() = 'service_role'`
- ✅ Service role can view all: `auth.role() = 'service_role'`

#### `log_embeddings` (if using RAG)
- ✅ Users can view own embeddings: `auth.uid() = user_id`
- ✅ Service role can insert: `auth.role() = 'service_role'`
- ✅ Service role can view all: `auth.role() = 'service_role'`

**Verification Command:**
```sql
-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('ai_coach_logs', 'ai_coach_notes', 'coach_notifications', 'log_embeddings')
AND schemaname = 'public';
```

### Secret Management

**Environment Variables:**
- ✅ `OPENAI_API_KEY` - Stored in Supabase Edge Function secrets
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Server-only, never exposed to client
- ✅ `SUPABASE_URL` - Public, safe to expose

**Best Practices:**
- Never commit secrets to git
- Use Supabase dashboard to manage Edge Function secrets
- Rotate service role key if compromised
- Use separate API keys for dev/staging/production

### CORS Security

**Current Configuration:**
```javascript
// src/server.js
cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow mobile/curl
    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
})
```

**Production Origins:**
```
https://api.strukt.fit
https://app.strukt.fit
https://*.expo.dev
https://*.strukt.fit
```

**Security Notes:**
- Wildcard patterns (`*`) should be handled carefully
- Mobile apps (no origin header) are allowed
- Credentials mode is enabled for authentication

### External Access Protection

**Validate:**
- [ ] `/ask` endpoint requires authentication (JWT token)
- [ ] No anonymous POST access without proper origin
- [ ] Rate limiting is active (20 requests/minute for AI endpoints)
- [ ] Helmet security headers are enabled

**Rate Limits:**
```javascript
// routes/ask.js
const aiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 AI requests per minute
});
```

---

## 5. Environment Variables Reference

### Backend Server (Node.js)

Required for production deployment:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_PROJECT_ID=proj_...  # Optional but recommended
OPENAI_MODEL=gpt-4o

# Supabase Configuration
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# Backend Configuration
DATA_BACKEND_PRIMARY=supabase
DUAL_WRITE=false

# Server Configuration
PORT=4000
NODE_ENV=production
LOG_LEVEL=info

# CORS Configuration (comma-separated)
ALLOWED_ORIGINS=https://api.strukt.fit,https://app.strukt.fit,https://*.expo.dev,https://*.strukt.fit
```

### Supabase Edge Functions

Set these in Supabase Dashboard (Settings > Edge Functions > Secrets):

```bash
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Setting Secrets via CLI:**
```bash
supabase secrets set OPENAI_API_KEY=sk-... --project-ref <your-project-ref>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ... --project-ref <your-project-ref>
```

---

## 6. Deployment Checklist

| Task | Status | Notes |
|------|--------|-------|
| `/ask` route live at `https://api.strukt.fit/ask` | [ ] | Test with curl command |
| CORS allows `*.expo.dev` and `*.strukt.fit` | [ ] | Check `ALLOWED_ORIGINS` env var |
| `SUPABASE_SERVICE_ROLE_KEY` is server-only | [ ] | Never in client code |
| RLS enabled on all AI coach tables | [ ] | Run verification SQL |
| `generateWeeklyDigest` deployed | [ ] | `supabase functions deploy` |
| `generateWeeklyDigest` CRON scheduled | [ ] | Sundays at 8 PM London |
| `checkUserStatus` deployed | [ ] | `supabase functions deploy` |
| `checkUserStatus` CRON scheduled | [ ] | Daily at 8 AM London |
| Edge Function secrets set | [ ] | `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `ai_coach_logs` table created with RLS | [ ] | Migration applied |
| `ai_coach_notes` table created with RLS | [ ] | Migration applied |
| `coach_notifications` table created with RLS | [ ] | Migration applied |
| Test `/ask` endpoint live | [ ] | Curl with real token |
| Test `generateWeeklyDigest` manually | [ ] | Local invoke |
| Test `checkUserStatus` manually | [ ] | Local invoke |
| Verify logs after first CRON run | [ ] | Check Supabase logs |
| Rate limiting active | [ ] | 20 req/min for AI |
| Helmet security headers enabled | [ ] | Verify in response |
| Documentation complete | [ ] | This file |
| Git tag `v2.0-ai-coach-prod` created | [ ] | `git tag v2.0-ai-coach-prod && git push --tags` |

---

## 7. Timezone Reference

London time (BST/GMT) conversion for CRON schedules:

| London Time | UTC (Winter GMT) | UTC (Summer BST) | CRON Expression |
|-------------|------------------|------------------|-----------------|
| 8:00 AM | 8:00 (same) | 7:00 (-1 hour) | `0 8 * * *` (use UTC) |
| 8:00 PM | 20:00 (same) | 19:00 (-1 hour) | `0 20 * * SUN` (use UTC) |

**Note:** CRON schedules run in UTC. London observes:
- **GMT (UTC+0)** in winter (late October - late March)
- **BST (UTC+1)** in summer (late March - late October)

**Recommendation:** Set CRON to UTC time and note that actual London time will shift with DST changes.

---

## 8. Troubleshooting

### Issue: `/ask` endpoint returns CORS error

**Solution:**
1. Check `ALLOWED_ORIGINS` includes the requesting domain
2. Verify origin header matches exactly (including protocol and port)
3. For Expo apps, ensure `*.expo.dev` is included

### Issue: Edge Function not executing

**Check:**
1. Function is deployed: `supabase functions list`
2. CRON is scheduled: Check Supabase dashboard > Edge Functions > Cron
3. Secrets are set: `supabase secrets list`
4. View logs: `supabase functions logs <function-name> --since 24h`

### Issue: Weekly digest not generating

**Debug:**
1. Check if users have logs in past 7 days
2. Verify `OPENAI_API_KEY` is valid
3. Check OpenAI API quota and rate limits
4. View function logs for errors

### Issue: Proactive notifications not triggering

**Debug:**
1. Verify users have logged stress-related content
2. Check 3-day window has sufficient data
3. Ensure no recent duplicate notifications exist
4. Review stress keyword matching logic

### Issue: RLS blocking service role

**Solution:**
Service role should bypass RLS. If blocked:
1. Verify you're using `SUPABASE_SERVICE_ROLE_KEY`, not anon key
2. Check RLS policies have service role exemptions
3. Ensure client is initialized with service role key

---

## 9. Post-Deployment Validation

### Step 1: Verify `/ask` Endpoint

```bash
# Test with a real user token
curl -X POST https://api.strukt.fit/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <real-jwt-token>" \
  -d '{
    "messages": [{"role": "user", "content": "How are you?"}],
    "email": "real-user@example.com"
  }'
```

**Expected:** 200 OK with AI response

### Step 2: Check Logs Written

```sql
-- Verify log was created
SELECT * FROM ai_coach_logs 
ORDER BY timestamp DESC 
LIMIT 1;
```

**Expected:** Recent entry with `success = true`

### Step 3: Manually Invoke Edge Functions

```bash
# Test weekly digest
supabase functions invoke generateWeeklyDigest --project-ref <your-project-ref>

# Test user status check
supabase functions invoke checkUserStatus --project-ref <your-project-ref>
```

**Expected:** JSON response with `success: true`

### Step 4: Verify Tables Populated

```sql
-- Check weekly summaries (after running generateWeeklyDigest)
SELECT COUNT(*) as summary_count FROM ai_coach_notes WHERE type = 'weekly_summary';

-- Check notifications (after running checkUserStatus with stress data)
SELECT COUNT(*) as notification_count FROM coach_notifications WHERE type = 'ai_coach_proactive';
```

### Step 5: Monitor First CRON Execution

Wait for scheduled time, then check logs:

```bash
# Check if generateWeeklyDigest ran on Sunday
supabase functions logs generateWeeklyDigest --since 7d | grep "success"

# Check if checkUserStatus ran today
supabase functions logs checkUserStatus --since 24h | grep "success"
```

---

## 10. Deployment Summary Template

After deployment, fill out this summary:

```markdown
## 🚀 AI Coach Production Deployment Summary

**Deployment Date:** [Date and Time]
**Deployed By:** [Your Name]
**Environment:** Production

### ✅ What Was Deployed

- **Backend API Endpoint:**
  - `/ask` endpoint live at: `https://api.strukt.fit/ask`
  - CORS configured for: `*.expo.dev`, `*.strukt.fit`
  - Rate limiting: 20 req/min for AI endpoints
  - Authentication: JWT-based

- **Supabase Edge Functions:**
  - `generateWeeklyDigest` - Weekly summaries
  - `checkUserStatus` - Daily proactive checks

### ⏰ CRON Schedules

| Function | Schedule | London Time | UTC Time |
|----------|----------|-------------|----------|
| generateWeeklyDigest | Weekly (Sunday) | 8:00 PM | 20:00 UTC |
| checkUserStatus | Daily | 8:00 AM | 8:00 UTC |

**Note:** Times shown are UTC. London time shifts with DST (GMT/BST).

### 🔒 Security

- ✅ RLS enabled on all AI coach tables
- ✅ Service role key stored server-side only
- ✅ CORS restricted to STRUKT domains + Expo
- ✅ Rate limiting active (20 req/min)
- ✅ Helmet security headers enabled

### 📊 Log Verification

- ✅ `ai_coach_logs` - Tracking all interactions
- ✅ `ai_coach_notes` - Weekly summaries storage
- ✅ `coach_notifications` - Proactive messages queue
- ✅ Edge Function logs accessible via Supabase CLI

### ✅ Tests Completed

- [x] `/ask` endpoint responds with 200 OK
- [x] CORS allows Expo and STRUKT domains
- [x] `generateWeeklyDigest` invoked successfully
- [x] `checkUserStatus` invoked successfully
- [x] Logs written to `ai_coach_logs`
- [x] RLS policies verified

### ⚠️ Warnings / Future TODOs

- Monitor OpenAI API usage and costs
- Consider adding duplicate notification constraint
- Set up Slack/Discord webhook for error alerts
- Review token usage trends after 1 week
- Add performance monitoring for `/ask` response times
- Consider implementing caching for system prompts

### 📝 Next Steps

1. Monitor first CRON executions (Sunday for digest, daily for status check)
2. Review logs after 24 hours for any errors
3. Check notification delivery to users
4. Validate weekly summary quality
5. Set up alerting for critical failures

### 🔗 References

- Deployment docs: `/docs/DEPLOY_AI_COACH.md`
- API docs: `/docs/API_ENDPOINTS.md`
- Memory system: `/docs/AI_COACH_MEMORY_RAG.md`
- Proactive coach: `/docs/PROACTIVE_COACH.md`

---

**Status:** 🟢 Deployment Complete
**Monitoring:** Active via Supabase Edge Function logs
**Support Contact:** [Your Team Contact Info]
```

---

## 11. Useful Commands Reference

### Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref <your-project-ref>

# Deploy Edge Function
supabase functions deploy <function-name>

# Schedule CRON job
supabase functions schedule <function-name> --cron "<cron-expression>"

# View logs
supabase functions logs <function-name> --since 24h

# List functions
supabase functions list

# Set secrets
supabase secrets set KEY=value

# List secrets
supabase secrets list

# Invoke function manually
supabase functions invoke <function-name>
```

### Database Queries

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('ai_coach_logs', 'ai_coach_notes', 'coach_notifications');

-- View recent AI interactions
SELECT user_id, success, token_usage, timestamp 
FROM ai_coach_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- Check weekly summaries
SELECT user_id, LEFT(note, 100) as preview, created_at 
FROM ai_coach_notes 
WHERE type = 'weekly_summary' 
ORDER BY created_at DESC;

-- View proactive notifications
SELECT user_id, message, read, created_at 
FROM coach_notifications 
ORDER BY created_at DESC;
```

### Testing

```bash
# Test /ask endpoint
curl -X POST https://api.strukt.fit/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"messages":[{"role":"user","content":"test"}]}'

# Test with local server
npm start

# Run all tests
npm test

# Run AI coach tests only
npm run test:ai-coach
```

---

## Support

For issues or questions:
- Check `/docs` directory for detailed documentation
- Review Edge Function logs: `supabase functions logs`
- Check database RLS policies
- Verify environment variables are set correctly

---

**Last Updated:** 2025-10-23  
**Version:** 2.0  
**Status:** Production Ready
