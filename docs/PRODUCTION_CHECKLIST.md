# Production Deployment Checklist - AI Coach

## Pre-Deployment

### 1. Environment Variables

- [ ] `OPENAI_API_KEY` set in production environment
- [ ] `OPENAI_PROJECT_ID` set (optional but recommended)
- [ ] `OPENAI_MODEL` set to `gpt-4o` (or desired model)
- [ ] `SUPABASE_URL` set to production Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server-only, never in client)
- [ ] `SUPABASE_ANON_KEY` set for client authentication
- [ ] `DATA_BACKEND_PRIMARY` set to `supabase`
- [ ] `DUAL_WRITE` set to `false`
- [ ] `NODE_ENV` set to `production`
- [ ] `PORT` configured (default: 4000)
- [ ] `LOG_LEVEL` set to `info` or `warn`
- [ ] `ALLOWED_ORIGINS` includes production domains:
  - [ ] `https://api.strukt.fit`
  - [ ] `https://app.strukt.fit`
  - [ ] `https://*.expo.dev`
  - [ ] `https://*.strukt.fit`

### 2. Database Setup

- [ ] All migrations applied to production database
- [ ] `ai_coach_logs` table created with RLS enabled
- [ ] `ai_coach_notes` table created with RLS enabled
- [ ] `coach_notifications` table created with RLS enabled
- [ ] `log_embeddings` table created (if using RAG)
- [ ] RLS policies verified for all tables
- [ ] Indexes created on all tables
- [ ] Service role has necessary permissions

### 3. Supabase Edge Functions

- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Authenticated with Supabase (`supabase login`)
- [ ] Project linked (`supabase link --project-ref <ref>`)
- [ ] Edge Function secrets set:
  - [ ] `OPENAI_API_KEY`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`

### 4. Code Review

- [ ] All AI coach features code reviewed
- [ ] Security audit completed
- [ ] No secrets in git history
- [ ] `.env` file not committed
- [ ] Rate limiting configured (20 req/min for AI endpoints)
- [ ] Error handling implemented
- [ ] Logging configured properly

## Deployment Steps

### 5. Backend API Deployment

- [ ] Build passes: `npm run build` (if applicable)
- [ ] Tests pass: `npm test`
- [ ] Backend deployed to production server
- [ ] Health check endpoint responding: `GET /health`
- [ ] `/ask` endpoint accessible at `https://api.strukt.fit/ask`
- [ ] SSL certificate valid
- [ ] CORS configuration active
- [ ] Rate limiting active

### 6. Edge Functions Deployment

#### generateWeeklyDigest

- [ ] Function deployed: `supabase functions deploy generateWeeklyDigest`
- [ ] Function invokes successfully (manual test)
- [ ] Logs show no errors
- [ ] CRON scheduled (Sundays 8 PM UTC / 8-9 PM London)
- [ ] Verified CRON in database: `SELECT * FROM cron.job WHERE jobname = 'generate-weekly-digest'`

#### checkUserStatus

- [ ] Function deployed: `supabase functions deploy checkUserStatus`
- [ ] Function invokes successfully (manual test)
- [ ] Logs show no errors
- [ ] CRON scheduled (Daily 8 AM UTC / 8-9 AM London)
- [ ] Verified CRON in database: `SELECT * FROM cron.job WHERE jobname = 'check-user-status'`

### 7. Testing

#### Backend Tests

```bash
# Test /ask endpoint
curl -X POST https://api.strukt.fit/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-jwt-token>" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, how are you?"}],
    "email": "test@example.com",
    "topic": "test"
  }'
```

- [ ] Receives 200 OK response
- [ ] Returns valid JSON with `success: true`
- [ ] AI response is present and sensible
- [ ] Log written to `ai_coach_logs` table

#### Edge Function Tests

```bash
# Test generateWeeklyDigest
supabase functions invoke generateWeeklyDigest --project-ref <ref>

# Test checkUserStatus
supabase functions invoke checkUserStatus --project-ref <ref>
```

- [ ] `generateWeeklyDigest` returns `success: true`
- [ ] Weekly summaries written to `ai_coach_notes`
- [ ] `checkUserStatus` returns `success: true`
- [ ] Notifications written to `coach_notifications` (if stress detected)

#### CORS Tests

```bash
# Test from allowed origin
curl -H "Origin: https://app.strukt.fit" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS https://api.strukt.fit/ask
```

- [ ] Returns `Access-Control-Allow-Origin` header
- [ ] Expo domains accepted
- [ ] STRUKT domains accepted
- [ ] Unauthorized domains rejected

### 8. Security Verification

- [ ] RLS enabled on all AI coach tables
- [ ] Service role key stored securely (not in client code)
- [ ] CORS restricted to known domains
- [ ] Rate limiting tested and working
- [ ] Helmet security headers enabled
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] No sensitive data in logs
- [ ] User data isolation verified (RLS policies)

### 9. Monitoring Setup

- [ ] Supabase Edge Function logs accessible
- [ ] Backend logs accessible
- [ ] Error tracking configured (optional: Sentry, etc.)
- [ ] Performance monitoring setup (optional)
- [ ] Alerts configured for critical errors
- [ ] Database query performance monitored

## Post-Deployment

### 10. Verification (First 24 Hours)

- [ ] Monitor `/ask` endpoint usage
- [ ] Check error rates (should be < 5%)
- [ ] Verify logs are being written
- [ ] Check OpenAI API usage and costs
- [ ] Monitor database performance
- [ ] Review Edge Function logs
- [ ] Confirm CRON jobs executed (after scheduled time)

### 11. Documentation

- [ ] Deployment summary created (see template in DEPLOY_AI_COACH.md)
- [ ] Runbook updated with production URLs
- [ ] Team notified of deployment
- [ ] Support documentation updated
- [ ] API documentation published
- [ ] Git tag created: `v2.0-ai-coach-prod`

### 12. First CRON Execution

#### After First `checkUserStatus` Run (Next Morning)

- [ ] Check logs: `supabase functions logs checkUserStatus --since 24h`
- [ ] Verify notifications created (if applicable)
- [ ] Check for errors in logs
- [ ] Validate notification quality

#### After First `generateWeeklyDigest` Run (Next Sunday)

- [ ] Check logs: `supabase functions logs generateWeeklyDigest --since 7d`
- [ ] Verify summaries created in `ai_coach_notes`
- [ ] Review summary quality (spot check 3-5 users)
- [ ] Check for errors in logs
- [ ] Validate token usage

### 13. Performance Monitoring

- [ ] Track `/ask` response times (should be < 3 seconds avg)
- [ ] Monitor OpenAI API latency
- [ ] Check database query performance
- [ ] Review Edge Function execution times
- [ ] Monitor memory usage
- [ ] Check for any rate limiting issues

### 14. Cost Monitoring

- [ ] OpenAI API costs tracked
- [ ] Supabase usage within limits
- [ ] Edge Function invocations counted
- [ ] Database storage growth monitored
- [ ] Set up billing alerts (if available)

## Rollback Plan

### If Issues Occur

1. **Critical Issues (Data Loss, Security Breach)**
   - [ ] Immediately disable `/ask` endpoint
   - [ ] Disable Edge Functions
   - [ ] Investigate root cause
   - [ ] Follow incident response plan

2. **Non-Critical Issues (Performance, Minor Bugs)**
   - [ ] Document the issue
   - [ ] Assess impact
   - [ ] Determine if hotfix or rollback needed
   - [ ] Communicate to users if affected

3. **Rollback Procedure**
   - [ ] Revert backend code to previous version
   - [ ] Redeploy Edge Functions from previous version
   - [ ] Unschedule CRON jobs if needed
   - [ ] Verify rollback successful
   - [ ] Document lessons learned

## Success Criteria

### Must Have (Launch Blockers)

- ✅ `/ask` endpoint responds with 200 OK
- ✅ CORS allows production domains
- ✅ RLS protects user data
- ✅ Edge Functions deploy successfully
- ✅ Manual invocation of Edge Functions works
- ✅ No critical security vulnerabilities
- ✅ No data loss or corruption

### Should Have (Address Within 1 Week)

- ✅ CRON jobs execute on schedule
- ✅ Weekly summaries generated successfully
- ✅ Proactive notifications triggered appropriately
- ✅ Monitoring and alerting configured
- ✅ Performance meets targets (< 3s response time)
- ✅ Error rate < 5%

### Nice to Have (Future Enhancements)

- ⭕ Advanced monitoring dashboard
- ⭕ Automated testing in production
- ⭕ A/B testing framework
- ⭕ User feedback collection
- ⭕ Advanced analytics

## Contact Information

**On-Call Support:** [Your Contact]
**Escalation:** [Manager/Team Lead]
**Documentation:** `/docs/DEPLOY_AI_COACH.md`

## Notes

Add any deployment-specific notes here:
- 
- 
- 

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Deployment Version:** v2.0-ai-coach-prod
**Sign-Off:** _______________

