# LLM Pipeline Documentation

This document explains the STRUKT system's LLM integration pipeline, including inputs, retrieval order, and fallbacks.

## Overview

The STRUKT system uses a centralized LLM pipeline that ensures consistent system prompt injection, user context loading, and safety measures across all AI interactions.

## Architecture

### Canonical System Prompt Module
**Location**: `src/ai/struktSystem.js`

**Key Function**: `getStruktSystemPrompt(profile, plan, memory)`

This function provides the single source of truth for the STRUKT system prompt and handles dynamic context injection.

### LLM Call Sites

1. **Primary Service**: `services/openaiService.js`
   - `getAIReply(messages, options)` - Main OpenAI API interface
   - Handles model fallbacks (GPT-4o → GPT-3.5-turbo)
   - Applies safety limits and dev logging

2. **Controller Layer**: `controllers/aiController.js`
   - `askController()` - Main chat endpoint handler
   - Orchestrates context building and LLM calls

## Input Pipeline

### 1. User Input Processing
- **Validation**: Joi schema validation on request payload
- **Rate Limiting**: 60 requests per minute per IP (configurable)
- **User Lookup**: Email-based user identification for personalization

### 2. Context Building

The system builds context in this order:

1. **Base System Prompt** (always included)
   - Source: `utils/prompts/strukt-system-prompt.txt`
   - Contains core STRUKT coaching instructions and personality

2. **Memory Context** (if available)
   - Recent chat interactions (last 5 by default)
   - Formatted as conversation history for continuity

3. **Profile Context** (if user authenticated)
   - User goals and preferences
   - Dietary needs and allergies
   - Medical considerations
   - Coaching tone preferences
   - Vision of success

4. **Plan Context** (planned feature)
   - Current fitness/nutrition plan
   - Plan phase and focus areas
   - Progress tracking data

### 3. Safety and Rate Limiting

- **Token Limits**: Max 2000 tokens per request (configurable)
- **Temperature Clamping**: 0.0-1.0 range enforcement
- **Model Fallbacks**: GPT-4o → GPT-3.5-turbo on permission errors
- **Request Rate Limiting**: Express rate limiter middleware

## Retrieval Order

### User Context Retrieval
1. **User ID Lookup** (`findUserIdByEmail`)
   - Airtable/Supabase user record lookup
   - Returns null for anonymous users

2. **Profile Data** (`fetchUserData`)
   - Onboarding information
   - Preferences and goals
   - Dietary and medical information

3. **Chat History** (`getRecentChatHistory`)
   - Last N interactions (default: 5)
   - Includes user messages and AI responses
   - Sorted by recency

4. **Logs and Context** (future enhancement)
   - Recent nutrition logs
   - Workout history
   - Sleep and mood data

## Fallback Strategy

### Model Fallbacks
1. **Primary**: GPT-4o (or env-specified model)
2. **Fallback**: GPT-3.5-turbo on permission/model errors
3. **Error Handling**: Detailed error logging and user-friendly messages

### Context Fallbacks
1. **Full Context**: Base prompt + memory + profile + plan
2. **Partial Context**: Base prompt + available components
3. **Minimal Context**: Base prompt only (always available)

### Error Scenarios
- **Context Build Failure**: Falls back to base prompt only
- **User Lookup Failure**: Continues with anonymous context
- **LLM API Failure**: Returns structured error response

## Logging and Monitoring

### Development Logging
When `NODE_ENV=development` or `DEBUG_LLM=true`:
```
[Coach LLM] model: gpt-4o, tokens: 150, latency: 850ms
[Coach LLM] fallback model: gpt-3.5-turbo, tokens: 120, latency: 650ms
```

### Production Monitoring
- Request rate limiting violations
- LLM API failures and fallbacks
- Context building errors
- Token usage patterns

## Usage Examples

### Basic Chat (Anonymous)
```javascript
const { getStruktSystemPrompt } = require('./src/ai/struktSystem');
const { getAIReply } = require('./services/openaiService');

const systemPrompt = getStruktSystemPrompt(); // Base prompt only
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: 'How can I improve my nutrition?' }
];

const reply = await getAIReply(messages);
```

### Personalized Chat (Authenticated)
```javascript
const profile = await fetchUserData(email);
const memory = await getRecentChatHistory(userId, 5);
const plan = null; // TODO: implement plan retrieval

const systemPrompt = getStruktSystemPrompt(profile, plan, memory);
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: 'What should I eat for breakfast?' }
];

const reply = await getAIReply(messages);
```

## Future Enhancements

### Short Term
- Plan context integration
- Enhanced nutrition/workout log retrieval
- Vector-based memory search

### Medium Term
- Multi-modal input support (images)
- Response streaming
- A/B testing framework

### Long Term
- Fine-tuned STRUKT models
- Advanced personalization ML
- Real-time adaptation based on feedback

## Configuration

### Environment Variables
- `OPENAI_API_KEY` - OpenAI API key (required)
- `OPENAI_PROJECT_ID` - Project ID for project-scoped keys
- `OPENAI_MODEL` - Override default model (defaults to gpt-4o)
- `DEBUG_LLM` - Enable detailed LLM logging
- `NODE_ENV` - Set to 'development' for debug logging

### Rate Limiting
- Default: 60 requests per minute per IP
- Configurable via Express rate limiter options
- Can be enhanced with user-based limits

---

*Last Updated: December 2024*