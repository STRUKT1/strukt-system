# Environment Variables & Configuration

This document lists all environment variables required by the STRUKT System, their purposes, and configuration details.

## Required Environment Variables

### OpenAI Configuration

#### `OPENAI_API_KEY` (Required)
- **Purpose**: Authentication key for OpenAI API access
- **Format**: `sk-...` (standard OpenAI API key) or `sk-proj-...` (project-scoped key)
- **Usage**: Used by `services/openaiService.js` for all AI chat completions
- **Security**: High sensitivity - never commit to version control

#### `OPENAI_PROJECT_ID` (Optional)
- **Purpose**: Project identifier for project-scoped API keys
- **Format**: Project UUID string
- **Usage**: Required when using `sk-proj-...` API keys to access specific models
- **Default**: `undefined` (allows older API keys to work without project scoping)
- **Files**: `services/openaiService.js`

#### `OPENAI_MODEL` (Optional)
- **Purpose**: Override default AI model selection
- **Format**: OpenAI model name (e.g., `gpt-4o`, `gpt-3.5-turbo`)
- **Default**: `gpt-4o`
- **Usage**: Primary model for chat completions (fallback to `gpt-3.5-turbo` on errors)
- **Files**: `services/openaiService.js`

### Airtable Configuration

#### `AIRTABLE_BASE_ID` (Required)
- **Purpose**: Identifier for the Airtable base containing user data and logs
- **Format**: Base ID starting with `app...` (e.g., `appXYZ123ABC456`)
- **Usage**: All data operations (user profiles, chat history, logging)
- **Files**: 
  - `services/personalisationService.js`
  - `services/memoryService.js` 
  - `utils/logging.js`
  - `controllers/chatController.js`

#### `AIRTABLE_API_KEY` (Required)
- **Purpose**: Authentication token for Airtable API access
- **Format**: Personal access token or OAuth token
- **Usage**: Authorization header for all Airtable API requests
- **Security**: High sensitivity - never commit to version control
- **Permissions Required**: 
  - Read access to Users table
  - Read/Write access to Chat, Meals, Workouts, Sleep, Mood, Supplements, Reflections tables

### Server Configuration

#### `PORT` (Optional)
- **Purpose**: HTTP port for the Express server
- **Format**: Integer (1-65535)
- **Default**: `3000`
- **Usage**: Server binding in `server/index.js`
- **Environment**: Usually set by hosting platform (Heroku, Railway, etc.)

#### `ALLOWED_ORIGINS` (Optional)
- **Purpose**: Comma-separated list of allowed CORS origins
- **Format**: `https://domain1.com,https://domain2.com`
- **Default**: All origins allowed (for local development)
- **Usage**: CORS middleware configuration in `server/index.js`
- **Security**: Should be configured in production to prevent unauthorized cross-origin requests

## Environment Variable Usage Map

| Variable | File | Purpose | Required |
|----------|------|---------|----------|
| `OPENAI_API_KEY` | `services/openaiService.js`, `server/index.js` | AI API authentication | ✅ Yes |
| `OPENAI_PROJECT_ID` | `services/openaiService.js` | Project-scoped API access | ⚠️ If using project keys |
| `OPENAI_MODEL` | `services/openaiService.js` | Model selection override | ❌ Optional |
| `AIRTABLE_BASE_ID` | Multiple service files | Database base identifier | ✅ Yes |
| `AIRTABLE_API_KEY` | Multiple service files | Database authentication | ✅ Yes |
| `PORT` | `server/index.js` | Server port binding | ❌ Optional |
| `ALLOWED_ORIGINS` | `server/index.js` | CORS origin whitelist | ❌ Optional |

## Configuration Validation

### Startup Validation

The system performs basic environment validation on startup:

```javascript
// server/index.js - Environment debugging
console.log('✅ ENV DEBUG:', {
  PORT: port,
  OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY?.length,
});
```

### Runtime Validation

- **OpenAI Service**: Validates API key format and project access during first API call
- **Airtable Services**: Validates base access and table permissions on data operations
- **CORS Middleware**: Validates origin matching for cross-origin requests

## Development vs Production

### Development Environment
```bash
# Local development defaults
PORT=3000
ALLOWED_ORIGINS=                    # Allow all origins
OPENAI_MODEL=gpt-4o                 # Default model
OPENAI_PROJECT_ID=                  # Optional for older keys
```

### Production Environment  
```bash
# Production configuration
PORT=                               # Set by hosting platform
ALLOWED_ORIGINS=https://strukt.app  # Restrict to production domains
OPENAI_MODEL=gpt-4o                 # Stable model choice
OPENAI_PROJECT_ID=proj-xyz123       # Required for project keys
```

## Security Best Practices

### API Key Management
- **Never commit**: Add `.env` to `.gitignore`
- **Rotate regularly**: Update keys periodically
- **Scope appropriately**: Use minimum required permissions
- **Monitor usage**: Track API consumption and costs

### Environment Isolation
- **Separate environments**: Different keys for dev/staging/production
- **Key rotation**: Independent rotation schedules
- **Access control**: Limit key access to necessary team members

### Validation and Monitoring
- **Startup checks**: Validate critical variables on application start
- **Health monitoring**: Monitor API response patterns for key issues
- **Error logging**: Log authentication failures without exposing keys

## Error Scenarios

### Missing Required Variables
- **`OPENAI_API_KEY`**: OpenAI client will throw authentication error on first API call
- **`AIRTABLE_BASE_ID`**: Airtable requests will fail with 404 errors
- **`AIRTABLE_API_KEY`**: Airtable requests will fail with 401 authentication errors

### Invalid Configuration
- **Invalid `OPENAI_PROJECT_ID`**: Model access errors, fallback to GPT-3.5-turbo
- **Wrong `AIRTABLE_BASE_ID`**: Table not found errors
- **Invalid `ALLOWED_ORIGINS`**: CORS rejection for legitimate requests

### Troubleshooting Commands

```bash
# Check environment variable loading
node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY?.length)"

# Test OpenAI API access
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Test Airtable API access  
curl -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/tbl87AICCbvbgrLCY?maxRecords=1"
```

## Configuration Templates

### Local Development
```bash
# Copy .env.example to .env and fill in your values
cp .env.example .env
```

### Docker Deployment
```dockerfile
# Dockerfile environment setup
ENV NODE_ENV=production
ENV PORT=3000
# API keys set via docker run -e or docker-compose
```

### Heroku Deployment
```bash
# Set config vars via Heroku CLI
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set AIRTABLE_BASE_ID=app...
heroku config:set AIRTABLE_API_KEY=pat...
heroku config:set ALLOWED_ORIGINS=https://strukt.app
```

---

*Last Updated: August 2024*