# AI Coach Deployment Documentation Index

This document provides a comprehensive index of all deployment-related documentation for the STRUKT AI Coach system.

---

## 📚 Primary Documentation

### 1. Main Deployment Guide
**File:** [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) (22KB)

The complete, authoritative guide for deploying the AI Coach system to production.

**Contents:**
- `/ask` endpoint configuration
- Edge Functions deployment procedures
- CRON job scheduling with timezone conversion
- Security verification and RLS policies
- Monitoring and observability setup
- Environment variables reference
- Troubleshooting guide (8 common issues)
- Post-deployment validation procedures
- Deployment summary template

**When to use:** Primary reference for all deployment activities

---

### 2. Production Checklist
**File:** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) (8KB)

Step-by-step checklist to ensure nothing is missed during deployment.

**Contents:**
- Pre-deployment verification (14 items)
- Deployment steps (6 sections)
- Testing procedures (3 test suites)
- Security verification (8 checks)
- Post-deployment monitoring (4 phases)
- Rollback plan (3 scenarios)
- Success criteria

**When to use:** During actual deployment to track progress

---

### 3. Deployment Summary
**File:** [../DEPLOYMENT_SUMMARY.md](../DEPLOYMENT_SUMMARY.md) (10KB)

Quick reference guide summarizing all deployment components.

**Contents:**
- Overview of deployed components
- Quick start deployment steps
- Documentation index
- Monitoring commands and queries
- Status dashboard
- Useful commands reference

**When to use:** Quick reference after reading the full guide

---

## 🛠️ Deployment Tools

### 4. Edge Functions Deployment Script
**File:** [../scripts/deploy-edge-functions.sh](../scripts/deploy-edge-functions.sh) (7KB)

Bash script to automate Edge Function deployment.

**Features:**
- Automated deployment of both Edge Functions
- Dry-run mode for testing
- Prerequisites validation
- Error handling
- CRON setup guidance

**Usage:**
```bash
# Show help
./scripts/deploy-edge-functions.sh --help

# Dry run
./scripts/deploy-edge-functions.sh --project-ref abc123 --dry-run

# Deploy
./scripts/deploy-edge-functions.sh --project-ref abc123
```

---

### 5. Deployment Verification Script
**File:** [../scripts/verify-deployment.sh](../scripts/verify-deployment.sh) (6KB)

Post-deployment verification script to test all components.

**Tests:**
- Health check endpoint
- CORS configuration
- `/ask` endpoint functionality
- Edge Functions deployment
- Response structure validation

**Usage:**
```bash
# Full verification
./scripts/verify-deployment.sh --url https://api.strukt.fit --token <jwt> --project-ref <ref>

# Backend only
./scripts/verify-deployment.sh --url https://api.strukt.fit --token <jwt>
```

---

## 🗄️ Database

### 6. CRON Jobs Setup SQL
**File:** [../db/migrations/20251023_setup_cron_jobs.sql](../db/migrations/20251023_setup_cron_jobs.sql) (4KB)

SQL script to schedule CRON jobs via pg_cron.

**Contents:**
- `generateWeeklyDigest` schedule (Sundays 8 PM UTC)
- `checkUserStatus` schedule (Daily 8 AM UTC)
- Verification queries
- Management commands (unschedule, alter)
- Comprehensive inline documentation

**Usage:**
1. Replace placeholders (PROJECT_REF, SERVICE_ROLE_KEY)
2. Run in Supabase SQL Editor

---

### 7. AI Coach Database Migrations
**Files:**
- [../db/migrations/20251022_create_ai_coach_logs_table.sql](../db/migrations/20251022_create_ai_coach_logs_table.sql)
- [../db/migrations/20251022_create_ai_coach_notes_table.sql](../db/migrations/20251022_create_ai_coach_notes_table.sql)
- [../db/migrations/20251022_create_coach_notifications_table.sql](../db/migrations/20251022_create_coach_notifications_table.sql)

Database schema migrations for AI Coach tables with RLS policies.

---

## 📋 Templates

### 8. Deployment Completion Template
**File:** [DEPLOYMENT_COMPLETION_TEMPLATE.md](DEPLOYMENT_COMPLETION_TEMPLATE.md) (11KB)

Comprehensive template to document deployment completion.

**Sections:**
- Deployment overview
- Component status tracking
- CRON job details
- Security verification results
- Testing results
- Log verification
- Performance metrics
- Issues encountered
- Post-deployment actions
- Sign-off section

**When to use:** After deployment is complete, fill out and archive

---

### 9. Git Tag Instructions
**File:** [GIT_TAG_INSTRUCTIONS.md](GIT_TAG_INSTRUCTIONS.md) (5KB)

Instructions for creating the release tag.

**Contents:**
- Tag creation commands
- Tag naming convention
- GitHub release creation guide
- Rollback tag procedures
- Release history management

**When to use:** After successful deployment verification

---

## 📖 Related Documentation

### 10. AI Coach Memory System
**File:** [AI_COACH_MEMORY_RAG.md](AI_COACH_MEMORY_RAG.md)

Architecture documentation for the memory and RAG system.

**Topics:**
- Memory layers (short-term, long-term, semantic)
- Vector embeddings and search
- Database schema details
- Edge Functions implementation
- Testing and troubleshooting

---

### 11. Proactive Coaching
**File:** [PROACTIVE_COACH.md](PROACTIVE_COACH.md)

Documentation for proactive coaching features.

**Topics:**
- Stress pattern detection
- Notification system
- Database schema
- Image logging
- Conversational logging
- Weekly reviews

---

## 📊 Documentation Usage Flow

### Pre-Deployment Phase
1. Read [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) completely
2. Review [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
3. Understand [AI_COACH_MEMORY_RAG.md](AI_COACH_MEMORY_RAG.md) architecture

### Deployment Phase
1. Follow [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
2. Use [deploy-edge-functions.sh](../scripts/deploy-edge-functions.sh)
3. Execute [20251023_setup_cron_jobs.sql](../db/migrations/20251023_setup_cron_jobs.sql)
4. Refer to [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) for details

### Post-Deployment Phase
1. Run [verify-deployment.sh](../scripts/verify-deployment.sh)
2. Fill out [DEPLOYMENT_COMPLETION_TEMPLATE.md](DEPLOYMENT_COMPLETION_TEMPLATE.md)
3. Create git tag using [GIT_TAG_INSTRUCTIONS.md](GIT_TAG_INSTRUCTIONS.md)
4. Monitor using commands from [DEPLOYMENT_SUMMARY.md](../DEPLOYMENT_SUMMARY.md)

### Reference
- Quick commands: [DEPLOYMENT_SUMMARY.md](../DEPLOYMENT_SUMMARY.md)
- Troubleshooting: [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) Section 8

---

## 📏 Documentation Size Reference

| Document | Size | Purpose | Audience |
|----------|------|---------|----------|
| DEPLOY_AI_COACH.md | 22KB | Complete guide | DevOps, Engineers |
| PRODUCTION_CHECKLIST.md | 8KB | Deployment checklist | DevOps |
| DEPLOYMENT_SUMMARY.md | 10KB | Quick reference | All |
| deploy-edge-functions.sh | 7KB | Automation | DevOps |
| verify-deployment.sh | 6KB | Verification | DevOps, QA |
| 20251023_setup_cron_jobs.sql | 4KB | Database setup | DevOps, DBAs |
| DEPLOYMENT_COMPLETION_TEMPLATE.md | 11KB | Documentation | DevOps, Management |
| GIT_TAG_INSTRUCTIONS.md | 5KB | Release tagging | DevOps |

**Total Documentation:** ~73KB of deployment documentation

---

## 🔍 Quick Lookup

### Finding Information

**"How do I deploy Edge Functions?"**
→ [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) Section 2 or [deploy-edge-functions.sh](../scripts/deploy-edge-functions.sh)

**"What environment variables do I need?"**
→ [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) Section 5

**"How do I verify deployment?"**
→ [verify-deployment.sh](../scripts/verify-deployment.sh) or [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) Section 9

**"What is the CRON schedule?"**
→ [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) Section 2 or [DEPLOYMENT_SUMMARY.md](../DEPLOYMENT_SUMMARY.md)

**"How do I monitor the system?"**
→ [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) Section 3

**"What if something goes wrong?"**
→ [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) Section 8 (Troubleshooting)

**"How do I check CORS?"**
→ [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) Section 1

**"What about security?"**
→ [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) Section 4

---

## 📝 Document Maintenance

### Updating This Index

When adding new deployment documentation:
1. Add entry to appropriate section
2. Include file path and brief description
3. Update size reference table
4. Update quick lookup section if needed

### Version History

- **v1.0** (2025-10-23): Initial creation with 9 documentation files

---

## 🆘 Need Help?

1. **Check the troubleshooting section:** [DEPLOY_AI_COACH.md](DEPLOY_AI_COACH.md) Section 8
2. **Review the checklist:** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
3. **Run verification:** [verify-deployment.sh](../scripts/verify-deployment.sh)
4. **Check logs:** Commands in [DEPLOYMENT_SUMMARY.md](../DEPLOYMENT_SUMMARY.md)

---

**Last Updated:** 2025-10-23  
**Version:** 1.0  
**Maintained By:** STRUKT Development Team
