# API Endpoints

This document provides comprehensive documentation for all REST endpoints in the STRUKT System API.

## Base Configuration

- **Base URL**: `http://localhost:3000` (development) or deployed URL
- **Content-Type**: `application/json`
- **Rate Limiting**: 60 requests per minute per IP address
- **CORS**: Configurable via `ALLOWED_ORIGINS` environment variable

## Endpoints Overview

| Method | Path | Purpose | Auth Required | Rate Limited |
|--------|------|---------|---------------|--------------|
| GET | `/` | Health check | No | Yes |
| POST | `/ask` | AI chat interaction | No | Yes |
| GET | `/chat-history` | Retrieve user chat history | No | Yes |
| POST | `/log` | Log health/fitness data | No | Yes |

---

## Health Check

### `GET /`

**Purpose**: Verify the service is running and responsive

**Authentication**: None

**Request**: No parameters required

**Response**:
```
👋 Hello from STRUKT Coach Server!
```

**Example**:
```bash
curl http://localhost:3000/
```

---

## AI Chat Interface

### `POST /ask`

**Purpose**: Primary AI chat endpoint for conversational interactions with the STRUKT Coach

**Authentication**: None (public endpoint)

**Request Schema**:
```json
{
  "messages": [
    {
      "role": "system" | "user" | "assistant",
      "content": "string (max 2000 characters)"
    }
  ],
  "email": "string (optional)",
  "topic": "string (optional)"
}
```

**Required Fields**:
- `messages`: Array of conversation messages (minimum 1)
- `messages[].role`: Must be "system", "user", or "assistant"
- `messages[].content`: Message content, max 2000 characters

**Optional Fields**:
- `email`: User email for personalization and logging
- `topic`: Conversation topic for categorization

**Response Schema**:
```json
{
  "success": true,
  "reply": "AI assistant response string"
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error description"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I want to start a workout routine. What should I do?"
      }
    ],
    "email": "user@example.com",
    "topic": "fitness_planning"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "reply": "**Getting Started with Workouts** 🏋️\n\nGreat choice! Let's build something that works for your life...\n\n**What I need to know:**\n- How many days per week can you commit?\n- Do you have gym access or prefer home workouts?\n- Any injuries or limitations?\n\n**Quick Start Option:**\n- 3 days/week full body routine\n- Bodyweight or basic equipment\n- 30-45 minutes per session\n\nWant me to create a specific plan once I know your preferences? 💪"
}
```

**Behavior Notes**:
- If `email` provided, the system will:
  - Look up user profile data for personalization
  - Fetch recent chat history for context
  - Log the interaction to Airtable
- If user not found by email, returns 404
- Context building includes system prompt + personalization + memory
- Uses GPT-4o with GPT-3.5-turbo fallback

---

## Chat History

### `GET /chat-history`

**Purpose**: Retrieve conversation history for a specific user

**Authentication**: None

**Query Parameters**:
- `email`: User email address (required)
- `limit`: Number of records to return (optional, default: 50, max: 100)
- `offset`: Number of records to skip (optional, default: 0)

**Response Schema**:
```json
{
  "success": true,
  "records": [
    {
      "id": "record_id",
      "fields": {
        "Name": "conversation_identifier",
        "User": ["user_record_id"],
        "Message": "user_message",
        "AI_Response": "assistant_response",
        "Topic": "conversation_topic",
        "Created": "2024-01-01T12:00:00.000Z"
      }
    }
  ]
}
```

**Error Responses**:
- `400`: Invalid email format or parameters
- `404`: User not found

**Example Request**:
```bash
curl "http://localhost:3000/chat-history?email=user@example.com&limit=10"
```

**Example Response**:
```json
{
  "success": true,
  "records": [
    {
      "id": "recABC123",
      "fields": {
        "Name": "Chat 2024-01-01 12:00",
        "User": ["recUSER123"],
        "Message": "I want to start a workout routine",
        "AI_Response": "Great choice! Let's build something that works...",
        "Topic": "fitness_planning",
        "Created": "2024-01-01T12:00:00.000Z"
      }
    }
  ]
}
```

**Pagination**:
- Results ordered by creation time (newest first)
- Use `offset` parameter for pagination
- Maximum 100 records per request

---

## Data Logging

### `POST /log`

**Purpose**: Log health and fitness data to user's profile

**Authentication**: None

**Request Schema**:
```json
{
  "email": "string (required)",
  "type": "meal|workout|sleep|mood|supplement|reflection",
  "data": {
    // Type-specific data object
  }
}
```

**Log Types and Data Schemas**:

#### Meal Logging (`type: "meal"`)
```json
{
  "email": "user@example.com",
  "type": "meal",
  "data": {
    "name": "Breakfast",
    "foods": "Oatmeal with berries and nuts",
    "calories": 350,
    "protein": 12,
    "carbs": 45,
    "fat": 15
  }
}
```

#### Workout Logging (`type: "workout"`)
```json
{
  "email": "user@example.com",
  "type": "workout",
  "data": {
    "name": "Upper Body Strength",
    "duration": 45,
    "exercises": "Push-ups, Pull-ups, Dumbbell rows",
    "intensity": "Medium",
    "notes": "Felt strong today"
  }
}
```

#### Sleep Logging (`type: "sleep"`)
```json
{
  "email": "user@example.com",
  "type": "sleep",
  "data": {
    "bedtime": "22:30",
    "wakeTime": "06:30",
    "duration": 8.0,
    "quality": "Good",
    "notes": "Woke up refreshed"
  }
}
```

#### Mood Logging (`type: "mood"`)
```json
{
  "email": "user@example.com", 
  "type": "mood",
  "data": {
    "mood": "Happy",
    "energy": 8,
    "stress": 3,
    "notes": "Great day overall"
  }
}
```

#### Supplement Logging (`type: "supplement"`)
```json
{
  "email": "user@example.com",
  "type": "supplement", 
  "data": {
    "name": "Vitamin D3",
    "dosage": "2000 IU",
    "time": "08:00",
    "notes": "With breakfast"
  }
}
```

#### Reflection Logging (`type: "reflection"`)
```json
{
  "email": "user@example.com",
  "type": "reflection",
  "data": {
    "wentWell": "Completed workout and ate healthy",
    "challenge": "Struggled with evening cravings", 
    "tomorrow": "Prep healthy evening snacks"
  }
}
```

**Response Schema**:
```json
{
  "success": true,
  "message": "{type} log added"
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error description"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/log \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "type": "meal",
    "data": {
      "name": "Lunch",
      "foods": "Grilled chicken salad with quinoa",
      "calories": 450,
      "protein": 35,
      "carbs": 25,
      "fat": 18
    }
  }'
```

**Example Response**:
```json
{
  "success": true,
  "message": "meal log added"
}
```

**Data Storage**:
- All logs stored in respective Airtable tables
- User automatically linked by email lookup
- Timestamps added automatically
- Data validation handled by individual logging functions

---

## Error Handling

### Standard Error Response Format

All endpoints return errors in a consistent JSON format:

```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

### Common HTTP Status Codes

- **200**: Success
- **201**: Created (for logging endpoints)
- **400**: Bad Request (validation errors)
- **404**: Not Found (user not found)
- **429**: Too Many Requests (rate limiting)
- **500**: Internal Server Error

### Rate Limiting Headers

When rate limited, responses include headers:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when window resets

---

## Authentication and Security

### Current Security Measures

- **Rate Limiting**: 60 requests per minute per IP
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers applied
- **Input Validation**: Joi schemas for all inputs
- **Content-Type**: JSON parsing with built-in Express middleware

### No Authentication Required

Currently, all endpoints are public and do not require authentication. User identification is handled via email addresses in request payloads.

**Security Considerations**:
- Email-based user identification
- No API keys or tokens required
- Rate limiting provides basic abuse protection
- Input validation prevents injection attacks

---

## Usage Examples

### Complete Chat Flow

1. **Send initial message**:
```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, I'\''m new to STRUKT"}],
    "email": "newuser@example.com"
  }'
```

2. **Continue conversation**:
```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, I'\''m new to STRUKT"},
      {"role": "assistant", "content": "Welcome to STRUKT! I'\''m your AI coach..."},
      {"role": "user", "content": "Can you help me plan meals?"}
    ],
    "email": "newuser@example.com"
  }'
```

3. **Log meal data**:
```bash
curl -X POST http://localhost:3000/log \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "type": "meal",
    "data": {"name": "Breakfast", "foods": "Oatmeal", "calories": 300}
  }'
```

4. **View chat history**:
```bash
curl "http://localhost:3000/chat-history?email=newuser@example.com&limit=5"
```

---

*Last Updated: August 2024*