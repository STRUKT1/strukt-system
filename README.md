# STRUKT System

The core STRUKT coaching platform — AI logic, automations, integrations, and assistant intelligence.

## Overview

STRUKT System is a Node.js/Express API that powers an AI-driven health and fitness coach. It integrates with OpenAI for conversational AI and Airtable for user data management, providing personalized health guidance through a chat interface.

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
4. **Test**: Visit `http://localhost:3000`

## Architecture

- **Runtime**: Node.js + Express.js API server
- **AI**: OpenAI GPT-4o with GPT-3.5-turbo fallback
- **Database**: Airtable (users, chat history, health logs)
- **Security**: Rate limiting, CORS, input validation

## API Endpoints

- `GET /` - Health check
- `POST /ask` - AI chat interaction (main endpoint)
- `GET /chat-history` - Retrieve conversation history  
- `POST /log` - Log health/fitness data (meals, workouts, sleep, etc.)

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [**Repository Structure**](docs/REPO_STRUCTURE.md) | Complete file tree and module overview |
| [**Architecture**](docs/ARCHITECTURE.md) | System design with Mermaid diagrams |
| [**API Endpoints**](docs/ENDPOINTS.md) | Complete REST API documentation |
| [**AI Overview**](docs/AI_OVERVIEW.md) | AI functionality, prompts, and data flows |
| [**Environment Setup**](docs/SECRETS.md) | Required environment variables |
| [**Development Guide**](docs/DEVELOPMENT.md) | Local setup, testing, and debugging |

## Key Features

- 🤖 **Conversational AI Coach**: Personalized health guidance via OpenAI
- 📊 **Data Logging**: Track meals, workouts, sleep, mood, supplements
- 🧠 **Memory & Context**: AI remembers user preferences and history
- 🏥 **Health Focus**: Specialized prompts for fitness, nutrition, wellness
- 🔒 **Secure**: Rate limiting, input validation, CORS protection
- 📱 **Mobile Ready**: JSON API designed for mobile app integration

## Technology Stack

- **Backend**: Node.js, Express.js
- **AI**: OpenAI API (GPT-4o/GPT-3.5-turbo)
- **Database**: Airtable REST API
- **Validation**: Joi schemas
- **Security**: Helmet, CORS, express-rate-limit
- **Deployment**: Heroku-compatible
