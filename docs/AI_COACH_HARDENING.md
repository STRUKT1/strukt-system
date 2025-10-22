# AI Coach Production Hardening - Implementation Guide

This document describes the production-ready enhancements for the STRUKT AI Coach system, implemented to ensure safety, reliability, and auditability.

## 🎯 Overview

The AI Coach hardening includes:

1. **Safety Validation** - Pattern-based detection of unsafe health advice
2. **Comprehensive Logging** - Audit trail of all AI interactions
3. **Prompt Optimization** - Caching and context management
4. **Fallback Handling** - Safe responses when OpenAI fails
5. **Input Validation** - Robust request validation

## 📁 New Services

### 1. Safety Validator (`src/services/safetyValidator.js`)

Validates AI responses for potentially harmful content before returning to users.

**Features:**
- 12 safety rules covering:
  - Meal skipping advice
  - Medication recommendations
  - Medical diagnoses
  - Discouraging medical consultations
  - Exercise through pain/injury
  - Extreme weight loss claims
  - Very low calorie suggestions
- Pattern-based detection with RegEx
- Detailed logging with context excerpts
- Borderline content detection

**API:**
```javascript
const { validateResponse, hasBorderlineContent } = require('./src/services/safetyValidator');

const result = validateResponse(aiResponse);
// Returns: { safe: boolean, issues: Array<string> }
```

### 2. Coach Log Service (`src/services/coachLogService.js`)

Logs all AI coach interactions to Supabase for audit, debugging, and quality monitoring.

**Features:**
- Logs to `ai_coach_logs` table in Supabase
- Captures: userId, sessionId, messages, success status, token usage, safety issues
- Safe truncation (2000 chars for user messages, 5000 for AI responses)
- Console fallback if database write fails
- User statistics aggregation

**API:**
```javascript
const { logInteraction, getUserLogs, getUserStats } = require('./src/services/coachLogService');

await logInteraction({
  userId: 'uuid',
  sessionId: 'session-123',
  userMessage: 'What should I eat?',
  aiResponse: 'Here are some suggestions...',
  success: true,
  tokenUsage: 150,
  issues: null
});

const logs = await getUserLogs('user-uuid', { limit: 50 });
const stats = await getUserStats('user-uuid');
```

### 3. Prompt Service (`src/services/promptService.js`)

Manages system prompts with caching and separates static/dynamic content.

**Features:**
- 5-minute cache TTL
- File modification detection for cache invalidation
- Separates static system prompt from dynamic user context
- Error handling with minimal fallback prompts
- Context building for profile, memory, and plans

**API:**
```javascript
const { getSystemPrompt, buildCompletePrompt, clearPromptCache } = require('./src/services/promptService');

const staticPrompt = getSystemPrompt();

const fullPrompt = buildCompletePrompt({
  profile: { primary_goal: 'weight loss', ... },
  memory: [...],
  plan: { name: 'Beginner Program' }
});

clearPromptCache(); // For testing/manual refresh
```

### 4. OpenAI Service Enhancements (`services/openaiService.js`)

**New Features:**
- `getFallbackResponse(type)` function
- Enhanced error logging with context
- Fallback types: 'timeout', 'error', 'unsafe', 'default'

**API:**
```javascript
const { getAIReply, getFallbackResponse } = require('./services/openaiService');

try {
  const reply = await getAIReply(messages);
} catch (error) {
  const fallback = getFallbackResponse('error');
  // "I apologize, but I'm experiencing technical difficulties..."
}
```

### 5. Ask Controller (`src/controllers/ask.js`)

New controller with complete integration of safety, logging, and validation.

**Features:**
- Request payload validation with Joi
- Empty/whitespace message detection (HTTP 400)
- 1000-character limit enforcement
- Safety validation before returning responses
- Automatic logging in `finally` block
- Fallback responses on OpenAI failures

**Request Format:**
```json
{
  "messages": [
    { "role": "user", "content": "What should I eat for breakfast?" }
  ],
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "session-abc123"
}
```

**Response Format:**
```json
{
  "success": true,
  "reply": "Here's a healthy breakfast suggestion..."
}
```

**Error Response:**
```json
{
  "success": false,
  "reply": "I apologize, but I'm experiencing technical difficulties...",
  "fallback": true
}
```

## 🗄️ Database Schema

### AI Coach Logs Table

**Migration:** `db/migrations/20251022_create_ai_coach_logs_table.sql`

**Schema:**
```sql
CREATE TABLE ai_coach_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  token_usage INTEGER,
  issues TEXT[],
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
```

**Indexes:**
- `idx_ai_coach_logs_user_id` on `user_id`
- `idx_ai_coach_logs_timestamp` on `timestamp DESC`
- `idx_ai_coach_logs_session_id` on `session_id`

**RLS Policies:**
- Users can view their own logs
- Service role can insert logs
- Service role can view all logs (admin/debugging)

## 🧪 Testing

All services have comprehensive test coverage:

**Run all AI Coach tests:**
```bash
npm run test:ai-coach
```

**Run individual test suites:**
```bash
node src/tests/safetyValidator.test.js  # 12 tests
node src/tests/openaiService.test.js    # 6 tests
node src/tests/ask.test.js              # 7 tests
```

**Test Coverage:**
- ✅ Safety rule detection (all 12 patterns)
- ✅ Fallback response generation (all types)
- ✅ Request validation (schema, limits, formats)
- ✅ Error handling and edge cases
- ✅ No false positives on safe content

## 🔒 Security

**CodeQL Analysis:** ✅ No vulnerabilities detected

**Safety Measures:**
- Pattern-based detection of unsafe health advice
- All responses validated before returning to users
- Unsafe responses replaced with safe fallbacks
- Comprehensive logging for audit trail
- RLS policies on database tables

## 📊 Monitoring

**Log all interactions to Supabase:**
```sql
SELECT 
  COUNT(*) as total_interactions,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN issues IS NOT NULL THEN 1 ELSE 0 END) as safety_issues,
  AVG(token_usage) as avg_tokens
FROM ai_coach_logs
WHERE timestamp > NOW() - INTERVAL '24 hours';
```

**Check for safety issues:**
```sql
SELECT user_id, user_message, ai_response, issues, timestamp
FROM ai_coach_logs
WHERE issues IS NOT NULL
ORDER BY timestamp DESC
LIMIT 50;
```

## 🚀 Usage Example

```javascript
// In your route handler
const { askController } = require('./src/controllers/ask');

router.post('/ask', askController);

// The controller handles:
// 1. Request validation
// 2. Prompt building with context
// 3. OpenAI API call with error handling
// 4. Safety validation
// 5. Logging
// 6. Response formatting
```

## 📝 Environment Variables

Required for full functionality:

```env
OPENAI_API_KEY=sk-...
OPENAI_PROJECT_ID=proj-... (optional)
OPENAI_MODEL=gpt-4o (optional, defaults to gpt-4o)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 🎓 Best Practices

1. **Always validate responses** before returning to users
2. **Log all interactions** for audit and debugging
3. **Use fallback responses** when AI fails
4. **Monitor safety issues** regularly
5. **Clear cache** after updating system prompt file
6. **Review logs** for quality improvement opportunities

## 📚 Next Steps

- [ ] Connect controller to routes in production
- [ ] Set up monitoring dashboards for safety issues
- [ ] Implement rate limiting per user
- [ ] Add user feedback collection
- [ ] Create admin dashboard for log review
- [ ] Implement more sophisticated context retrieval

## 🤝 Contributing

When adding new safety rules:

1. Add pattern to `SAFETY_RULES` in `safetyValidator.js`
2. Add test case to `src/tests/safetyValidator.test.js`
3. Run tests to verify detection
4. Document the new rule in this README

## 📞 Support

For questions or issues:
- Email: support@strukt.com
- Docs: [Internal wiki link]
