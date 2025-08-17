# Schema Sync Documentation

This document explains the automated schema synchronization system between `STRUKT1/strukt-system` (source of truth) and `STRUKT1/strukt-app` (consumer).

## Overview

The schema sync system keeps `schema/AIRTABLE_SPEC.yaml` perfectly aligned between repositories through:

1. **Drift Detection**: Automatically detects when schemas differ between repositories
2. **Automated Sync**: Creates PRs in the consumer repository when the source of truth changes
3. **PR Comments**: Provides clear feedback when drift is detected during development

## Architecture

```
STRUKT1/strukt-system (Source of Truth)
├── schema/AIRTABLE_SPEC.yaml     ← Canonical schema
├── .github/workflows/
│   ├── schema-drift.yml          ← Drift detection
│   └── schema-sync-bot.yml       ← Auto-sync to strukt-app
└── docs/SCHEMA_SYNC.md

STRUKT1/strukt-app (Consumer)  
├── schema/AIRTABLE_SPEC.yaml     ← Synced from strukt-system
├── .github/workflows/
│   └── schema-drift.yml          ← Drift detection
└── docs/SCHEMA_SYNC.md
```

## How It Works

### 1. Drift Detection (`schema-drift.yml`)

**Triggers:**
- Pull requests that modify `schema/AIRTABLE_SPEC.yaml`
- Manual workflow dispatch

**Process:**
1. Fetches the peer repository's schema file via GitHub API
2. Compares file hashes and metadata (version, updated_at, table/field counts)
3. Creates a drift report artifact with comparison details
4. Comments on PRs when drift is detected
5. **In strukt-system**: Fails the workflow if drift detected (enforces source of truth)
6. **In strukt-app**: Warns but doesn't fail (allows local development)

### 2. Automated Sync (`schema-sync-bot.yml`)

**Triggers:**
- Push to `main` branch when `schema/AIRTABLE_SPEC.yaml` changes
- Manual workflow dispatch

**Process:**
1. Detects schema changes in strukt-system
2. Clones strukt-app repository
3. Creates/updates a sync branch with new schema
4. Opens/updates PR with detailed change summary
5. Applies labels: `schema-sync`, `bot`, `safe-to-merge`
6. Runs validation if available

**Idempotent Behavior:**
- Updates existing sync PRs instead of creating duplicates
- Skips sync if schemas are already identical
- Handles force sync via manual dispatch

## Setup Requirements

### Required Secrets

Both repositories need these GitHub secrets:

| Secret | Description | Scope |
|--------|-------------|-------|
| `GH_PAT` | GitHub Personal Access Token | `repo` scope for both STRUKT1/strukt-system and STRUKT1/strukt-app |

### Optional Configuration

| Secret | Default | Description |
|--------|---------|-------------|
| `SCHEMA_SYNC_DISABLED` | `false` | Set to `true` to disable all sync operations |

### Setting up GitHub PAT

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create token with `repo` scope
3. Add as `GH_PAT` secret in both repositories:
   - STRUKT1/strukt-system → Settings → Secrets and variables → Actions
   - STRUKT1/strukt-app → Settings → Secrets and variables → Actions

## Manual Operations

### Running Drift Detection

```bash
# Via GitHub Actions (manual trigger)
gh workflow run schema-drift.yml -R STRUKT1/strukt-system
gh workflow run schema-drift.yml -R STRUKT1/strukt-app

# Local comparison (requires curl and GH_PAT)
curl -sSL -H "Authorization: token $GH_PAT" \
  "https://raw.githubusercontent.com/STRUKT1/strukt-app/main/schema/AIRTABLE_SPEC.yaml" \
  -o peer_schema.yaml

sha256sum schema/AIRTABLE_SPEC.yaml peer_schema.yaml
```

### Force Sync Schema

```bash
# Trigger sync bot manually
gh workflow run schema-sync-bot.yml -R STRUKT1/strukt-system

# Force sync even if no changes detected
gh workflow run schema-sync-bot.yml -R STRUKT1/strukt-system -f force_sync=true
```

### Manual Schema Sync

If automated sync fails, you can manually sync:

```bash
# 1. Clone both repositories
git clone https://github.com/STRUKT1/strukt-system.git
git clone https://github.com/STRUKT1/strukt-app.git

# 2. Copy schema file
cp strukt-system/schema/AIRTABLE_SPEC.yaml strukt-app/schema/

# 3. Create PR in strukt-app
cd strukt-app
git checkout -b manual-schema-sync-$(date +%Y%m%d)
git add schema/AIRTABLE_SPEC.yaml
git commit -m "chore(schema): manual sync AIRTABLE_SPEC from strukt-system"
git push -u origin manual-schema-sync-$(date +%Y%m%d)

# 4. Open PR via GitHub CLI or web interface
gh pr create --title "chore(schema): manual sync AIRTABLE_SPEC from strukt-system" \
  --body "Manual schema sync. Please review changes carefully." \
  --label "schema-sync,manual"
```

## Schema Change Workflow

### Making Schema Changes (strukt-system)

1. **Update schema**: Modify `schema/AIRTABLE_SPEC.yaml`
2. **Update metadata**: Increment `spec_version` and update `updated_at`
3. **Open PR**: Create PR in strukt-system
4. **CI checks**: Drift detection runs, may show drift with strukt-app
5. **Review & merge**: After approval, merge to main
6. **Auto-sync**: Sync bot automatically creates PR in strukt-app
7. **Coordinate**: Review and merge strukt-app PR

### Handling Drift in strukt-app

If drift is detected in strukt-app (schema differs from strukt-system):

1. **Check for sync PR**: Look for existing schema-sync PR from bot
2. **Update code**: Ensure app code is compatible with new schema
3. **Merge sync PR**: Accept the schema changes from strukt-system
4. **Manual sync**: If no auto-sync PR exists, perform manual sync

## Troubleshooting

### Common Issues

**"Drift detected" in CI**
- Check if there's a pending sync PR in the target repository
- Verify the schema change is intentional
- Ensure `GH_PAT` secret is configured correctly

**Sync bot not triggering**
- Check if `SCHEMA_SYNC_DISABLED=true` is set
- Verify the schema file actually changed in the commit
- Check `GH_PAT` token permissions and expiration

**PR creation fails**
- Verify `GH_PAT` has `repo` scope for target repository
- Check if target repository exists and is accessible
- Ensure bot user has write permissions to target repository

### Debug Information

**View drift reports:**
```bash
# Download artifact from workflow run
gh run list -w schema-drift.yml -R STRUKT1/strukt-system
gh run download <run-id> -R STRUKT1/strukt-system
cat schema-drift-report/schema_drift_report.json
```

**Check sync bot logs:**
```bash
gh run list -w schema-sync-bot.yml -R STRUKT1/strukt-system
gh run view <run-id> -R STRUKT1/strukt-system
```

### Disabling Sync

To temporarily disable schema sync:

```bash
# Set in repository secrets
gh secret set SCHEMA_SYNC_DISABLED -b "true" -R STRUKT1/strukt-system
gh secret set SCHEMA_SYNC_DISABLED -b "true" -R STRUKT1/strukt-app

# Re-enable later
gh secret delete SCHEMA_SYNC_DISABLED -R STRUKT1/strukt-system
gh secret delete SCHEMA_SYNC_DISABLED -R STRUKT1/strukt-app
```

## Monitoring and Maintenance

### Regular Checks

- **Weekly**: Review any open schema-sync PRs
- **Monthly**: Verify `GH_PAT` token hasn't expired
- **After major changes**: Monitor sync success and drift detection

### Metrics to Track

- Time between schema changes and successful sync
- Number of manual interventions required
- Failed sync operations

### Best Practices

1. **Single Source of Truth**: Always make schema changes in strukt-system first
2. **Coordinate Changes**: Communicate schema changes with app team
3. **Test Locally**: Validate schema changes before committing
4. **Monitor PRs**: Review auto-generated PRs promptly
5. **Document Changes**: Include migration notes in PR descriptions

## Security Considerations

- `GH_PAT` tokens should use minimal required permissions (`repo` scope only)
- Tokens should be regularly rotated (recommended: every 90 days)
- Bot-created PRs should be reviewed before merging
- Consider using GitHub Apps instead of PATs for enhanced security

## Related Documentation

- [Airtable Schema Specification Guide](AIRTABLE_SPEC_README.md)
- [Schema Validation Guide](SCHEMA_SYNC_VALIDATION.md)
- [Development Guide](DEVELOPMENT.md)

---

*For questions about the schema sync system, please refer to this documentation or open an issue in the STRUKT1/strukt-system repository.*