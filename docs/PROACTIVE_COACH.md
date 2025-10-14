# Proactive AI Coaching Features

## Overview

This implementation adds advanced AI coaching capabilities to the STRUKT system, transforming it into a proactive, intelligent fitness companion. The features include conversational logging, image analysis, personalized planning, and dynamic dashboard insights.

## Database Schema Updates

### New User Profile Fields (Migration: `2025-10-14-add-proactive-coach-fields.sql`)

Extended `user_profiles` table with rich onboarding data:

- `why_statement` (TEXT): User's deep motivation and "why" for their fitness journey
- `success_definition` (TEXT): Personal definition of success  
- `target_event_date` (TIMESTAMPTZ): Date of target event (wedding, competition, etc.)
- `is_pregnant_or_breastfeeding` (BOOLEAN): Medical safety flag
- `is_recovering_from_surgery` (BOOLEAN): Medical safety flag for post-surgery recovery
- `faith_based_diet` (TEXT): Religious dietary requirements (halal, kosher, etc.)
- `relationship_with_food` (TEXT): User's relationship and history with food
- `relationship_with_exercise` (TEXT): User's relationship and history with exercise
- `coaching_persona` (TEXT): Preferred AI coaching style (motivator, strategist, nurturer)
- `anything_else_context` (TEXT): Additional context from onboarding

### Weight Tracking Table

New `weight_logs` table for progress monitoring:

```sql
CREATE TABLE public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Includes full RLS policies for user data isolation.

## New Features

### 1. Conversational Logging ("Magic Log")

**Endpoint:** `POST /v1/chat` (enhanced)

The chat endpoint now automatically detects when a user wants to log activity from natural language.

**How it works:**
1. User sends message: "I slept 6 hours last night"
2. AI recognizes log intent and extracts entities
3. Automatically creates sleep log in database
4. Returns confirmation: "Thanks for the update. I've logged your sleep. 😴"

**Supported log types:**
- Meals
- Workouts  
- Sleep
- Mood
- Supplements

**Response format:**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "response": "Got it! I've logged that meal for you. 🍽️",
    "timestamp": "2025-10-14T10:00:00Z",
    "context": {
      "intent": "log_activity",
      "logType": "meal",
      "logId": "uuid"
    }
  }
}
```

### 2. Image Logging ("Universal Adapter")

**Endpoint:** `POST /v1/log-image`

Upload workout screenshots or meal photos for automatic data extraction.

**Request:**
```json
{
  "logType": "workout",  // or "meal"
  "imageUrl": "https://...",  // or use imageBase64
  "imageBase64": "base64string..."
}
```

**Features:**
- **Workout screenshots**: Extracts type, duration, distance, calories from fitness tracker screenshots
- **Meal photos**: Estimates description, calories, macros from food images
- Uses GPT-4o Vision API for intelligent extraction
- Creates structured logs automatically

**Response:**
```json
{
  "ok": true,
  "data": {
    "log": { /* created log object */ },
    "extracted": {
      "type": "running",
      "duration_minutes": 30,
      "calories": 300
    }
  }
}
```

### 3. Proactive Coach Endpoints

#### Generate Initial Plans
**Endpoint:** `POST /v1/plans/generate`

Generates personalized workout and nutrition plans based on complete user profile.

**Factors considered:**
- Goals and WHY statement
- Target event and date
- Fitness experience
- Medical conditions and safety flags
- Dietary restrictions
- Available equipment

**Response:**
```json
{
  "ok": true,
  "data": {
    "workout_plan": {
      "name": "Strength Foundation Program",
      "description": "...",
      "schedule": ["Day 1: ...", "Day 2: ..."],
      "weekly_focus": "..."
    },
    "nutrition_plan": {
      "daily_calories": 2000,
      "macros": { "protein": 150, "carbs": 200, "fat": 67 },
      "meal_suggestions": ["Breakfast: ...", ...],
      "guidance": "..."
    }
  }
}
```

#### Daily Focus Point
**Endpoint:** `GET /v1/dashboard/today-focus`

Provides a personalized, actionable focus point based on:
- User's goals and WHY
- Recent sleep quality
- Recent mood
- Last workout
- Coaching persona preference

**Response:**
```json
{
  "ok": true,
  "data": {
    "focus": "Your sleep was solid last night. Channel that energy into today's strength session - remember your WHY: proving to yourself you can commit.",
    "generatedAt": "2025-10-14T10:00:00Z"
  }
}
```

#### Weekly Review
**Endpoint:** `GET /v1/dashboard/weekly-review`

Analyzes past 7 days of activity and generates insights.

**Features:**
- Connects actions to outcomes (e.g., "Your mood was highest on days you worked out")
- Celebrates wins
- Provides actionable guidance for next week

**Response:**
```json
{
  "ok": true,
  "data": {
    "review": "This week you completed 4 workouts and your mood scores averaged 8/10. Your consistency is paying off - particularly on days when you prioritized sleep. Next week, aim to maintain this rhythm while adding one extra recovery day.",
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

#### Weight Tracking Graph
**Endpoint:** `GET /v1/dashboard/weight-graph`

Returns all weight logs for visualization.

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
    }
  ]
}
```

### 4. Enhanced AI System Prompt

The AI system prompt now dynamically includes:

**Coaching Persona Injection:**
- Motivator: Energetic, enthusiastic, encouraging
- Strategist: Analytical, structured, data-driven  
- Nurturer: Empathetic, supportive, gentle

**"I Remember You Said..." Principle:**
- References user's WHY statement
- Acknowledges relationship with food/exercise
- Personalizes motivation

**Safety & Medical Context:**
- Flags for pregnancy/breastfeeding
- Surgery recovery status
- Medical conditions
- Injuries
- Always errs on side of caution

**Cultural & Religious Sensitivity:**
- Respects faith-based dietary requirements
- Considers cultural practices

## Services

### AI Extensions Service (`src/services/aiExtensions.js`)

Provides specialized AI functions:

- `recognizeIntent(message)`: Determines if user wants to log or chat
- `analyzeWorkoutImage(imageUrl)`: Extracts workout data from screenshots
- `analyzeMealImage(imageUrl)`: Estimates nutrition from food photos
- `generateInitialPlans(profile)`: Creates personalized workout/nutrition plans
- `generateDailyFocus(profile, recentActivity)`: Generates daily motivation
- `generateWeeklyReview(profile, weeklyLogs)`: Analyzes weekly progress

### Weight Logs Service (`src/services/logs/weight.js`)

- `logWeight(userId, weightData)`: Create weight entry
- `getUserWeightLogs(userId, limit)`: Retrieve weight history

### Updated Chat Service (`src/services/chatService.js`)

Enhanced with "magic log" functionality:
- Automatic intent recognition
- Entity extraction
- Log creation
- Smart confirmation messages
- Falls back to normal chat when needed

## Authentication

All new endpoints are protected with JWT authentication via `authenticateJWT` middleware.

**Required header:**
```
Authorization: Bearer <supabase_jwt_token>
```

## Testing

Run the proactive coach feature tests:

```bash
node test/proactive-coach.test.js
```

Full test suite:

```bash
npm test
```

## Usage Examples

### Example 1: Natural Language Logging

```javascript
// User says: "had grilled chicken and rice for lunch"
POST /v1/chat
{
  "message": "had grilled chicken and rice for lunch"
}

// Response includes automatic log creation:
{
  "ok": true,
  "data": {
    "response": "Got it! I've logged that meal for you. 🍽️",
    "context": {
      "intent": "log_activity",
      "logType": "meal",
      "logId": "abc-123"
    }
  }
}
```

### Example 2: Workout Screenshot Logging

```javascript
POST /v1/log-image
{
  "logType": "workout",
  "imageUrl": "https://example.com/workout-screenshot.jpg"
}

// AI extracts: 30 min run, 5km, 300 calories
// Creates workout log automatically
```

### Example 3: Personalized Daily Focus

```javascript
GET /v1/dashboard/today-focus

// Returns based on:
// - User's WHY: "prove I can commit"
// - Last night: 8 hours sleep (good)
// - Persona: strategist
{
  "ok": true,
  "data": {
    "focus": "You're well-rested and ready to execute. Today's strength session is your chance to prove commitment to your plan. Track every set."
  }
}
```

## Configuration

Required environment variables:

```bash
OPENAI_API_KEY=sk-...
OPENAI_PROJECT_ID=proj_...  # Optional but recommended
OPENAI_MODEL=gpt-4o  # Default model for AI features
```

## Migration

To apply the database schema changes:

1. Run the migration in your Supabase project:
   ```sql
   -- Execute: db/migrations/2025-10-14-add-proactive-coach-fields.sql
   ```

2. Update user profiles service recognizes new fields (already done)

3. Ensure RLS policies are enabled on weight_logs table

## API Response Format

All endpoints follow the Supabase-style response format:

**Success:**
```json
{
  "ok": true,
  "data": { /* response data */ }
}
```

**Error:**
```json
{
  "ok": false,
  "code": "ERR_CODE",
  "message": "Error description"
}
```

## Next Steps

1. **Frontend Integration**: Build UI for image upload, dashboard widgets
2. **Plan Storage**: Implement persistent storage for generated plans
3. **Notifications**: Add push notifications for daily focus points
4. **Advanced Analytics**: Trend analysis and predictive insights
5. **Social Features**: Share progress, compete with friends

## Support

For issues or questions, refer to:
- Main documentation: `/docs`
- API routes: `/src/routes`
- Service implementations: `/src/services`
