# Quick Guide: Complete GDPR Endpoint Testing with Supabase

This guide shows how to complete the remaining 7 tests that require Supabase authentication.

## Prerequisites Checklist

- [ ] Supabase project created
- [ ] Supabase credentials added to `.env`
- [ ] Server restarted with new credentials
- [ ] Test user account created
- [ ] JWT token obtained

---

## Step 1: Configure Supabase

Edit `/home/user/strukt-system/.env`:

```bash
# Replace placeholders with real values
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Restart server:
```bash
pkill -f "node src/index.js"
npm start
```

---

## Step 2: Create Test User

**Via Supabase Dashboard:**
1. Go to Authentication → Users → Add User
2. Email: `gdpr-test@strukt.fit`
3. Password: `TestPassword123!`
4. Save user ID

**Via API:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gdpr-test@strukt.fit",
    "password": "TestPassword123!"
  }'
```

---

## Step 3: Get JWT Token

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gdpr-test@strukt.fit",
    "password": "TestPassword123!"
  }'
```

Save the `access_token` from the response:
```bash
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Step 4: Add Test Data

Create sample data for the test user:

```bash
# Create workout
curl -X POST http://localhost:4000/v1/workouts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "strength_training",
    "duration_minutes": 45,
    "notes": "GDPR test workout"
  }'

# Create meal
curl -X POST http://localhost:4000/v1/meals \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "meal_type": "lunch",
    "description": "GDPR test meal",
    "calories": 500
  }'

# Create more test data as needed...
```

---

## Step 5: Test SAR Endpoint

### Test 1.4: Valid SAR Request

```bash
# Export all data
curl -X GET http://localhost:4000/v1/profile/export \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -v

# Expected: 200 OK
# Expected: JSON with export data
```

**Verify:**
- [ ] Status code is 200
- [ ] Response contains `export_info` with timestamp
- [ ] Response contains `profile` object
- [ ] Response contains all data arrays (workouts, meals, etc.)
- [ ] Test workout appears in `workouts` array
- [ ] Test meal appears in `meals` array

Save export to file:
```bash
curl -X GET http://localhost:4000/v1/profile/export \
  -H "Authorization: Bearer $JWT_TOKEN" \
  > before-deletion.json

# Count records
jq '.export.workouts | length' before-deletion.json
jq '.export.meals | length' before-deletion.json
```

### Test 1.5: SAR Rate Limiting

```bash
# Make 6 requests rapidly
for i in {1..6}; do
  echo "Request $i:"
  curl -X GET http://localhost:4000/v1/profile/export \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

**Verify:**
- [ ] First 5 requests return 200 OK
- [ ] 6th request returns 429 Too Many Requests
- [ ] Error message mentions rate limit

---

## Step 6: Test Deletion Endpoint

### Test 2.3: Deletion Without Confirmation

```bash
# Try deletion without confirmation field
curl -X DELETE http://localhost:4000/v1/profile \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -v

# Expected: 400 Bad Request
# Expected code: ERR_CONFIRMATION_REQUIRED
```

**Verify:**
- [ ] Status code is 400
- [ ] Error code is `ERR_CONFIRMATION_REQUIRED`
- [ ] Error message explains confirmation requirement

### Test 2.4: Deletion With Wrong Confirmation

```bash
# Try deletion with incorrect confirmation string
curl -X DELETE http://localhost:4000/v1/profile \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmation": "DELETE_MY_ACCOUNT"}' \
  -v

# Expected: 400 Bad Request
```

**Verify:**
- [ ] Status code is 400
- [ ] Deletion does not occur

### Test 2.5: Valid Deletion (DESTRUCTIVE!)

⚠️ **WARNING:** This PERMANENTLY deletes ALL data! Use TEST ACCOUNT only!

```bash
# First, verify you have the before-deletion export
ls -lh before-deletion.json

# Now delete the account
curl -X DELETE http://localhost:4000/v1/profile \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmation": "DELETE_MY_ACCOUNT_PERMANENTLY"}' \
  > deletion-result.json

# Check result
cat deletion-result.json | jq .
```

**Verify:**
- [ ] Status code is 200 OK
- [ ] Response contains `deletion_result` object
- [ ] `deletion_counts` shows counts for each table
- [ ] `tables_deleted` count is 15+
- [ ] `total_records_deleted` > 0

### Test 2.6: Verify Deletion Completeness

```bash
# Try to get profile after deletion (should fail)
curl -X GET http://localhost:4000/v1/profile \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -v

# Expected: 401 Unauthorized or 404 Not Found
```

**Verify:**
- [ ] Profile endpoint returns error
- [ ] Cannot access any user data
- [ ] User no longer exists in database

### Test 2.7: Deletion Rate Limiting

This test requires multiple test accounts:

```bash
# Create 3 test users (user1, user2, user3)
# Get JWT tokens for all 3
# Delete first 2 successfully
# Third deletion should fail with 429
```

**Verify:**
- [ ] First 2 deletions return 200 OK
- [ ] 3rd deletion returns 429 Too Many Requests

---

## Step 7: Document Results

Update `GDPR_ENDPOINTS_TEST_REPORT.md` with results:

```markdown
### Testing (Manual - With Supabase)
- [x] SAR with valid authentication - PASS
- [x] SAR rate limiting verified - PASS
- [x] Data export completeness verified - PASS
- [x] Deletion with valid authentication - PASS
- [x] Deletion confirmation logic verified - PASS
- [x] Deletion completeness verified - PASS
- [x] Deletion rate limiting verified - PASS/SKIP

### Production Readiness
- [x] All manual tests completed
- [x] GDPR endpoints verified and production-ready
```

---

## Test Results Template

Copy this to document your test results:

```markdown
## Manual Test Results (With Supabase)

**Date:** [DATE]
**Tester:** [NAME]
**Environment:** [Development/Staging]
**Test User:** gdpr-test@strukt.fit

### SAR Endpoint Results

**Test 1.4: Valid SAR Request**
- Status: PASS/FAIL
- Response code: [CODE]
- Records exported:
  - Workouts: [COUNT]
  - Meals: [COUNT]
  - Sleep logs: [COUNT]
  - etc.
- Notes: [ANY ISSUES]

**Test 1.5: Rate Limiting**
- Status: PASS/FAIL
- Request 1-5: [CODES]
- Request 6: [CODE]
- Notes: [ANY ISSUES]

### Deletion Endpoint Results

**Test 2.3: Without Confirmation**
- Status: PASS/FAIL
- Response code: [CODE]
- Notes: [ANY ISSUES]

**Test 2.4: Wrong Confirmation**
- Status: PASS/FAIL
- Response code: [CODE]
- Notes: [ANY ISSUES]

**Test 2.5: Valid Deletion**
- Status: PASS/FAIL
- Response code: [CODE]
- Records deleted: [COUNT]
- Tables affected: [COUNT]
- Notes: [ANY ISSUES]

**Test 2.6: Deletion Completeness**
- Status: PASS/FAIL
- Profile accessible: YES/NO
- Data accessible: YES/NO
- Notes: [ANY ISSUES]

**Test 2.7: Rate Limiting**
- Status: PASS/FAIL/SKIP
- Notes: [ANY ISSUES]

### Summary

Total Tests: 7
Passed: [COUNT]
Failed: [COUNT]
Skipped: [COUNT]

Issues Found: [LIST]

Production Ready: YES/NO
```

---

## Troubleshooting

### Issue: 503 AUTH_UNAVAILABLE

**Cause:** Supabase credentials not configured or invalid

**Fix:**
1. Check `.env` file has real credentials (not placeholders)
2. Verify credentials are correct in Supabase dashboard
3. Restart server: `pkill -f "node src/index.js" && npm start`

### Issue: 401 INVALID_TOKEN

**Cause:** JWT token expired or invalid

**Fix:**
1. Get fresh token (tokens expire after 1 hour by default)
2. Use the token immediately after obtaining it
3. Check token is being sent correctly in Authorization header

### Issue: Cannot find user data in export

**Cause:** Data not created or created for different user

**Fix:**
1. Verify you're creating data with the correct JWT token
2. Check data exists in Supabase dashboard
3. Verify RLS policies allow data access

### Issue: Deletion doesn't delete all data

**Cause:** Missing tables or RLS policies blocking deletion

**Fix:**
1. Check Supabase logs for errors
2. Verify service role key (not anon key) is used for deletion
3. Check RLS policies allow deletion

---

## Clean Up

After testing, clean up test data:

```bash
# If test account still exists, delete it
curl -X DELETE http://localhost:4000/v1/profile \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmation": "DELETE_MY_ACCOUNT_PERMANENTLY"}'

# Or delete via Supabase Dashboard:
# Authentication → Users → [Find test user] → Delete
```

---

## Next Steps

After all tests pass:

1. ✅ Update test report with results
2. ✅ Mark GDPR endpoints as production-ready
3. ✅ Commit test results to repository
4. ✅ Deploy to staging for QA testing
5. ✅ Get legal sign-off on GDPR compliance
6. ✅ Deploy to production
7. ✅ Include in TestFlight build

---

**Happy Testing! 🧪**
