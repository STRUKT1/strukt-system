# Git Tag Instructions for AI Coach Production Release

## Creating the Release Tag

After successful deployment and verification, create a git tag to mark this release:

### Step 1: Create the Tag

```bash
# Navigate to repository
cd /path/to/strukt-system

# Create annotated tag
git tag -a v2.0-ai-coach-prod -m "AI Coach Production Release v2.0

Features:
- Production /ask endpoint with CORS wildcard support
- generateWeeklyDigest Edge Function (CRON: Sundays 8PM UTC)
- checkUserStatus Edge Function (CRON: Daily 8AM UTC)
- Comprehensive deployment documentation
- Security: RLS policies, rate limiting, JWT auth
- Monitoring: Logs, metrics, verification scripts

Deployment artifacts:
- docs/DEPLOY_AI_COACH.md - Complete deployment guide
- docs/PRODUCTION_CHECKLIST.md - Deployment checklist
- scripts/deploy-edge-functions.sh - Deployment automation
- scripts/verify-deployment.sh - Post-deployment verification
- db/migrations/20251023_setup_cron_jobs.sql - CRON setup

See DEPLOYMENT_SUMMARY.md for complete details."
```

### Step 2: Verify the Tag

```bash
# View tag details
git show v2.0-ai-coach-prod

# List all tags
git tag -l
```

### Step 3: Push the Tag

```bash
# Push the tag to remote
git push origin v2.0-ai-coach-prod

# Or push all tags
git push --tags
```

### Step 4: Create GitHub Release (Optional)

1. Go to GitHub repository: `https://github.com/STRUKT1/strukt-system`
2. Click "Releases" → "Create a new release"
3. Choose tag: `v2.0-ai-coach-prod`
4. Release title: `AI Coach Production Release v2.0`
5. Description:

```markdown
# 🚀 AI Coach Production Release v2.0

## Overview

This release deploys the STRUKT AI Coach system to production, including:
- Production-ready `/ask` endpoint with enhanced CORS support
- Automated weekly digest generation
- Proactive stress pattern detection
- Comprehensive monitoring and security

## What's New

### Backend API
- ✅ CORS wildcard support for `*.expo.dev` and `*.strukt.fit`
- ✅ Rate limiting (20 req/min for AI endpoints)
- ✅ Enhanced error handling and fallback logic
- ✅ Comprehensive logging to `ai_coach_logs`

### Supabase Edge Functions
- ✅ `generateWeeklyDigest` - Automated weekly summaries (Sundays 8 PM UTC)
- ✅ `checkUserStatus` - Proactive coaching triggers (Daily 8 AM UTC)

### Security
- ✅ Row-Level Security (RLS) on all AI coach tables
- ✅ Service role key protection (server-only)
- ✅ JWT authentication on all endpoints
- ✅ Wildcard CORS with origin validation

### Documentation
- 📄 [DEPLOY_AI_COACH.md](docs/DEPLOY_AI_COACH.md) - Complete deployment guide (22KB)
- 📄 [PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) - Step-by-step checklist (8KB)
- 📄 [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) - Quick reference (10KB)

### Deployment Tools
- 🛠️ `scripts/deploy-edge-functions.sh` - Automated deployment script
- 🛠️ `scripts/verify-deployment.sh` - Post-deployment verification
- 🛠️ `db/migrations/20251023_setup_cron_jobs.sql` - CRON setup SQL

## Database Schema

New tables with RLS:
- `ai_coach_logs` - Interaction audit trail
- `ai_coach_notes` - Weekly summaries
- `coach_notifications` - Proactive messages
- `log_embeddings` - Vector embeddings for RAG (optional)

## Deployment

See [DEPLOY_AI_COACH.md](docs/DEPLOY_AI_COACH.md) for complete instructions.

Quick start:
```bash
# Deploy Edge Functions
./scripts/deploy-edge-functions.sh --project-ref <your-ref>

# Verify deployment
./scripts/verify-deployment.sh --url https://api.strukt.fit --token <jwt>

# Schedule CRON jobs
# Run SQL from db/migrations/20251023_setup_cron_jobs.sql
```

## Breaking Changes

None. This is a new feature release with backward compatibility.

## Known Issues

None.

## Contributors

- GitHub Copilot Agent
- STRUKT Development Team

## License

Proprietary - STRUKT
```

6. Click "Publish release"

## Tag Naming Convention

- **Format:** `v{major}.{minor}-{feature}-{environment}`
- **Example:** `v2.0-ai-coach-prod`
- **Components:**
  - `v2.0` - Version number
  - `ai-coach` - Feature identifier
  - `prod` - Environment (prod, staging, dev)

## Additional Tags (Optional)

You may also want to create:

```bash
# Create a general v2.0 tag for the overall release
git tag -a v2.0 -m "STRUKT System v2.0 - AI Coach Production Release"
git push origin v2.0
```

## Rollback Tag (If Needed)

If you need to rollback:

```bash
# Tag the previous stable version for reference
git tag -a v1.9-stable -m "Stable version before v2.0-ai-coach-prod"
git push origin v1.9-stable
```

## Viewing Release History

```bash
# List all releases
git tag -l -n1

# Show specific release
git show v2.0-ai-coach-prod

# Compare releases
git diff v1.9-stable..v2.0-ai-coach-prod
```

## Deleting a Tag (If Needed)

```bash
# Delete local tag
git tag -d v2.0-ai-coach-prod

# Delete remote tag
git push origin --delete v2.0-ai-coach-prod
```

**⚠️ Warning:** Only delete tags if they haven't been used in production yet.

## After Tagging

1. Update `CHANGELOG.md` with release notes
2. Notify team of the release
3. Update documentation with release version
4. Archive deployment completion document
5. Begin monitoring post-deployment metrics

---

**Last Updated:** 2025-10-23  
**Document Version:** 1.0
