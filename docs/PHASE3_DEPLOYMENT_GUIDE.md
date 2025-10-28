# Phase 3 Deployment Guide

**Version:** v1.2.1-system-activation  
**Date:** October 28, 2025  
**Status:** Ready for Production

---

## 🎯 Pre-Deployment Checklist

### 1. Verify Local Environment

```bash
# Run all Phase 3 checks
npm run verify:phase3

# Run CRON function tests
npm run test:cron-functions

# Run plan generation tests
npm run test:plan-generation

# Verify no security issues
# CodeQL should report 0 alerts
```

**Expected Results:**
- ✅ Phase 3 Integrity: 28/28 checks passed
- ✅ CRON Tests: 16/16 passed
- ✅ Plan Tests: 19/19 passed
- ✅ CodeQL: 0 alerts

### 2. Required Environment Variables

Ensure these are set in Supabase Edge Function secrets:

```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

---

## 📦 Deployment Steps

### Step 1: Deploy Edge Functions

```bash
# Deploy generateWeeklyDigest
supabase functions deploy generateWeeklyDigest \
  --project-ref YOUR_PROJECT_REF

# Deploy checkUserStatus
supabase functions deploy checkUserStatus \
  --project-ref YOUR_PROJECT_REF
```

**Verify Deployment:**
```bash
# List deployed functions
supabase functions list

# Test generateWeeklyDigest
supabase functions invoke generateWeeklyDigest

# Test checkUserStatus
supabase functions invoke checkUserStatus
```

### Step 2: Apply Database Migrations

```bash
# Apply all pending migrations
supabase db push

# OR apply individually
supabase db execute --file supabase/migrations/20251028_create_system_cron_logs.sql
supabase db execute --file supabase/migrations/20251028_update_coach_notifications.sql
```

**Verify Migrations:**
```sql
-- Connect to Supabase SQL Editor

-- Check system_cron_logs table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'system_cron_logs';

-- Check coach_notifications columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coach_notifications' 
AND column_name IN ('priority', 'delivery_channel', 'status');
```

### Step 3: Configure CRON Jobs

**Option A: Using pg_cron (Recommended)**

1. Update `db/migrations/20251023_setup_cron_jobs.sql`:
   - Replace `YOUR_PROJECT_REF` with actual project reference
   - Replace `YOUR_SERVICE_ROLE_KEY` with service role key

2. Execute in Supabase SQL Editor:
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule generateWeeklyDigest (Every Sunday @ 08:00 UTC)
SELECT cron.schedule(
  'generate-weekly-digest',
  '0 20 * * SUN',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generateWeeklyDigest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule checkUserStatus (Daily @ 07:00 UTC)
SELECT cron.schedule(
  'check-user-status',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/checkUserStatus',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Option B: Using External CRON (Alternative)**

Configure external CRON service (e.g., cron-job.org, GitHub Actions) to:
- Call `https://YOUR_PROJECT_REF.supabase.co/functions/v1/generateWeeklyDigest` weekly
- Call `https://YOUR_PROJECT_REF.supabase.co/functions/v1/checkUserStatus` daily
- Include `Authorization: Bearer YOUR_SERVICE_ROLE_KEY` header

**Verify CRON Setup:**
```sql
-- View scheduled jobs
SELECT * FROM cron.job ORDER BY jobname;

-- Should show:
-- | jobname                  | schedule      | active |
-- |--------------------------|---------------|--------|
-- | check-user-status        | 0 8 * * *     | true   |
-- | generate-weekly-digest   | 0 20 * * SUN  | true   |
```

### Step 4: Test Functions in Production

**Manual Test - generateWeeklyDigest:**
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generateWeeklyDigest' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Generated N weekly digests",
  "results": [...]
}
```

**Manual Test - checkUserStatus:**
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/checkUserStatus' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Checked N users, triggered M notifications",
  "notifications": [...]
}
```

### Step 5: Monitor Execution

**Check CRON Logs:**
```sql
-- View recent CRON executions
SELECT 
  function_name,
  run_status,
  run_time,
  duration_ms,
  details
FROM system_cron_logs
ORDER BY run_time DESC
LIMIT 20;

-- Check for errors
SELECT * FROM system_cron_logs
WHERE run_status = 'error'
ORDER BY run_time DESC;
```

**View Edge Function Logs:**
```bash
# View logs for generateWeeklyDigest
supabase functions logs generateWeeklyDigest

# View logs for checkUserStatus
supabase functions logs checkUserStatus

# Follow logs in real-time
supabase functions logs generateWeeklyDigest --follow
```

**Monitor pg_cron Execution:**
```sql
-- View CRON job execution history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🔍 Post-Deployment Validation

### Day 1: Initial Validation

- [ ] Check that both functions are deployed and accessible
- [ ] Verify CRON jobs are scheduled
- [ ] Monitor first manual test execution
- [ ] Check system_cron_logs for successful inserts
- [ ] Verify no errors in Edge Function logs

### Week 1: Monitoring

- [ ] Verify generateWeeklyDigest runs on Sunday
- [ ] Verify checkUserStatus runs daily
- [ ] Check success rates (should be >95%)
- [ ] Monitor average execution times
- [ ] Review triggered notifications

### Month 1: Optimization

- [ ] Analyze CRON execution patterns
- [ ] Review retry attempt rates
- [ ] Optimize if execution times are high
- [ ] Adjust CRON schedules if needed
- [ ] Gather user feedback on notifications

---

## 📊 Monitoring Queries

### Success Rate Analysis

```sql
-- Overall success rate by function (last 30 days)
SELECT 
  function_name,
  COUNT(*) as total_runs,
  SUM(CASE WHEN run_status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN run_status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_pct
FROM system_cron_logs
WHERE run_time > NOW() - INTERVAL '30 days'
GROUP BY function_name;
```

### Performance Metrics

```sql
-- Average execution time by function
SELECT 
  function_name,
  COUNT(*) as executions,
  ROUND(AVG(duration_ms)) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MIN(duration_ms) as min_duration_ms
FROM system_cron_logs
WHERE run_time > NOW() - INTERVAL '7 days'
  AND run_status != 'error'
GROUP BY function_name;
```

### Error Analysis

```sql
-- Recent errors with details
SELECT 
  function_name,
  run_time,
  error_message,
  details,
  attempts
FROM system_cron_logs
WHERE run_status = 'error'
ORDER BY run_time DESC
LIMIT 20;
```

### Notification Trends

```sql
-- Daily notification count
SELECT 
  DATE(created_at) as date,
  COUNT(*) as notifications_sent,
  COUNT(CASE WHEN type = 'ai_coach_proactive' THEN 1 END) as proactive_count
FROM coach_notifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🚨 Troubleshooting

### Edge Function Not Executing

**Check:**
1. Function is deployed: `supabase functions list`
2. CRON job is scheduled: `SELECT * FROM cron.job`
3. Service role key is valid
4. Function has correct environment variables

**Fix:**
```bash
# Redeploy function
supabase functions deploy <function-name> --project-ref YOUR_PROJECT_REF

# Update CRON job
SELECT cron.unschedule('function-name');
-- Then reschedule with correct parameters
```

### High Error Rate

**Check system_cron_logs:**
```sql
SELECT error_message, details, COUNT(*) as occurrences
FROM system_cron_logs
WHERE run_status = 'error'
  AND run_time > NOW() - INTERVAL '7 days'
GROUP BY error_message, details
ORDER BY occurrences DESC;
```

**Common Issues:**
- **Missing OpenAI API key:** Add to Edge Function secrets
- **Database connection timeout:** Increase timeout in config.toml
- **Rate limiting:** Implement request throttling

### No Logs in system_cron_logs

**Possible Causes:**
1. Migration not applied
2. RLS policy blocking inserts
3. Function crashing before logging

**Verify:**
```sql
-- Check table exists
SELECT tablename FROM pg_tables WHERE tablename = 'system_cron_logs';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'system_cron_logs';

-- Temporarily disable RLS for testing (NOT in production)
ALTER TABLE system_cron_logs DISABLE ROW LEVEL SECURITY;
```

---

## 🔄 Rollback Procedure

If issues arise, rollback in reverse order:

### 1. Disable CRON Jobs

```sql
SELECT cron.unschedule('generate-weekly-digest');
SELECT cron.unschedule('check-user-status');
```

### 2. Undeploy Edge Functions (Optional)

Functions will remain but won't be called by CRON.

### 3. Revert Database Migrations (If Necessary)

```sql
-- Drop system_cron_logs table
DROP TABLE IF EXISTS system_cron_logs;

-- Revert coach_notifications columns
ALTER TABLE coach_notifications 
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS delivery_channel,
  DROP COLUMN IF EXISTS status;
```

---

## 📈 Success Criteria

Phase 3 deployment is successful when:

- ✅ Both Edge Functions deploy without errors
- ✅ CRON jobs are scheduled and visible in `cron.job`
- ✅ First manual test of each function returns 200
- ✅ system_cron_logs receives inserts after execution
- ✅ Weekly digest runs successfully on Sunday
- ✅ Daily status check runs successfully every day
- ✅ Success rate >95% after first week
- ✅ Average execution time <30s for digest, <10s for status check
- ✅ No unhandled errors in Edge Function logs

---

## 🎉 Next Steps: Phase 4

After successful Phase 3 deployment:

1. **Monitor for 1 week** to establish baseline metrics
2. **Gather user feedback** on notification quality and timing
3. **Analyze patterns** in wellness context and plan generation
4. **Plan Phase 4** features:
   - Dynamic plan adjustment based on progress
   - Smart nudging system with time-based triggers
   - Advanced pattern recognition (injury risk, overtraining)
   - Multi-channel notification delivery
   - User preference learning

---

## 📞 Support Contacts

- **Technical Issues:** Check Edge Function logs and system_cron_logs
- **Database Issues:** Review Supabase dashboard and pg_cron logs
- **Documentation:** See `docs/STRUKT_SYSTEM_PHASE3.md`

---

**Document Version:** 1.0  
**Last Updated:** October 28, 2025  
**Deployment Status:** Ready for Production ✅
