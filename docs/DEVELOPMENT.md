# Development Guide

This guide covers how to set up, run, test, and debug the STRUKT System locally.

## Quick Start

### Prerequisites

- **Node.js**: Version 16+ (recommended: latest LTS)
- **NPM**: Comes with Node.js installation
- **OpenAI API Key**: Required for AI functionality
- **Airtable Account**: Required for data storage

### Initial Setup

1. **Clone the repository**:
```bash
git clone https://github.com/STRUKT1/strukt-system.git
cd strukt-system
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your API keys (see Environment Configuration below)
```

4. **Start the development server**:
```bash
npm run dev
```

The server will start on `http://localhost:3000` with auto-reload via nodemon.

## Environment Configuration

### Required API Keys

You'll need to obtain and configure these API keys in your `.env` file:

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

#### Airtable Configuration
1. Create an Airtable account at [airtable.com](https://airtable.com)
2. Get your base ID from the Airtable API documentation
3. Create a personal access token in your account settings
4. Add to `.env`:
   ```
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
   ```

### Airtable Schema Setup

The system expects specific tables in your Airtable base. Refer to `STRUKT_Airtable_Schema.md` for the complete schema or create these essential tables:

- **Users** (`tbl87AICCbvbgrLCY`) - User profiles and onboarding data
- **Chat** (`tblDtOOmahkMYEqmy`) - Conversation history
- **Meals** (`tblWLkTKkxkSEcySD`) - Meal logging
- **Workouts** (`tblgqvIqFetN2s23J`) - Exercise logging

## Available Scripts

### Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run linting (currently just a placeholder)
npm run lint
```

### Manual Testing Commands

```bash
# Test server health
curl http://localhost:3000/

# Test AI chat (replace with your test data)
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Test data logging
curl -X POST http://localhost:3000/log \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"meal","data":{"name":"Test"}}'
```

## Running and Testing

### Local Development Server

```bash
# Start with nodemon for auto-reload
npm run dev

# The server runs on http://localhost:3000
# API endpoints available at:
# - GET /
# - POST /ask  
# - GET /chat-history
# - POST /log
```

### Testing the AI Chat Endpoint

Create a test file `test-chat.js`:

```javascript
const axios = require('axios');

async function testChat() {
  try {
    const response = await axios.post('http://localhost:3000/ask', {
      messages: [
        { role: 'user', content: 'I want to start working out. Can you help?' }
      ],
      email: 'test@example.com',  // Optional: for personalization
      topic: 'fitness_planning'   // Optional: for categorization
    });
    
    console.log('AI Response:', response.data.reply);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testChat();
```

Run with: `node test-chat.js`

### Testing Data Logging

Create a test file `test-logging.js`:

```javascript
const axios = require('axios');

async function testLogging() {
  const logTypes = [
    {
      email: 'test@example.com',
      type: 'meal',
      data: {
        name: 'Breakfast',
        foods: 'Oatmeal with berries',
        calories: 300,
        protein: 10,
        carbs: 45,
        fat: 8
      }
    },
    {
      email: 'test@example.com', 
      type: 'workout',
      data: {
        name: 'Morning Run',
        duration: 30,
        exercises: 'Running',
        intensity: 'Medium'
      }
    }
  ];

  for (const log of logTypes) {
    try {
      const response = await axios.post('http://localhost:3000/log', log);
      console.log(`${log.type} logged:`, response.data);
    } catch (error) {
      console.error(`${log.type} error:`, error.response?.data || error.message);
    }
  }
}

testLogging();
```

## Debugging and Troubleshooting

### Common Issues

#### 1. OpenAI API Errors

**Error**: "Failed to generate AI reply"
```bash
# Check API key validity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

**Solutions**:
- Verify `OPENAI_API_KEY` in `.env`
- Check OpenAI account billing status
- For project-scoped keys, ensure `OPENAI_PROJECT_ID` is set

#### 2. Airtable Connection Issues

**Error**: "User not found" or Airtable 401/404 errors

**Debug steps**:
```bash
# Test Airtable API access
curl -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/tbl87AICCbvbgrLCY?maxRecords=1"
```

**Solutions**:
- Verify `AIRTABLE_BASE_ID` and `AIRTABLE_API_KEY` in `.env`
- Ensure table IDs match your Airtable schema
- Check API key permissions (read/write access required)

#### 3. Server Won't Start

**Error**: Port already in use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### Debug Logging

The server provides basic debug output on startup:

```bash
✅ ENV DEBUG: {
  PORT: 3000,
  OPENAI_API_KEY_LENGTH: 51  # Should show actual key length
}
🚀 STRUKT Coach server running on port 3000
```

### Advanced Debugging

#### Enable Detailed Request Logging

Add to `server/index.js` (temporarily):

```javascript
// Add before route mounting
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

#### Monitor External API Calls

Add axios interceptors in service files:

```javascript
// Add to services/openaiService.js
axios.interceptors.request.use(request => {
  console.log('OpenAI Request:', request.url);
  return request;
});
```

## Development Workflow

### Making Changes

1. **File Structure**: Follow the existing modular structure
   - Routes in `/routes` 
   - Business logic in `/controllers`
   - External services in `/services`
   - Utilities in `/utils`

2. **Code Style**: 
   - Use existing commenting style
   - Follow current error handling patterns
   - Maintain existing validation schemas

3. **Testing Changes**:
   ```bash
   # Restart dev server to see changes
   npm run dev
   
   # Test specific endpoints
   curl -X POST http://localhost:3000/ask -H "Content-Type: application/json" -d '...'
   ```

### Adding New Endpoints

1. **Create route handler** in `/routes`
2. **Create controller** in `/controllers` 
3. **Add validation schema** using Joi
4. **Mount route** in `server/index.js`
5. **Test with curl** or API client

Example new endpoint:

```javascript
// routes/health.js
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

module.exports = router;

// server/index.js
const healthRoutes = require('../routes/health');
app.use('/', healthRoutes);
```

### Adding New Log Types

1. **Update schema** in `controllers/logController.js`:
   ```javascript
   type: Joi.string()
     .valid('meal', 'workout', 'sleep', 'mood', 'supplement', 'reflection', 'new-type')
   ```

2. **Create logging function** in `utils/logging.js`
3. **Add table/field IDs** for new Airtable table
4. **Update log controller** dispatch logic

## Database Development

### Airtable Schema Changes

When modifying the Airtable schema:

1. **Update table IDs** in `utils/logging.js`
2. **Update field IDs** in `FIELD_IDS` object
3. **Test logging functions** with new schema
4. **Update documentation** in `STRUKT_Airtable_Schema.md`

### Data Seeding

For testing, create seed data in Airtable:

```javascript
// Create test user record
{
  "Email Address": "test@example.com",
  "Goals": "Weight loss, muscle gain", 
  "Dietary Needs": "Vegetarian",
  "Tone Preference": "Friendly"
}
```

## Performance Monitoring

### Basic Monitoring

Add request timing middleware:

```javascript
// server/index.js
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} - ${Date.now() - start}ms`);
  });
  next();
});
```

### Memory Usage

Monitor memory usage during development:

```javascript
// Add to any file for debugging
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log('Memory:', {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
  });
}, 30000); // Every 30 seconds
```

## IDE Configuration

### VS Code Setup

Recommended extensions:
- **REST Client**: Test API endpoints directly in VS Code
- **Thunder Client**: Alternative HTTP client
- **Dotenv**: Syntax highlighting for `.env` files

Create `.vscode/settings.json`:

```json
{
  "files.exclude": {
    "node_modules": true,
    ".env": false
  },
  "rest-client.environmentVariables": {
    "local": {
      "baseUrl": "http://localhost:3000"
    }
  }
}
```

### REST Client Test File

Create `api-tests.http`:

```http
### Health Check
GET {{baseUrl}}/

### AI Chat Test
POST {{baseUrl}}/ask
Content-Type: application/json

{
  "messages": [{"role": "user", "content": "Hello"}],
  "email": "test@example.com"
}

### Meal Logging Test  
POST {{baseUrl}}/log
Content-Type: application/json

{
  "email": "test@example.com",
  "type": "meal", 
  "data": {"name": "Test Meal", "calories": 300}
}
```

## Deployment Preparation

### Pre-deployment Checklist

- [ ] Environment variables configured for production
- [ ] CORS origins restricted to production domains
- [ ] Error logging configured (not just console)
- [ ] Health check endpoint responding
- [ ] All API keys valid and properly scoped
- [ ] Rate limiting configured appropriately

### Production Environment Variables

```bash
# Production .env template
NODE_ENV=production
PORT=                                    # Set by hosting platform
OPENAI_API_KEY=sk-proj-production-key
OPENAI_PROJECT_ID=proj-production-id
AIRTABLE_BASE_ID=app-production-base
AIRTABLE_API_KEY=pat-production-token
ALLOWED_ORIGINS=https://strukt.app
```

---

*Last Updated: August 2024*