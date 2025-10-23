# AI Coach Production Deployment Summary

## 🚀 Overview

This document provides a summary of the AI Coach production deployment process and artifacts.

**Status:** ✅ Ready for Deployment  
**Version:** v2.0-ai-coach-prod  
**Date:** 2025-10-23

---

## 📦 What's Included

### 1. Backend API (`/ask` Endpoint)

**Location:** Already implemented in codebase
- `routes/ask.js` - Route handler
- `controllers/aiController.js` - Controller logic
- `src/server.js` - Server with CORS configuration

**Endpoint:** `https://api.strukt.fit/ask`

**Features:**
- JWT authentication required
- Rate limiting (20 requests/minute for AI endpoints)
- Comprehensive logging to `ai_coach_logs` table
- Fallback handling for OpenAI API failures
- CORS support for production domains

### 2. Supabase Edge Functions

#### Function: `generateWeeklyDigest`
**Location:** `/supabase/functions/generateWeeklyDigest/index.ts`

**Purpose:** Generate weekly natural-language summaries of user activity

**Schedule:** Every Sunday at 8 PM London time (20:00 UTC)

**What it does:**
1. Fetches all users with activity in past 7 days
2. Retrieves logs from `ai_coach_logs`
3. Uses GPT-4o-mini to generate summaries
4. Stores in `ai_coach_notes` table

#### Function: `checkUserStatus`
**Location:** `/supabase/functions/checkUserStatus/index.ts`

**Purpose:** Detect stress patterns and trigger proactive coaching

**Schedule:** Daily at 8 AM London time (08:00 UTC)

**What it does:**
1. Analyzes mood/stress logs from past 3 days
2. Detects stress keywords and patterns
3. If ≥2 days show stress → creates notification
4. Prevents duplicate notifications

### 3. Database Schema

All tables already exist with proper RLS policies:

- **`ai_coach_logs`** - Tracks all AI interactions
- **`ai_coach_notes`** - Stores weekly summaries
- **`coach_notifications`** - Queues proactive messages
- **`log_embeddings`** - Stores vector embeddings for RAG (optional)

**Migrations:**
- `db/migrations/20251022_create_ai_coach_logs_table.sql`
- `db/migrations/20251022_create_ai_coach_notes_table.sql`
- `db/migrations/20251022_create_coach_notifications_table.sql`
- `db/migrations/20251023_setup_cron_jobs.sql` ⚠️ **New - for CRON setup**

---

## 📋 Documentation

### Primary Deployment Guide
📄 **`docs/DEPLOY_AI_COACH.md`** (22KB)
- Complete step-by-step deployment guide
- Environment variable configuration
- CRON job scheduling
- Security verification
- Monitoring setup
- Troubleshooting guide
- Post-deployment validation

### Production Checklist
📄 **`docs/PRODUCTION_CHECKLIST.md`** (8KB)
- Pre-deployment checklist
- Deployment steps
- Testing procedures
- Post-deployment verification
- Rollback plan
- Success criteria

### Related Documentation
- `docs/AI_COACH_MEMORY_RAG.md` - Memory system architecture
- `docs/PROACTIVE_COACH.md` - Proactive coaching features
- `docs/API_ENDPOINTS.md` - API documentation
- `docs/SETUP_GUIDE.md` - Initial setup

---

## 🛠️ Deployment Tools

### Automated Deployment Script
📜 **`scripts/deploy-edge-functions.sh`**

**Features:**
- Automated Edge Function deployment
- Dry-run mode for testing
- Prerequisites validation
- Comprehensive error handling
- CRON setup guidance

**Usage:**
```bash
# Show help
./scripts/deploy-edge-functions.sh --help

# Dry run (test without deploying)
./scripts/deploy-edge-functions.sh --project-ref abc123 --dry-run

# Deploy everything
./scripts/deploy-edge-functions.sh --project-ref abc123

# Deploy functions only (skip CRON scheduling)
./scripts/deploy-edge-functions.sh --project-ref abc123 --functions-only
```

### CRON Setup SQL
📜 **`db/migrations/20251023_setup_cron_jobs.sql`**

SQL script to schedule CRON jobs via pg_cron. Includes:
- Job definitions
- Verification queries
- Management commands
- Comprehensive documentation

---

## 🔧 Configuration Changes

### CORS Enhancement
**File:** `src/server.js`

Enhanced to support wildcard domain patterns:
- `https://*.expo.dev` - Expo preview builds
- `https://*.strukt.fit` - All STRUKT subdomains

**Implementation:** Regex-based pattern matching for flexible origin validation

### Environment Variables
**File:** `.env.example`

Added production CORS configuration examples:
```bash
# Production CORS
ALLOWED_ORIGINS=https://api.strukt.fit,https://app.strukt.fit,https://*.expo.dev,https://*.strukt.fit
```

### Config Module
**File:** `src/config.js`

Added OpenAI configuration section for better organization.

---

## 🚀 Quick Start Deployment

### Prerequisites
1. Supabase CLI installed: `npm install -g supabase`
2. Authenticated: `supabase login`
3. Project linked: `supabase link --project-ref <your-ref>`

### Step 1: Deploy Edge Functions
```bash
# Deploy both functions
./scripts/deploy-edge-functions.sh --project-ref <your-ref>
```

### Step 2: Set Secrets
```bash
# Set required secrets
supabase secrets set OPENAI_API_KEY=sk-... --project-ref <your-ref>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ... --project-ref <your-ref>
```

### Step 3: Schedule CRON Jobs
Run the SQL in `db/migrations/20251023_setup_cron_jobs.sql` in Supabase SQL Editor.

**⚠️ Important:** Replace placeholders:
- `YOUR_PROJECT_REF` → your Supabase project reference
- `YOUR_SERVICE_ROLE_KEY` → your service role key

### Step 4: Configure Backend
Set production environment variables:
```bash
ALLOWED_ORIGINS=https://api.strukt.fit,https://app.strukt.fit,https://*.expo.dev,https://*.strukt.fit
NODE_ENV=production
PORT=4000
# ... other variables (see DEPLOY_AI_COACH.md)
```

### Step 5: Deploy Backend
Deploy your Node.js backend to production server (Heroku, AWS, etc.)

### Step 6: Verify
```bash
# Test /ask endpoint
curl -X POST https://api.strukt.fit/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"messages":[{"role":"user","content":"test"}]}'

# Test Edge Functions
supabase functions invoke generateWeeklyDigest --project-ref <your-ref>
supabase functions invoke checkUserStatus --project-ref <your-ref>
```

---

## 📊 Monitoring

### Logs
```bash
# View Edge Function logs
supabase functions logs generateWeeklyDigest --since 24h --project-ref <your-ref>
supabase functions logs checkUserStatus --since 24h --project-ref <your-ref>

# View CRON execution history
# Run in Supabase SQL Editor:
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Database Queries
```sql
-- Check recent AI interactions
SELECT COUNT(*), success 
FROM ai_coach_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY success;

-- Check weekly summaries
SELECT COUNT(*) 
FROM ai_coach_notes 
WHERE type = 'weekly_summary' 
AND created_at > NOW() - INTERVAL '7 days';

-- Check proactive notifications
SELECT COUNT(*) 
FROM coach_notifications 
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## 🔒 Security

### Verification Checklist
- ✅ RLS enabled on all AI coach tables
- ✅ Service role key stored server-side only
- ✅ CORS restricted to known domains
- ✅ Rate limiting active
- ✅ Helmet security headers enabled
- ✅ No secrets in git repository
- ✅ User data isolation via RLS

### RLS Policies Summary
All tables have:
- Users can view/update their own data
- Service role can perform all operations
- No public access without authentication

---

## ⏰ CRON Schedules

| Function | Frequency | UTC Time | London Time* |
|----------|-----------|----------|--------------|
| generateWeeklyDigest | Weekly (Sundays) | 20:00 | 8:00 PM |
| checkUserStatus | Daily | 08:00 | 8:00 AM |

\* London time shifts with DST (GMT in winter, BST in summer)

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** CORS error when calling `/ask`  
**Solution:** Check `ALLOWED_ORIGINS` includes the requesting domain

**Issue:** Edge Function not executing  
**Solution:** Verify function is deployed and CRON is scheduled

**Issue:** Weekly digest not generating  
**Solution:** Check users have activity in past 7 days and OpenAI API key is valid

**Issue:** Notifications not appearing  
**Solution:** Verify stress patterns exist in logs and no recent duplicate notifications

For detailed troubleshooting, see `docs/DEPLOY_AI_COACH.md` Section 8.

---

## 📈 Success Metrics

### Key Performance Indicators
- `/ask` response time < 3 seconds
- Error rate < 5%
- CRON job success rate > 95%
- Weekly summary generation for all active users
- Appropriate proactive notification triggering (not spam)

### Monitoring Points
- OpenAI API usage and costs
- Database query performance
- Edge Function execution times
- User engagement with proactive notifications
- Quality of weekly summaries

---

## 📞 Support

**Deployment Documentation:** `/docs/DEPLOY_AI_COACH.md`  
**Checklist:** `/docs/PRODUCTION_CHECKLIST.md`  
**Architecture:** `/docs/AI_COACH_MEMORY_RAG.md`

**GitHub Repository:** https://github.com/STRUKT1/strukt-system  
**Branch:** `deploy/ai-coach-prod`

---

## ✅ Deployment Status

| Component | Status | Notes |
|-----------|--------|-------|
| `/ask` endpoint code | ✅ Ready | Already implemented |
| Edge Functions | ✅ Ready | Deployed to `/supabase/functions/` |
| Database schema | ✅ Ready | Migrations exist |
| CORS configuration | ✅ Ready | Enhanced with wildcard support |
| Documentation | ✅ Complete | Comprehensive guides |
| Deployment scripts | ✅ Ready | Automated tooling |
| Testing procedures | ✅ Documented | In deployment guide |
| Monitoring setup | ✅ Documented | Log queries and commands |

**Overall Status:** 🟢 **Ready for Production Deployment**

---

## 🎯 Next Actions

1. **Deploy to production** using the deployment guide
2. **Set environment variables** in production environment
3. **Deploy Edge Functions** using deployment script
4. **Schedule CRON jobs** using SQL migration
5. **Test thoroughly** using provided curl commands
6. **Monitor logs** for first 24 hours
7. **Create deployment summary** after completion
8. **Tag release** as `v2.0-ai-coach-prod`

---

**Last Updated:** 2025-10-23  
**Version:** 2.0  
**Prepared By:** GitHub Copilot Agent
