# Nutrition Targets and Summary API Documentation

This document outlines the new nutrition-related endpoints and enhancements to the STRUKT System API.

## Overview

The nutrition targets and summary features allow users to:
- Set and manage daily calorie and macro targets
- Get aggregated nutrition summaries for today or 7-day periods with timezone support
- Receive today's nutrition summary when logging meals via auto-log

## Database Changes

### User Profiles Table Extensions

The `user_profiles` table now includes nutrition target fields:

```sql
-- Nutrition targets
daily_kcal_target int,
macro_targets jsonb,        -- {"protein_g":..., "carbs_g":..., "fat_g":..., "fiber_g":...}
nutrition_targets jsonb,    -- full computed object {kcal, protein_g, carbs_g, fat_g, fiber_g, method, activity_factor}
```

These additions are handled via idempotent migration that can be safely run multiple times.

## API Endpoints

### 1. Enhanced Profile Management

#### GET /v1/profile
Returns user profile including new nutrition target fields.

**New Response Fields:**
```json
{
  "ok": true,
  "data": {
    "full_name": "John Doe",
    // ... existing fields ...
    "daily_kcal_target": 2200,
    "macro_targets": {
      "protein_g": 160,
      "carbs_g": 230,
      "fat_g": 70,
      "fiber_g": 30
    },
    "nutrition_targets": {
      "kcal": 2200,
      "protein_g": 160,
      "carbs_g": 230,
      "fat_g": 70,
      "fiber_g": 30,
      "method": "calculated",
      "activity_factor": 1.5
    }
  }
}
```

#### PATCH /v1/profile
Accepts updates to nutrition target fields.

**Example Request:**
```json
{
  "daily_kcal_target": 2000,
  "macro_targets": {
    "protein_g": 150,
    "carbs_g": 200,
    "fat_g": 65,
    "fiber_g": 28
  }
}
```

**Validation Rules:**
- `daily_kcal_target`: Integer between 500-10,000
- `macro_targets`: Object with optional fields (protein_g, carbs_g, fat_g, fiber_g), all positive numbers
- `nutrition_targets`: Complete nutrition object with method and activity_factor

### 2. Nutrition Summary

#### GET /v1/nutrition/summary

Get aggregated nutrition data with timezone support.

**Parameters:**
- `range`: "today" or "7d" (default: "today")
- `tz`: IANA timezone string (default: "UTC")

**Example Request:**
```
GET /v1/nutrition/summary?range=7d&tz=Europe/London
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "totals": {
      "kcal": 1320,
      "protein": 92,
      "carbs": 148,
      "fat": 43,
      "fiber": 22
    },
    "byDay": [
      {
        "date": "2025-08-27",
        "kcal": 1320,
        "protein": 92,
        "carbs": 148,
        "fat": 43,
        "fiber": 22
      }
    ],
    "targets": {
      "kcal": 2200,
      "protein_g": 160,
      "carbs_g": 230,
      "fat_g": 70,
      "fiber_g": 30
    }
  }
}
```

**Features:**
- Timezone-aware date calculations
- Aggregates meal data by day
- Includes user's nutrition targets from profile
- Supports both "today" and "7d" ranges

### 3. Enhanced Auto-Log

#### POST /v1/auto-log

Enhanced to include nutrition summary for meal logging.

**Meal Request with Fiber:**
```json
{
  "kind": "meal",
  "data": {
    "description": "Chicken breast with vegetables",
    "macros": {
      "protein": 35,
      "carbs": 12,
      "fat": 8,
      "fiber": 5
    },
    "calories": 240
  }
}
```

**Enhanced Response (for meals):**
```json
{
  "ok": true,
  "item": {
    "id": "uuid",
    "kind": "meal",
    "created_at": "2025-08-28T10:30:00Z"
  },
  "today": {
    "kcal": 1560,
    "protein": 127,
    "carbs": 160,
    "fat": 51,
    "fiber": 27
  },
  "targets": {
    "kcal": 2200,
    "protein_g": 160,
    "carbs_g": 230,
    "fat_g": 70,
    "fiber_g": 30
  }
}
```

## Implementation Details

### Timezone Support

All nutrition summary queries support timezone-aware date calculations using IANA timezone identifiers:
- "UTC" (default)
- "America/New_York"
- "Europe/London"
- "Asia/Tokyo"
- etc.

### Target Resolution Priority

The system resolves nutrition targets in the following order:
1. `nutrition_targets` (complete computed object) - preferred
2. `daily_kcal_target` + `macro_targets` (fallback)
3. `null` if no targets are set

### Data Aggregation

- Meal data is aggregated by date using timezone-aware calculations
- All macro values are summed across meals within each day
- Zero values are used for missing macro data
- Results are ordered by date (most recent first for 7d range)

### Error Handling

All endpoints return consistent error responses:

```json
{
  "ok": false,
  "code": "ERR_VALIDATION_FAILED",
  "message": "Invalid query parameters",
  "details": [
    {
      "path": ["range"],
      "message": "Invalid enum value"
    }
  ]
}
```

## Testing

Comprehensive test suites are available:
- `npm run test:nutrition` - Nutrition summary functionality
- `npm run test:profile-targets` - Profile targets functionality
- `npm test` - Full test suite including new features

## Security

- All endpoints require JWT authentication
- Row Level Security (RLS) protects user data access
- Input validation using Zod schemas
- Unknown fields are stripped from profile updates
- Null values are safely handled in data processing