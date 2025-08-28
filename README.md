# STRUKT System

The core STRUKT coaching platform — AI logic, automations, integrations, and assistant intelligence.

## Overview

STRUKT is an AI-powered coaching platform that provides personalized health and fitness guidance through intelligent conversations.  
The system integrates with Airtable for data storage and OpenAI for advanced AI coaching capabilities.  
It is implemented as a Node.js/Express API, offering endpoints for AI chat, health data logging, and integration with external services.

## Quick Start

1. **Prerequisites**: Node.js 16+, OpenAI API key, Airtable account  
2. **Setup**:
   ```bash
   git clone https://github.com/STRUKT1/strukt-system.git
   cd strukt-system
   npm install
   cp .env.example .env
   # Edit .env with your API keys
   ```
3. **Run**: `npm run dev`  
4. **Test**: Visit [http://localhost:3000](http://localhost:3000)

---

## Architecture

- **Runtime**: Node.js + Express.js API server  
- **AI**: OpenAI GPT-4o with GPT-3.5-turbo fallback  
- **Database**: 
  - **Primary**: Supabase (PostgreSQL with RLS)
  - **Legacy**: Airtable (optional dual-write for migration)
- **Security**: Rate limiting, CORS, input validation  
- **Mobile**: Expo React Native client support  

---

## API Endpoints

### v1 API (Supabase-first)
- `GET /v1/profile` — User profile management
- `PATCH /v1/profile` — Update user profile (including nutrition targets)
- `POST /v1/auto-log` — Log health/fitness data with enhanced responses
- `GET /v1/nutrition/summary` — Aggregated nutrition data with timezone support
- `POST /v1/chat` — AI chat interactions
- `GET /v1/chat` — Chat history

### Legacy API
- `GET /` — Health check  
- `POST /ask` — AI chat interaction (main endpoint)  
- `GET /chat-history` — Retrieve conversation history  
- `POST /log` — Log health/fitness data (meals, workouts, sleep, etc.)  

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [Repository Structure](docs/REPO_STRUCTURE.md) | Complete file tree and module overview |
| [AI Overview](docs/AI_OVERVIEW.md) | AI functionality, prompts, and data flows |
| [API Endpoints](docs/ENDPOINTS.md) | Complete REST API documentation |
| [System Architecture](docs/ARCHITECTURE.md) | System design with Mermaid diagrams |
| [Secrets & Configuration](docs/SECRETS.md) | Required environment variables |
| [Development Guide](docs/DEVELOPMENT.md) | Local setup, testing, and debugging |
| [Usage Guide](docs/USAGE.md) | How to use the platform effectively |
| [Contributing](docs/CONTRIBUTING.md) | Guidelines for contributors |
| [Changelog](docs/CHANGELOG.md) | Version history and updates |
| [Airtable Schema Guide](docs/AIRTABLE_SPEC_README.md) | Schema specification and validation |
| [Nutrition API Guide](docs/nutrition-api.md) | Nutrition targets and summary endpoints |

---

## Key Features

- 🤖 **Conversational AI Coach** — Personalized health guidance via OpenAI  
- 📊 **Data Logging** — Track meals, workouts, sleep, mood, supplements  
- 🎯 **Nutrition Targets** — Set and track daily calorie and macro goals
- 📈 **Nutrition Summaries** — Aggregated nutrition data with timezone support
- 🧠 **Memory & Context** — AI remembers user preferences and history  
- 🏥 **Health Focus** — Specialized prompts for fitness, nutrition, wellness  
- 📈 **Custom Plans** — AI-generated nutrition and workout plans  
- 🔒 **Secure** — Rate limiting, input validation, CORS protection  
- 📱 **Mobile Ready** — JSON API designed for mobile app integration  

---

## Technology Stack

- **Backend**: Node.js, Express.js  
- **AI**: OpenAI API (GPT-4o / GPT-3.5-turbo)  
- **Database**: 
  - **Primary**: Supabase (PostgreSQL with Row Level Security)
  - **Legacy**: Airtable REST API (dual-write migration support)
- **Mobile**: Expo React Native  
- **Validation**: Joi schemas  
- **Security**: Helmet.js, CORS, express-rate-limit  
- **Deployment**: Heroku-compatible  

---

## 🔄 Database Migration (Airtable → Supabase)

STRUKT is migrating from Airtable to Supabase as the primary datastore. The system supports dual-write mode during the transition.

### Environment Configuration

Add these variables to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Backend Configuration
DATA_BACKEND_PRIMARY=supabase    # Primary read/write backend
DUAL_WRITE=false                 # Enable dual-write to Airtable during migration
```

### Database Schema

The Supabase schema is defined in `/db/migrations/2025-08-<date>-initial-schema.sql` and includes:

- `user_profiles` — User profile data with comprehensive health preferences
- `workouts` — Exercise logging with duration, calories, notes
- `meals` — Nutrition tracking with macros and calorie information  
- `sleep_logs` — Sleep quality and duration tracking
- `supplements` — Supplement intake logging
- `mood_logs` — Daily mood and stress level tracking
- `chat_interactions` — AI conversation history and context

### ETL Migration Tool

Use the ETL script to migrate data from Airtable to Supabase:

```bash
# Dry-run mode (default) - shows what would be migrated
node tools/etl_airtable_to_supabase.js

# Limit records for testing
node tools/etl_airtable_to_supabase.js --limit 5

# Actually migrate data (requires Supabase credentials)
node tools/etl_airtable_to_supabase.js --apply

# Migrate only recent records
node tools/etl_airtable_to_supabase.js --apply --since 2024-01-01
```

The ETL tool:
- Maps Airtable fields to Supabase schema using `/docs/airtable_to_supabase_mapping.md`
- Handles data type conversions (arrays, booleans, dates)
- Provides detailed progress logging and error handling
- Supports dry-run mode for validation before migration

### Dual-Write Mode

During migration, enable dual-write to maintain Airtable compatibility:

```bash
DATA_BACKEND_PRIMARY=supabase
DUAL_WRITE=true  # Writes go to both Supabase (primary) and Airtable (backup)
```

Reads always come from the primary backend (Supabase), while writes are mirrored to both systems.

---

## License

This project is proprietary software developed by STRUKT.