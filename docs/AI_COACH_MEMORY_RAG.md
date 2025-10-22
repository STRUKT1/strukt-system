# AI Coach Memory & RAG System

## Overview

The STRUKT AI Coach Memory System transforms the AI coach from a simple question-answer system into a **long-term, context-aware coaching engine**. This system provides:

1. **Short-term memory**: Last 7 days of user interactions
2. **Long-term memory**: Weekly summaries stored as natural language notes
3. **Semantic memory**: Vector-based RAG (Retrieval-Augmented Generation) for recalling contextually relevant past events
4. **Proactive coaching**: Automatic detection of stress patterns and supportive interventions

---

## Architecture

### Memory Layers

```
┌─────────────────────────────────────────────────────────┐
│                    AI Coach Prompt                      │
├─────────────────────────────────────────────────────────┤
│  1. System Prompt (static)                             │
│  2. Recent Conversation (session memory)               │
│  3. Last 7 Days Summary (short-term memory)            │
│  4. Weekly Summaries (long-term memory)                │
│  5. Relevant Past Logs (semantic memory via RAG)       │
│  6. User Profile (goals, conditions, preferences)      │
│  7. Current Plan (active program)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 1. ai_coach_notes

Stores weekly natural-language summaries of user activity.

```sql
CREATE TABLE ai_coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  note TEXT NOT NULL,
  type TEXT CHECK (type IN ('weekly_summary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
- Users can view their own notes
- Service role can insert and view all notes

**Indexes:**
- `user_id` for user-specific queries
- `created_at DESC` for chronological retrieval
- `type` for filtering by note type

### 2. log_embeddings

Stores vector embeddings of logs for semantic search.

```sql
CREATE TABLE log_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  log_type TEXT NOT NULL,
  log_id UUID NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
- Users can view their own embeddings
- Service role can insert and view all embeddings

**Indexes:**
- `user_id` for user-specific queries
- `created_at DESC` for date filtering
- `log_type` for filtering by activity type
- HNSW index on `embedding` for fast vector similarity search

**Vector Index:**
```sql
CREATE INDEX idx_log_embeddings_vector 
  ON log_embeddings 
  USING hnsw (embedding vector_cosine_ops);
```

### 3. coach_notifications

Stores proactive coaching messages triggered by user patterns.

```sql
CREATE TABLE coach_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('ai_coach_proactive')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
- Users can view and update their own notifications
- Service role can insert and view all notifications

**Indexes:**
- `user_id` for user-specific queries
- `created_at DESC` for chronological retrieval
- `read` for filtering unread notifications

---

## Supabase Edge Functions

### 1. generateWeeklyDigest

**Purpose:** Generate natural-language summaries of weekly user activity.

**Schedule:** Every Sunday via CRON

**Process:**
1. Fetch all users with activity in the past 7 days
2. Retrieve logs from `ai_coach_logs` for each user
3. Use OpenAI (gpt-4o-mini) to generate a concise summary
4. Store summary in `ai_coach_notes` with type `weekly_summary`

**Example Output:**
```
Joe trained 3 times this week (Upper Body, Push Day, Cardio). 
Logged 4 meals per day with good protein intake. Reported 
high stress on Tuesday and Thursday. Sleep quality appears 
to be affected by work pressure.
```

**File:** `/supabase/functions/generateWeeklyDigest/index.ts`

**Environment Variables:**
- `OPENAI_API_KEY`: OpenAI API key
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

### 2. checkUserStatus

**Purpose:** Detect stress patterns and queue proactive coaching messages.

**Schedule:** Daily via CRON

**Process:**
1. Fetch logs from the past 3 days for all users
2. Analyze for stress indicators (keywords: stress, overwhelmed, tired, etc.)
3. If 2+ days show stress → queue a notification
4. Prevent duplicate notifications within 3 days
5. Insert into `coach_notifications` table

**Stress Keywords:**
- stress, stressed, anxious, anxiety
- overwhelmed, tired, exhausted
- difficult, tough, struggling
- down, sad, frustrated

**Example Message:**
```
Hey, I noticed the past couple of days have been tough. 
Want to adjust your plan or talk about what's going on?
```

**File:** `/supabase/functions/checkUserStatus/index.ts`

**Environment Variables:**
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

---

## Services

### embeddingService.js

Handles vector embedding generation and semantic search.

**Functions:**

```javascript
// Generate embedding for text
generateEmbedding(text) → Promise<number[]>

// Store embedding for a log entry
storeLogEmbedding({ userId, logType, logId, text }) → Promise<Object>

// Search for similar logs using vector similarity
searchSimilarLogs({ userId, queryText, limit, daysBack }) → Promise<Array>

// Batch generate embeddings for multiple logs
batchGenerateEmbeddings(userId, logs) → Promise<Object>
```

**Model:** `text-embedding-3-small` (1536 dimensions)

**Similarity Metric:** Cosine distance

**Default Parameters:**
- `limit`: 3 results
- `daysBack`: 90 days

### promptService.js (Updated)

Enhanced to integrate all memory layers.

**New Functions:**

```javascript
// Fetch last 7 days of logs
fetchRecentLogs(userId) → Promise<Array>

// Fetch weekly summaries
fetchWeeklySummaries(userId, limit=4) → Promise<Array>

// Fetch relevant past logs using vector search
fetchRelevantPastLogs(userId, queryText) → Promise<Array>
```

**Updated Function:**

```javascript
// Build user context with all memory layers (now async)
buildUserContext(userData) → Promise<string>
```

**Context Parameters:**
```javascript
{
  profile: {},      // User profile
  memory: [],       // Session conversation
  plan: {},         // Current plan
  userId: "uuid",   // For fetching logs
  currentQuery: ""  // For vector search
}
```

---

## Prompt Structure

### Complete Prompt Example

```
[SYSTEM PROMPT - Static coaching guidelines and safety rules]

=== RECENT CONVERSATION ===
[1] User: I'm feeling tired today
    AI: That's okay! Rest is important...

=== LAST 7 DAYS SUMMARY ===
Last 7 Days Activity: 3 workout discussions, 5 meal discussions, 
2 mood/stress mentions

=== AI NOTES FROM PREVIOUS WEEKS ===
[Week of 10/15/2025] Joe tends to struggle with consistency on 
weekends but responds well to short home workouts.

[Week of 10/08/2025] Training intensity is good. Reported lower 
back discomfort after deadlifts - advised form check.

=== RELEVANT PAST LOGS ===
[2025-08-03] Struggled with food prep during work travel. Found 
that meal replacement shakes helped maintain protein intake.

[2025-07-12] Felt strong after 3 consistent gym weeks. Noticed 
better sleep quality correlating with evening workouts.

=== USER PROFILE ===
Goal: Build muscle and lose fat
Dietary needs: Vegetarian, high protein
Injuries: Previous lower back strain

=== CURRENT PLAN ===
Current plan: Upper/Lower Split
Phase: Hypertrophy
Focus: Strength building
```

---

## Vector Search (RAG)

### How It Works

1. **Embedding Generation:**
   - When a log is created, generate embedding using OpenAI
   - Model: `text-embedding-3-small` (1536-dim)
   - Store in `log_embeddings` table

2. **Similarity Search:**
   - When user asks a question, embed the query
   - Use pgvector's cosine similarity to find related logs
   - Filter by user_id (RLS ensures no cross-user access)
   - Limit to last 90 days
   - Return top 3 most similar logs

3. **Prompt Integration:**
   - Retrieved logs are injected into prompt
   - Format: `[date] log text excerpt...`
   - Provides relevant context from user's history

### SQL RPC Function

```sql
CREATE FUNCTION search_similar_logs(
  query_user_id UUID,
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 3,
  date_threshold TIMESTAMPTZ DEFAULT NOW() - INTERVAL '90 days'
)
RETURNS TABLE (...)
```

**Parameters:**
- `query_user_id`: User to search for
- `query_embedding`: Vector to compare against
- `match_threshold`: Minimum similarity (0-1)
- `match_count`: Number of results to return
- `date_threshold`: Only search recent logs

**Returns:**
- `id`, `user_id`, `log_type`, `log_id`
- `text`: Original log text
- `created_at`: When log was created
- `similarity`: Cosine similarity score (0-1)

### Guardrails

✅ **User Isolation:** RLS policies prevent cross-user searches
✅ **Date Filtering:** Only search last 90 days by default
✅ **Normalized Scoring:** Cosine distance normalized to 0-1 similarity
✅ **Minimum Threshold:** Only return logs above 0.5 similarity
✅ **Fallback Handling:** Graceful degradation if vector search fails

---

## Proactive Coaching

### Trigger Logic

```javascript
// 1. Fetch last 3 days of logs for all users
const logs = await fetchLogs(threeDaysAgo, now);

// 2. Group logs by user
const logsByUser = groupByUserId(logs);

// 3. For each user, detect stress pattern
for (const [userId, userLogs] of logsByUser) {
  const stressPattern = detectStressPattern(userLogs);
  
  // 4. If 2+ days show stress, queue notification
  if (stressPattern.stressfulDays >= 2) {
    // Check for recent notifications (prevent duplicates)
    if (!hasRecentNotification(userId)) {
      await createNotification(userId, message);
    }
  }
}
```

### Stress Detection

**Method:** Keyword-based pattern matching

**Keywords Checked:**
- High stress: stress, anxious, overwhelmed
- Fatigue: tired, exhausted
- Difficulty: difficult, tough, struggling
- Emotional: down, sad, frustrated, angry

**Threshold:** 2 or more days with stress indicators in 3-day window

**Duplicate Prevention:** Only send if no notification in last 3 days

### Notification Delivery

**Current Implementation:** Simulated via database insertion

**Future Enhancement:** Push notifications via mobile app

**User Actions:**
- View notification in app
- Mark as read
- Respond to coach
- Adjust plan settings

---

## Testing

### Test Files

1. **weeklyDigest.test.js** - Weekly summary generation
2. **vectorSearch.test.js** - Vector embeddings and search
3. **proactiveTrigger.test.js** - Stress detection and notifications

### Run Tests

```bash
# Run all AI coach memory tests
npm run test:ai-coach-memory

# Run individual test files
node src/tests/weeklyDigest.test.js
node src/tests/vectorSearch.test.js
node src/tests/proactiveTrigger.test.js
```

### Test Coverage

**weeklyDigest.test.js:**
- ✓ Function structure and exports
- ✓ OpenAI model usage (gpt-4o-mini)
- ✓ Type storage (weekly_summary)
- ✓ Date range (7 days)
- ✓ Database table structure
- ✓ RLS policies
- ✓ User grouping logic
- ✓ Prompt service integration

**vectorSearch.test.js:**
- ✓ Service module exports
- ✓ Embedding model (text-embedding-3-small)
- ✓ Database table structure
- ✓ Vector index (HNSW)
- ✓ RLS policies
- ✓ RPC function existence
- ✓ User filtering
- ✓ Date threshold (90 days)
- ✓ Required fields storage
- ✓ Prompt integration

**proactiveTrigger.test.js:**
- ✓ Function structure and exports
- ✓ Date range (3 days)
- ✓ Stress keyword detection
- ✓ Trigger threshold (2+ days)
- ✓ Database table structure
- ✓ RLS policies
- ✓ Notification type
- ✓ Duplicate prevention
- ✓ Message quality
- ✓ User grouping
- ✓ Read tracking
- ✓ Update permissions

---

## Security Considerations

### Row-Level Security (RLS)

All new tables have RLS enabled with policies:

1. **User policies:** Can only access their own data
2. **Service role policies:** Full access for backend operations
3. **No public access:** All tables require authentication

### Vector Search Isolation

```sql
-- RPC function filters by user_id
WHERE log_embeddings.user_id = query_user_id
```

### Data Privacy

- Embeddings are stored but cannot be reversed to original text
- Vector search is scoped to individual users only
- No cross-user information leakage possible
- Service role required for admin operations

### Rate Limiting

Consider implementing:
- Max embeddings per user per day
- Max vector searches per request
- Throttling on Edge Function invocations

---

## Performance Optimization

### Vector Index

**HNSW (Hierarchical Navigable Small World):**
- Fast approximate nearest neighbor search
- Trade-off: Speed vs accuracy
- Suitable for 1536-dim embeddings
- O(log n) search complexity

### Caching Strategy

**Prompt Service:**
- System prompt cached for 5 minutes
- User context rebuilt on each request
- Memory queries cached at request level

**Embeddings:**
- Generated once per log
- Stored permanently for reuse
- Batch operations for backfill

### Query Optimization

**Indexes:**
- All foreign keys indexed
- Timestamp columns for date filtering
- Vector column for similarity search

**Limits:**
- Weekly summaries: Last 4 weeks
- Recent logs: Last 20 entries
- Vector search: Top 3 results
- Date threshold: 90 days

---

## Deployment

### Migration Order

1. `20251022_create_ai_coach_notes_table.sql`
2. `20251022_create_log_embeddings_table.sql`
3. `20251022_create_coach_notifications_table.sql`
4. `20251022_create_vector_search_rpc.sql`

### Edge Functions Deployment

```bash
# Deploy generateWeeklyDigest
supabase functions deploy generateWeeklyDigest

# Deploy checkUserStatus
supabase functions deploy checkUserStatus
```

### CRON Jobs

**Weekly Digest:**
```sql
SELECT cron.schedule(
  'generate-weekly-digest',
  '0 0 * * 0',  -- Every Sunday at midnight
  $$SELECT net.http_post(
    url:='https://[project-ref].supabase.co/functions/v1/generateWeeklyDigest',
    headers:='{"Authorization": "Bearer [service-role-key]"}'
  )$$
);
```

**User Status Check:**
```sql
SELECT cron.schedule(
  'check-user-status',
  '0 10 * * *',  -- Every day at 10 AM
  $$SELECT net.http_post(
    url:='https://[project-ref].supabase.co/functions/v1/checkUserStatus',
    headers:='{"Authorization": "Bearer [service-role-key]"}'
  )$$
);
```

### Environment Variables

Required for Edge Functions:
```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Future Enhancements

### Phase 3 Possibilities

1. **Multi-modal Memory:**
   - Image embeddings for workout form analysis
   - Audio transcripts for voice logging
   - Exercise video understanding

2. **Pattern Recognition:**
   - Injury correlation analysis
   - Performance trend prediction
   - Personalized timing recommendations

3. **Advanced RAG:**
   - Hybrid search (keyword + vector)
   - Re-ranking with cross-encoders
   - Dynamic context window adjustment

4. **Real-time Coaching:**
   - Live workout feedback via WebSocket
   - Immediate safety interventions
   - Adaptive difficulty adjustment

5. **Social Features:**
   - Anonymous pattern sharing
   - Community insights (aggregated)
   - Peer comparison (opt-in)

---

## Troubleshooting

### Common Issues

**Embeddings not generating:**
- Check `OPENAI_API_KEY` is set
- Verify text length (max 8191 tokens)
- Check API quota and rate limits

**Vector search returning no results:**
- Verify embeddings exist for user
- Check date threshold (default 90 days)
- Lower similarity threshold if needed
- Ensure RPC function is deployed

**Weekly digest not running:**
- Verify CRON job is scheduled
- Check Edge Function logs
- Ensure service role key is valid
- Verify OpenAI API access

**Notifications not appearing:**
- Check stress detection logic
- Verify 3-day window has data
- Ensure no recent duplicate notifications
- Check RLS policies on notifications table

### Debug Queries

```sql
-- Check embeddings for a user
SELECT COUNT(*), log_type
FROM log_embeddings
WHERE user_id = '[user-uuid]'
GROUP BY log_type;

-- View recent notifications
SELECT * FROM coach_notifications
WHERE user_id = '[user-uuid]'
ORDER BY created_at DESC
LIMIT 10;

-- Check weekly summaries
SELECT created_at, substring(note, 1, 100) as preview
FROM ai_coach_notes
WHERE user_id = '[user-uuid]'
ORDER BY created_at DESC;
```

---

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated:** October 22, 2025  
**Version:** 1.0.0  
**Author:** STRUKT Development Team
