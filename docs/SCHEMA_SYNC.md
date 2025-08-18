# Schema Manual Update Documentation

This document explains the manual schema update process between `STRUKT1/strukt-system` (source of truth) and `STRUKT1/strukt-app` (consumer).

## Overview

**Important**: The schema sync bot has been retired. Schema specifications are now manually maintained as canonical in each repository.

When making schema changes, both repositories must be updated in the same PR to maintain consistency:

1. **strukt-system**: Update the canonical schema specification
2. **strukt-app**: Update the corresponding schema file manually
3. **Both**: Update in PR when schema changes

## Manual Schema Update Process

When schema changes are needed:

1. **Update strukt-system**: Edit `schema/AIRTABLE_SPEC.yaml` 
2. **Increment version**: Update `spec_version` and `updated_at` fields
3. **Test validation**: Run `node scripts/validate_airtable_schema.mjs --dry-run`
4. **Update strukt-app**: Copy the schema file to the strukt-app repository
5. **Coordinate PRs**: Submit PRs to both repositories simultaneously
6. **Review together**: Ensure both PRs are reviewed and merged together

## Schema Validation

The canonical spec and validator remain functional:

- **Schema Spec**: `schema/AIRTABLE_SPEC.yaml` (canonical source of truth)
- **Adapter**: `src/schema/airtableAdapter.js` (constants and field mappings)
- **Validator**: `scripts/validate_airtable_schema.mjs` (validation script)

### Running Validation

```bash
# Validate schema consistency (dry-run mode)
node scripts/validate_airtable_schema.mjs --dry-run

# Verbose output
node scripts/validate_airtable_schema.mjs --dry-run --verbose
```

## Related Documentation

- [Airtable Schema Specification Guide](AIRTABLE_SPEC_README.md)
- [Schema Validation Guide](SCHEMA_SYNC_VALIDATION.md)
- [Development Guide](DEVELOPMENT.md)

---

*Spec is canonical in each repo; update both in PR when schema changes.*