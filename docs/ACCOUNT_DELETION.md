# Account Deletion Process

**GDPR Article 17 - Right to Erasure ("Right to be Forgotten")**

## Overview

STRUKT allows users to permanently delete their account and all associated data at any time. This process is irreversible and complies with GDPR Article 17.

## Endpoint

`DELETE /v1/profile`

### Authentication
- Requires: Valid JWT token
- Rate Limit: 2 requests per 24 hours

### Request Body
```json
{
  "confirmation": "DELETE_MY_ACCOUNT_PERMANENTLY"
}
```

**CRITICAL:** The exact confirmation string is required to prevent accidental deletion.

### Response

Success (200):
```json
{
  "ok": true,
  "message": "Account successfully deleted. All data has been permanently removed.",
  "deletion_result": {
    "timestamp": "2024-11-20T...",
    "tables_deleted": 15,
    "total_records_deleted": 1247
  }
}
```

Error - Missing Confirmation (400):
```json
{
  "ok": false,
  "code": "ERR_CONFIRMATION_REQUIRED",
  "message": "Account deletion requires confirmation. Please provide confirmation: \"DELETE_MY_ACCOUNT_PERMANENTLY\""
}
```

Error - Server Error (500):
```json
{
  "ok": false,
  "code": "ERR_DELETION_FAILED",
  "message": "Failed to delete account. Please contact support for assistance."
}
```

## What Gets Deleted

The following data is PERMANENTLY deleted:

1. **User Profile** - All personal information
2. **Workouts** - All workout logs
3. **Meals** - All nutrition logs
4. **Sleep Logs** - All sleep data
5. **Mood Logs** - All mood tracking
6. **Supplements** - All supplement logs
7. **Weight Logs** - All weight tracking
8. **Photos** - All progress photos
9. **Chat History** - All AI coach conversations
10. **AI Coach Logs** - All coaching interactions
11. **Log Embeddings** - AI memory data
12. **Plans** - All generated plans
13. **Templates** - All saved templates
14. **User Consents** - All consent records
15. **Auth Account** - Authentication credentials

## Deletion Order

Data is deleted in reverse dependency order to avoid foreign key violations:

1. AI coach logs & embeddings (dependent data)
2. Activity logs (workouts, meals, sleep, mood)
3. Generated content (plans, templates)
4. User profile (main record)
5. Auth account (final step)

## Safety Measures

1. **Confirmation Required** - Exact string match prevents accidents
2. **Rate Limited** - 2 attempts per 24 hours prevents abuse
3. **Audit Logged** - All deletion attempts are logged
4. **No Recovery** - Data cannot be recovered after deletion
5. **Session Invalidation** - User logged out immediately

## Implementation Notes

- Uses Supabase Admin API for deletion
- Handles missing tables gracefully
- Logs all errors for investigation
- Returns counts of deleted records
- Atomic operation (all or nothing where possible)

## User Flow

1. User requests account deletion via app
2. App shows warning about permanent deletion
3. User must type confirmation phrase
4. App sends DELETE request with confirmation
5. Backend validates confirmation
6. Backend deletes all user data
7. Backend logs deletion audit trail
8. Backend returns success
9. App logs user out immediately

## Support

If deletion fails or data remains:
- Contact: hello@strukt.fit
- Include: Timestamp of deletion request
- We will: Manually verify and complete deletion within 24 hours

## Testing

**WARNING: Use test accounts only!**

```bash
# Test deletion endpoint (DANGEROUS - use test account!)
curl -X DELETE http://localhost:3000/v1/profile \
  -H "Authorization: Bearer test_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation": "DELETE_MY_ACCOUNT_PERMANENTLY"
  }'

# Expected response:
{
  "ok": true,
  "message": "Account successfully deleted...",
  "deletion_result": {
    "timestamp": "...",
    "tables_deleted": 15,
    "total_records_deleted": 1247
  }
}

# Test without confirmation (should fail):
curl -X DELETE http://localhost:3000/v1/profile \
  -H "Authorization: Bearer test_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 400 Bad Request - ERR_CONFIRMATION_REQUIRED
```

## Legal Compliance

This implementation complies with:
- **GDPR Article 17**: Right to Erasure ("Right to be Forgotten")
- **CCPA**: Right to Delete Personal Information
- **Other Privacy Laws**: Various international data protection regulations

## Audit Trail

All deletion attempts are logged with:
- User ID (masked)
- Timestamp
- IP address
- Confirmation status
- Deletion counts per table
- Any errors encountered
- Success/failure status
