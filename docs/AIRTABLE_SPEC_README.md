# Airtable Schema Specification Guide

This document explains how to work with the canonical Airtable schema specification (`schema/AIRTABLE_SPEC.yaml`) that unifies schema management across strukt-system and strukt-app.

## Overview

The STRUKT system now uses a single canonical schema specification that:
- Defines all Airtable tables, fields, and their properties
- Provides typed access through adapter modules
- Supports safe field migrations with shadow writes
- Ensures consistency across frontend and backend

## Schema Ownership

- **Owner Repository**: `strukt-system`
- **Spec Location**: `schema/AIRTABLE_SPEC.yaml`
- **Version**: Tracked in the YAML file with `version` and `updated_at` fields

## Making Schema Changes

### 1. Editing the Specification

**Only edit the spec in the strukt-system repository.** Changes should be made in the following order:

1. Update `schema/AIRTABLE_SPEC.yaml` in strukt-system
2. Increment the `version` field (use semantic versioning)
3. Update the `updated_at` field to current date
4. Test changes with validation script
5. Open coordinated PRs in both repositories

### 2. Adding New Fields

When adding a new field:

```yaml
tables:
  your_table:
    fields:
      new_field:
        id: fldXXXXXXXXXXXXX  # Get from Airtable
        name: "Display Name"
        type: string
        required: false
        role: description_of_use
        description: "What this field is for"
```

### 3. Renaming Fields (Safe Migration)

When renaming a field, use deprecations for backward compatibility:

```yaml
tables:
  your_table:
    fields:
      new_canonical_name:
        id: fldXXXXXXXXXXXXX
        name: "New Display Name"
        type: string
        required: false

deprecations:
  fields:
    your_table:
      old_field_name: new_canonical_name
```

This enables shadow writes where both old and new field names are written during the migration period.

## Using the Adapter

### Backend (strukt-system)

```javascript
const { adapter } = require('./src/schema/airtableAdapter.js');

// Get table/field IDs
const userId = adapter.getTableId('users');
const emailFieldId = adapter.getFieldId('users', 'email_address');

// For backward compatibility with existing code
const { getTableIds, getFieldIds } = require('./src/schema/airtableAdapter.js');
const TABLE_IDS = getTableIds();  // Same format as before
const FIELD_IDS = getFieldIds();  // Same format as before
```

### Frontend (strukt-app)

```javascript
import { adapter } from './src/services/airtableSchema.js';

// Similar API as backend
const tableId = adapter.getTableId('users');
```

## Shadow Writes for Safe Migration

Shadow writes allow gradual field migrations without breaking changes:

### Enabling Shadow Writes

Set environment variable (enabled by default):
```bash
ENABLE_AIRTABLE_SHADOW_WRITES=true
```

### How Shadow Writes Work

1. **Write Phase**: When writing to Airtable, both canonical and legacy field names are written
2. **Read Phase**: When reading from Airtable, canonical names are preferred, legacy names are fallback
3. **Migration Complete**: After all systems use canonical names, remove legacy field from Airtable

### Implementation Example

```javascript
// In logging utilities
function writeRecord(tableName, data) {
  let payload = data;
  
  if (adapter.isShadowWriteEnabled()) {
    payload = adapter.mapOutgoing(tableName, data);
  }
  
  // Write to Airtable
  return airtableAPI.create(tableId, payload);
}

function readRecord(tableName, record) {
  return adapter.mapIncoming(tableName, record);
}
```

## Validation and CI

### Local Validation

```bash
# Dry-run validation (checks spec consistency)
node scripts/validate_airtable_schema.mjs

# Live validation (requires Airtable credentials)
AIRTABLE_BASE_ID=appXXX AIRTABLE_API_KEY=patXXX node scripts/validate_airtable_schema.mjs
```

### CI Integration

The validation script is integrated into CI pipelines:

- **strukt-system**: Validates that code matches spec
- **strukt-app**: Warns if spec version differs from strukt-system main branch

## Manual Schema Updates Across Repositories

**Important**: The schema sync bot has been retired. Schema specifications are now manually maintained as canonical in each repository.

### Process for Schema Changes

When updating the Airtable schema specification:

1. **Update strukt-system**:
   - Edit `schema/AIRTABLE_SPEC.yaml`
   - Increment `spec_version` and update `updated_at`
   - Test: `node scripts/validate_airtable_schema.mjs --dry-run`

2. **Update strukt-app**:
   - Copy the updated schema file from strukt-system
   - Update any code that uses the changed fields
   - Test compatibility with the mobile app

3. **Coordinate PRs**:
   - Submit PRs to both repositories simultaneously  
   - Reference the corresponding PR in each repository
   - Ensure both PRs are reviewed and merged together

### Manual Sync Commands

```bash
# Copy schema from strukt-system to strukt-app
cp /path/to/strukt-system/schema/AIRTABLE_SPEC.yaml /path/to/strukt-app/schema/

# Verify changes
diff /path/to/strukt-system/schema/AIRTABLE_SPEC.yaml /path/to/strukt-app/schema/AIRTABLE_SPEC.yaml
```

**Note**: Spec is canonical in each repo; update both in PR when schema changes.

## Best Practices

### 1. Field Naming Convention

- Use `snake_case` for field names in the spec
- Use descriptive names that clearly indicate purpose
- Include `role` field to document field usage

### 2. Migration Strategy

- Always use deprecations for renames
- Keep shadow writes enabled during migrations
- Remove deprecated fields only after confirming no usage

### 3. Documentation

- Document the purpose of each field in the `description`
- Use `role` to categorize field usage (ai_context, timestamp, etc.)
- Update this README when adding new patterns

## Troubleshooting

### Spec Version Drift

If strukt-app shows version warnings:
1. Check latest spec version in strukt-system
2. Copy latest `schema/AIRTABLE_SPEC.yaml` to strukt-app
3. Update any code that references changed fields
4. Test and open PR

### Field ID Mismatches

If validation fails with field ID mismatches:
1. Check Airtable field IDs are correct in spec
2. Ensure field names match between spec and code
3. Verify adapter mappings are correct

### Shadow Write Issues

If shadow writes aren't working:
1. Check `ENABLE_AIRTABLE_SHADOW_WRITES` environment variable
2. Verify `mapOutgoing`/`mapIncoming` functions in adapter
3. Check deprecations section in YAML spec

## Schema Version History

- **v1.0.0** (2025-08-16): Initial unified schema specification
  - Consolidated all existing table and field definitions
  - Added adapter module for typed access
  - Implemented shadow write capabilities
  - Fixed hard-coded table IDs in memoryService.js and personalisationService.js
  - Added missing "Created" field ID for chat table sorting