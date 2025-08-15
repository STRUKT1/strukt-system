# API Reference

## Overview

The STRUKT API provides endpoints for AI-powered coaching interactions and health data logging.

## Base URL

```
https://your-api-domain.com/api
```

## Authentication

All API requests require environment variables for:
- `OPENAI_API_KEY`: OpenAI API access
- `AIRTABLE_API_KEY`: Airtable database access
- `AIRTABLE_BASE_ID`: Airtable base identifier

## Endpoints

### Chat Interactions

#### POST /chat
Send a message to the AI coach and receive a personalized response.

**Request Body:**
```json
{
  "email": "user@example.com",
  "message": "I need help with my workout plan"
}
```

**Response:**
```json
{
  "reply": "Based on your goals and preferences...",
  "status": "success"
}
```

### Data Logging

#### POST /log/meal
Log a meal entry for nutrition tracking.

#### POST /log/workout
Log a workout session.

#### POST /log/sleep
Log sleep duration and quality.

#### POST /log/mood
Log mood and energy levels.

### User Management

#### GET /user/:email
Retrieve user profile and preferences.

#### PUT /user/:email
Update user profile information.

## Error Handling

All endpoints return appropriate HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 429: Rate Limit Exceeded
- 500: Internal Server Error

## Rate Limiting

API requests are limited to prevent abuse. Current limits:
- 100 requests per hour per IP address
- 50 chat requests per hour per user