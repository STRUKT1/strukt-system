# Repository Structure

This document provides a complete overview of the STRUKT System repository structure, automatically generated and annotated for developer reference.

## Technology Stack

- **Runtime**: Node.js (Express.js framework)
- **AI Integration**: OpenAI API (GPT-4o with GPT-3.5-turbo fallback)
- **Database**: Airtable (REST API integration)
- **Security**: Helmet, CORS, Express Rate Limiting
- **Validation**: Joi schemas
- **Deployment**: Heroku-compatible (app.json present)

## Directory Structure

```
.
├── .github/                    # GitHub workflows and configuration
│   └── workflows/
│       └── ci.yml             # Continuous integration pipeline
├── assets/                    # Static assets (likely for mobile app)
│   ├── adaptive-icon.png
│   ├── icon.png
│   └── splash.png
├── controllers/               # ⭐ Business logic controllers
│   ├── aiController.js        # Main AI chat logic (POST /ask)
│   ├── chatController.js      # Chat history management
│   └── logController.js       # Data logging to Airtable
├── middleware/                # Express middleware
│   └── errorHandler.js        # Centralized error handling
├── routes/                    # ⭐ API route definitions
│   ├── ask.js                 # AI chat endpoint
│   ├── chatHistory.js         # Chat history endpoints
│   └── log.js                 # Logging endpoints
├── server/                    # ⭐ Application entry point
│   └── index.js               # Express app setup and configuration
├── services/                  # ⭐ Core business services
│   ├── memoryService.js       # Chat history and context management
│   ├── openaiService.js       # OpenAI API client and prompt handling
│   └── personalisationService.js # User data fetching and personalization
├── utils/                     # Utility functions and configurations
│   ├── logging.js             # Airtable logging utilities and field mapping
│   └── prompts/
│       └── strukt-system-prompt.txt # Core AI system prompt
├── docs/                      # 📚 Project documentation (this directory)
├── package.json               # Node.js dependencies and scripts
├── app.json                   # Heroku deployment configuration
└── README.md                  # Project overview
```

## Key File Annotations

### ⭐ Critical Runtime Files

- **`server/index.js`** - Main application entry point with Express setup, middleware, and route mounting
- **`controllers/aiController.js`** - Handles the core `/ask` endpoint with AI logic and context building
- **`services/openaiService.js`** - OpenAI client with model fallback and error handling
- **`routes/ask.js`** - Primary AI chat endpoint routing

### 🔧 Supporting Infrastructure

- **`utils/logging.js`** - Comprehensive Airtable integration with table/field ID mappings
- **`services/personalisationService.js`** - User onboarding data fetching and prompt building
- **`services/memoryService.js`** - Chat history retrieval and context management
- **`middleware/errorHandler.js`** - Global error handling with structured JSON responses

### 📱 Mobile/Frontend Assets

- **`assets/`** - Icon and splash screen assets suggesting mobile app integration
- **`app.json`** - Heroku deployment config indicating this is the backend API

### 🚫 Excluded from Version Control

- `node_modules/` - NPM dependencies
- `.env` - Environment variables (not present, should be created)
- Build artifacts and logs

## Module Status Assessment

| Module | Status | Purpose | Dependencies |
|--------|--------|---------|--------------|
| `server/` | ✅ Production | Main Express app | Express, middleware, routes |
| `controllers/` | ✅ Production | Business logic | Services, validation |
| `services/` | ✅ Production | Core functionality | OpenAI, Airtable APIs |
| `routes/` | ✅ Production | API endpoints | Controllers |
| `middleware/` | ✅ Production | Request processing | Express |
| `utils/` | ✅ Production | Shared utilities | Airtable, file system |
| `assets/` | ✅ Stable | Static resources | None |
| `docs/` | 🆕 New | Documentation | None |

## Architecture Notes

- **Stateless Design**: No local database, relies entirely on external services (Airtable, OpenAI)
- **Middleware Stack**: Security (Helmet), CORS, rate limiting, JSON parsing, error handling
- **AI Integration**: Context-aware chat with user personalization and conversation memory
- **Modular Structure**: Clear separation between routing, business logic, and external service integration

*Generated on: August 2024*