# API Endpoints Summary - Proactive AI Coaching

## Quick Reference

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Chat & Logging

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/v1/chat` | POST | Send message (auto-detects log intent) | ✅ |
| `/v1/chat` | GET | Get chat history | ✅ |
| `/v1/log-image` | POST | Log from image (meal/workout) | ✅ |

### Proactive Coach

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/v1/plans/generate` | POST | Generate workout & nutrition plans | ✅ |
| `/v1/dashboard/today-focus` | GET | Get daily focus point | ✅ |
| `/v1/dashboard/weekly-review` | GET | Get weekly progress review | ✅ |
| `/v1/dashboard/weight-graph` | GET | Get weight tracking data | ✅ |

## Request/Response Examples

### POST /v1/chat (Magic Log)

**Request:**
```json
{
  "message": "I slept 6 hours last night"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "response": "Thanks for the update. I've logged your sleep. 😴",
    "timestamp": "2025-10-14T10:00:00Z",
    "context": {
      "intent": "log_activity",
      "logType": "sleep",
      "logId": "uuid"
    }
  }
}
```

### POST /v1/log-image

**Request:**
```json
{
  "logType": "workout",
  "imageUrl": "https://example.com/workout.jpg"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "log": {
      "id": "uuid",
      "type": "running",
      "duration_minutes": 30,
      "calories": 300
    },
    "extracted": {
      "type": "running",
      "duration_minutes": 30,
      "distance_km": 5.2,
      "calories": 300
    }
  }
}
```

### POST /v1/plans/generate

**Request:** None (uses authenticated user's profile)

**Response:**
```json
{
  "ok": true,
  "data": {
    "workout_plan": {
      "name": "Strength Foundation",
      "description": "4-week program...",
      "schedule": ["Day 1: Upper body", "Day 2: Lower body"],
      "weekly_focus": "Build baseline strength"
    },
    "nutrition_plan": {
      "daily_calories": 2000,
      "macros": { "protein": 150, "carbs": 200, "fat": 67 },
      "meal_suggestions": ["Breakfast: ...", "Lunch: ...", "Dinner: ..."],
      "guidance": "Focus on protein..."
    }
  }
}
```

### GET /v1/dashboard/today-focus

**Request:** None (uses authenticated user)

**Response:**
```json
{
  "ok": true,
  "data": {
    "focus": "Your sleep was solid. Channel that energy into today's workout - remember your WHY.",
    "generatedAt": "2025-10-14T10:00:00Z"
  }
}
```

### GET /v1/dashboard/weekly-review

**Request:** None (uses authenticated user)

**Response:**
```json
{
  "ok": true,
  "data": {
    "review": "This week you completed 4 workouts. Your mood was highest on days you exercised...",
    "stats": {
      "workouts": 4,
      "meals": 28,
      "avgSleepQuality": "good",
      "moodTrend": "positive"
    },
    "generatedAt": "2025-10-14T10:00:00Z"
  }
}
```

### GET /v1/dashboard/weight-graph

**Request:** None (uses authenticated user)

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "weight_kg": 75.5,
      "created_at": "2025-10-14T08:00:00Z"
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "weight_kg": 75.0,
      "created_at": "2025-10-07T08:00:00Z"
    }
  ]
}
```

## Error Responses

All errors follow this format:

```json
{
  "ok": false,
  "code": "ERR_CODE",
  "message": "Human-readable error message"
}
```

Common error codes:
- `ERR_AUTH_FAILED`: Authentication failed
- `ERR_NO_TOKEN`: Missing authorization token
- `ERR_INVALID_TOKEN`: Invalid or expired token
- `ERR_VALIDATION_FAILED`: Request validation failed
- `ERR_PROFILE_NOT_FOUND`: User profile not found
- `ERR_CHAT_FAILED`: Chat interaction failed
- `ERR_IMAGE_LOG_FAILED`: Image processing failed

## Authentication

All endpoints require a valid Supabase JWT token:

```bash
curl -H "Authorization: Bearer <supabase_jwt>" \
     https://api.strukt.com/v1/dashboard/today-focus
```

## Rate Limits

- 60 requests per minute per user
- Applies to all v1 endpoints

## Testing with curl

```bash
# Set your token
TOKEN="your_supabase_jwt_token"

# Magic log example
curl -X POST https://api.strukt.com/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "had a protein shake for breakfast"}'

# Get daily focus
curl https://api.strukt.com/v1/dashboard/today-focus \
  -H "Authorization: Bearer $TOKEN"

# Generate plans
curl -X POST https://api.strukt.com/v1/plans/generate \
  -H "Authorization: Bearer $TOKEN"
```
