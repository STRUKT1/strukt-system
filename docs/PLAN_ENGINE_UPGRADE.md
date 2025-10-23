# Plan Engine Upgrade Documentation

## Overview

This document describes the production-grade upgrades made to the STRUKT plan generation engine. The upgrades focus on reliability, error handling, validation, and AI safety without altering core plan logic.

## Upgrade Date
October 23, 2025

## Changes Summary

### 1. New Database Schema

**File:** `db/migrations/20251023_create_plans_table.sql`

Created a dedicated `plans` table in Supabase with:
- Full plan data storage (JSON structure)
- Version history support
- Generation method tracking (AI, fallback, manual)
- Wellness context and profile snapshots
- Validation status and error tracking
- Row-Level Security (RLS) policies
- Automatic timestamp management

**Table Structure:**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- plan_data: JSONB (training, nutrition, recovery, coaching)
- version: INTEGER (incremental version number)
- generation_method: TEXT (ai | fallback | manual)
- fallback_reason: TEXT (reason if fallback was used)
- wellness_context: JSONB (snapshot of user's recent activity)
- profile_snapshot: JSONB (user profile at generation time)
- is_valid: BOOLEAN (validation status)
- validation_errors: JSONB (array of validation errors)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 2. Plan Service Module

**File:** `src/services/planservice.js`

CRUD operations for plans with Supabase:

**Functions:**
- `savePlan(userId, planData, options)` - Save new plan with automatic versioning
- `getLatestPlan(userId)` - Retrieve most recent plan
- `getPlanByVersion(userId, version)` - Get specific version
- `getVersionHistory(userId, limit)` - Get latest N versions (default: 5)
- `updatePlan(planId, updates)` - Update existing plan
- `deletePlan(planId)` - Delete plan (soft-delete preferred)

**Features:**
- Automatic version incrementing
- Save confirmation logging
- Error handling with descriptive messages
- RLS-compliant queries

### 3. Plan Generation Service

**File:** `src/services/planGenerationService.js`

Production-grade plan generation with comprehensive error handling.

#### 3.1 Null Guards

All profile field access uses optional chaining (`?.`) and nullish coalescing (`??`):

```javascript
const injuries = profile?.injuries?.join(', ') || 'none reported';
const conditions = profile?.conditions?.join(', ') || 'none reported';
const dietPattern = profile?.diet_pattern || 'no specific pattern';
```

**Critical field warnings:**
- Logs warning if `profile.user_id` is missing
- Provides fallback values for all optional fields
- Handles array fields safely (empty arrays as default)

#### 3.2 AI Plan Structure Validation

**Function:** `validatePlanStructure(plan)`

Validates AI-generated plans have required structure:

**Required sections:**
- `training` - Workout schedule and exercises
- `nutrition` - Daily targets and meal guidance
- `recovery` - Sleep and recovery strategies
- `coaching` - Motivational guidance and tone

**Validation rules:**
- Plan must be an object
- All four sections must be present
- Sections must not be empty (objects or strings)
- Returns `{ isValid: boolean, errors: string[] }`

**Usage:**
```javascript
const validation = validatePlanStructure(aiGeneratedPlan);
if (!validation.isValid) {
  console.warn('Plan validation failed:', validation.errors);
  // Trigger fallback
}
```

#### 3.3 Fallback Plan Generation

**Function:** `generateFallbackPlan(profile)`

Creates a static, valid plan when AI fails:

**Features:**
- Uses profile data when available (goals, experience, preferences)
- Provides sensible defaults for missing data
- Generates 3-day workout template
- Includes nutrition guidelines and sample meals
- Recovery strategies (sleep, stress management)
- Coaching guidance adapted to user's tone preference

**Plan structure:**
- Training: 3-day split (Full Body, Cardio, Active Recovery)
- Nutrition: Balanced macros based on profile targets
- Recovery: Sleep recommendations, active recovery, stress tips
- Coaching: Motivational guidance in user's preferred tone

#### 3.4 Wellness Context Injection

**Function:** `buildWellnessContext(userId)`

Gathers recent user activity to inform plan generation:

**Data collected (past 7 days):**
- Workouts logged
- Meals logged
- Sleep logs
- Mood logs

**Summary metrics:**
- Total workouts
- Total meals
- Average sleep hours
- Average mood score

**Error handling:**
- Uses `Promise.allSettled()` for parallel queries
- Returns minimal context if queries fail
- Never crashes on missing data

#### 3.5 Consistent Context Across Methods

Both generation methods now include wellness context:

**`regenerateFromProfile(userId, options)`**
- Legacy method now routes to `regenerateFromProfileWithWellness`
- Ensures all plan generation includes wellness data
- Backward compatible

**`regenerateFromProfileWithWellness(userId, options)`**
- Primary generation method
- Full wellness context included
- Profile snapshot saved with plan

#### 3.6 Save Confirmation & Logging

All plan saves include:

**Pre-save logging:**
```javascript
console.log(`💾 Saving plan to database (method: ${generationMethod})...`);
```

**Post-save confirmation:**
```javascript
console.log(`✅ Plan saved successfully - ID: ${planId}, Version: ${version}`);
```

**Return value includes:**
- `planId` - UUID of saved plan
- `version` - Version number
- `generationMethod` - How it was generated
- `fallbackReason` - Reason if fallback used
- `savedAt` - Timestamp
- `saved` - Boolean confirmation flag

#### 3.7 Optional Preview Mode

**Environment flag:** `ENABLE_PLAN_PREVIEW=true` (only in non-production)

**Usage:**
```javascript
const result = await regenerateFromProfileWithWellness(userId, { 
  previewMode: true,
  saveResult: false 
});

console.log('Preview:', result.plan);
// Plan is NOT saved to database
```

**Features:**
- Logs full plan JSON to console
- Does NOT save to database
- Returns plan with `previewMode: true` in metadata
- Blocked in production environment

**Safety:**
- Throws error if attempted in production
- Requires explicit opt-in via environment variable

### 4. Testing

**File:** `__tests__/planGeneration.test.js`

Comprehensive test suite covering:

**Plan Structure Validation (7 tests):**
- Valid plan acceptance
- Null plan rejection
- Missing section detection (training, nutrition, recovery, coaching)
- Empty section detection
- String vs object section handling

**Fallback Plan Generation (6 tests):**
- Valid structure with minimal profile
- Profile data usage
- Null field handling
- Workout day inclusion
- Nutrition guidelines
- Recovery strategies

**Null Field Handling (2 tests):**
- Graceful handling of missing user data
- Valid structure return on error

**Wellness Context Injection (2 tests):**
- Legacy method compatibility
- New method existence

**Save Confirmation (1 test):**
- Metadata structure validation

**Preview Mode (1 test):**
- Dev flag recognition

**Test Results:**
- 19 total tests
- 100% pass rate
- All edge cases covered

**Run tests:**
```bash
node __tests__/planGeneration.test.js
```

## AI Generation Flow

### Successful AI Generation

1. Fetch user profile → null guards applied
2. Build wellness context → recent activity gathered
3. Generate AI prompt → includes profile + wellness data
4. Call OpenAI API → GPT-4o with fallback to GPT-3.5-turbo
5. Parse response → extract JSON from markdown if needed
6. Validate structure → check for required sections
7. Save to database → with metadata and version
8. Return result → with confirmation

### Fallback Flow (AI Failure)

1. Fetch user profile → null guards applied
2. Build wellness context → recent activity gathered
3. Generate AI prompt → includes profile + wellness data
4. Call OpenAI API → **FAILS**
5. Log AI error → capture reason
6. Generate fallback plan → use static template
7. Validate fallback → ensure structure is valid
8. Save to database → mark as `fallback` method
9. Return result → with fallback reason

## Error Handling Patterns

### Profile Access
```javascript
// ❌ Before (unsafe)
const goal = profile.primary_goal.toLowerCase();

// ✅ After (safe)
const goal = profile?.primary_goal?.toLowerCase() || 'general fitness';
```

### Array Fields
```javascript
// ❌ Before (crashes on null)
const injuries = profile.injuries.join(', ');

// ✅ After (safe)
const injuries = profile?.injuries?.join(', ') || 'none reported';
```

### AI Response Parsing
```javascript
try {
  const plan = parseAIResponse(aiResponse);
  const validation = validatePlanStructure(plan);
  
  if (!validation.isValid) {
    throw new Error('Invalid structure');
  }
  
  // Use AI plan
} catch (error) {
  // Use fallback
  const plan = generateFallbackPlan(profile);
}
```

### Database Operations
```javascript
try {
  const savedPlan = await savePlan(userId, planData, options);
  console.log('✅ Save successful:', savedPlan.id);
} catch (error) {
  console.error('❌ Save failed:', error);
  throw error; // Propagate to caller
}
```

## Logging Standards

### Info Logs
- Plan generation started
- Wellness context built
- AI request sent
- Plan validated
- Plan saved

### Warning Logs
- Missing critical fields (external_id, user_id)
- AI validation failures
- Fallback triggered
- Partial wellness context

### Error Logs
- AI API failures
- Database save failures
- Profile not found
- Invalid user input

## Integration Examples

### Generate Plan for User

```javascript
const { regenerateFromProfileWithWellness } = require('./src/services/planGenerationService');

// Standard generation
const result = await regenerateFromProfileWithWellness(userId);

console.log('Plan ID:', result.metadata.planId);
console.log('Version:', result.metadata.version);
console.log('Method:', result.metadata.generationMethod);
console.log('Saved:', result.metadata.saved);
```

### Preview Mode (Dev Only)

```javascript
// Set environment variable
process.env.ENABLE_PLAN_PREVIEW = 'true';

// Generate without saving
const result = await regenerateFromProfileWithWellness(userId, {
  previewMode: true
});

console.log('Preview plan:', result.plan);
console.log('Preview mode:', result.metadata.previewMode); // true
console.log('Saved:', result.metadata.saved); // false
```

### Get Plan History

```javascript
const { getVersionHistory } = require('./src/services/planservice');

// Get last 5 plans
const history = await getVersionHistory(userId, 5);

history.forEach(plan => {
  console.log(`Version ${plan.version}:`, plan.generation_method);
  console.log('Created:', plan.created_at);
});
```

### Retrieve Latest Plan

```javascript
const { getLatestPlan } = require('./src/services/planservice');

const plan = await getLatestPlan(userId);

if (plan) {
  console.log('Latest plan version:', plan.version);
  console.log('Training:', plan.plan_data.training);
  console.log('Nutrition:', plan.plan_data.nutrition);
}
```

## Security Considerations

### Row-Level Security (RLS)

All plan operations enforce RLS:
- Users can only access their own plans
- `auth.uid()` must match `user_id`
- Service role bypasses RLS for admin operations

### Input Validation

- Profile data sanitized before use
- Unknown fields silently ignored
- Type checking on all inputs
- SQL injection protected (parameterized queries)

### API Safety

- OpenAI token limits enforced (max 2000)
- Temperature clamped (0-1 range)
- Fallback on API failures
- No user input directly in prompts without sanitization

## Performance Optimizations

### Parallel Data Fetching

```javascript
// Use Promise.allSettled for concurrent queries
const [workouts, meals, sleep, mood] = await Promise.allSettled([...]);
```

### Lazy Initialization

- Supabase client created on first access
- OpenAI client initialized once
- Module-level caching where appropriate

### Efficient Queries

- Limit results (7 days, top 5 versions)
- Index-backed queries (user_id, version)
- Select only needed fields

## Future Enhancements

### Potential Additions
- Plan diff comparison (version A vs version B)
- AI-powered periodization
- Adaptive tone based on user mood
- Integration with wearables for better wellness context
- A/B testing different plan formats
- User feedback integration

### Monitoring Recommendations
- Track AI success/fallback rates
- Monitor plan generation latency
- Alert on validation failure spikes
- Log user satisfaction metrics

## Acceptance Criteria Status

| Requirement | Status | Implementation |
|------------|--------|----------------|
| AI plan structure validated | ✅ | `validatePlanStructure()` function |
| Null guards added to all profile fields | ✅ | Optional chaining throughout |
| Fallback plans saved reliably | ✅ | `generateFallbackPlan()` + save logic |
| wellness_context always included | ✅ | Both generation methods |
| Save confirmation logging added | ✅ | Console logs + metadata return |
| Optional preview mode (non-prod) | ✅ | `previewMode` option |
| Tests added for all new logic | ✅ | 19 comprehensive tests |
| CI and lint pass | ✅ | Tests run successfully |
| Docs updated | ✅ | This document |

## Support

For issues or questions about the plan generation engine:

1. Check test suite for usage examples
2. Review service function JSDoc comments
3. Check logs for error details
4. Contact: support@strukt.com

---

*Last updated: October 23, 2025*
