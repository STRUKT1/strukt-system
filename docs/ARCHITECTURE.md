# STRUKT System Architecture

This document provides a high-level and detailed overview of the STRUKT coaching platform architecture, including system components, data flows, and integration patterns.

## System Overview

The STRUKT System is a **stateless Node.js/Express API** that powers an AI-driven health and fitness coach.  
It integrates with OpenAI for conversational AI and Airtable for user data management, providing personalized health guidance through mobile and web clients.  
The platform handles user interactions, personalizes coaching experiences, and tracks various health and fitness metrics.

### Core Architecture Principles
- **Stateless Design**: No local database; relies entirely on external services.
- **Microservice-Ready**: Modular structure with clear service boundaries.
- **API-First**: RESTful JSON API designed for mobile and web clients.
- **External Integration**: Uses proven external services for AI and storage.
- **Conversation-Driven**: AI chat is the primary user interface.

---

## Component Diagram

```mermaid
graph TD
    subgraph "Client Applications"
        Mobile[STRUKT Mobile App]
        Web[Web Interface]
        APIClient[3rd-Party Clients]
    end

    subgraph "STRUKT System API"
        Server[Express Server]

        subgraph "API Layer"
            Routes[Route Handlers]
            Middleware[Middleware]
        end

        subgraph "Business Logic"
            Controllers[Controllers]
        end

        subgraph "Service Layer"
            AIService[OpenAI Service]
            MemoryService[Memory Service]
            PersonalizeService[Personalization Service]
            LoggingUtils[Logging Utilities]
        end
    end

    subgraph "External Services"
        OpenAI[(OpenAI API<br/>GPT-4o / GPT-3.5)]
        Airtable[(Airtable Database)]
    end

    subgraph "Configuration"
        Prompts[System Prompts]
        Env[Environment Variables]
    end

    Mobile --> Server
    Web --> Server
    APIClient --> Server

    Server --> Routes
    Routes --> Controllers
    Controllers --> AIService
    Controllers --> MemoryService
    Controllers --> PersonalizeService
    Controllers --> LoggingUtils

    AIService --> OpenAI
    MemoryService --> Airtable
    PersonalizeService --> Airtable
    LoggingUtils --> Airtable

    AIService --> Prompts
    Server --> Env
    Server --> Middleware
    Middleware --> Routes

    Airtable --> Users[Users Table]
    Airtable --> Chat[Chat Interactions]
    Airtable --> Meals[Meals Table]
    Airtable --> Workouts[Workouts Table]
    Airtable --> Sleep[Sleep Log]
    Airtable --> Mood[Mood Log]
    Airtable --> Plans[Custom Plans]
    Airtable --> Progress[Progress Tracker]
    
    Sequence Diagram — AI Chat Request Flow

sequenceDiagram
    participant Client as Mobile/Web Client
    participant API as Express API
    participant Controller as AI Controller
    participant PersonalSvc as Personalization Service
    participant MemorySvc as Memory Service
    participant OpenAISvc as OpenAI Service
    participant Airtable as Airtable
    participant OpenAI as OpenAI API

    Client->>+API: POST /ask {messages, email}
    API->>+Controller: Route to aiController

    Note over Controller: Input Validation (Joi)
    Controller->>+Airtable: findUserIdByEmail()
    Airtable-->>-Controller: User Record ID

    par Personalization Context
        Controller->>+PersonalSvc: fetchUserData(email)
        PersonalSvc->>+Airtable: Get user profile
        Airtable-->>-PersonalSvc: Profile fields
        PersonalSvc-->>-Controller: Personalization prompt
    and Memory Context
        Controller->>+MemorySvc: getRecentChatHistory(userId)
        MemorySvc->>+Airtable: Get recent chats
        Airtable-->>-MemorySvc: Chat history
        MemorySvc-->>-Controller: Memory prompt
    end

    Note over Controller: Combine System + Personal + Memory prompts
    Controller->>+OpenAISvc: getAIReply(messagesWithContext)

    OpenAISvc->>+OpenAI: Chat Completion (GPT-4o)
    alt Success
        OpenAI-->>-OpenAISvc: AI Response
    else Model Error
        OpenAISvc->>+OpenAI: Fallback (GPT-3.5-turbo)
        OpenAI-->>-OpenAISvc: Fallback Response
    end

    OpenAISvc-->>-Controller: AI Reply Text

    Note over Controller: Log conversation
    Controller->>+Airtable: logChatInteraction()
    Airtable-->>-Controller: Log confirmed

    Controller-->>-API: {success: true, reply}
    API-->>-Client: JSON Response
    
    Core Services

OpenAI Service
	•	Handles AI conversation generation
	•	Manages system prompts and user context
	•	Provides fallback models for reliability

Personalization Service
	•	Fetches user profiles from Airtable
	•	Builds personalized prompts based on user preferences
	•	Adapts AI responses to individual goals and context

Memory Service
	•	Retrieves recent chat history for context
	•	Maintains conversation continuity
	•	Enables the AI to reference past interactions

Logging Utilities
	•	Records all user interactions
	•	Tracks meals, workouts, sleep, mood, and supplements
	•	Provides structured data for AI analysis and coaching insights

⸻

Data Architecture (ER Diagram)

erDiagram
    USERS ||--o{ CHAT_INTERACTIONS : has
    USERS ||--o{ MEALS : logs
    USERS ||--o{ WORKOUTS : logs
    USERS ||--o{ SLEEP : logs
    USERS ||--o{ MOOD : logs
    USERS ||--o{ SUPPLEMENTS : logs
    USERS ||--o{ REFLECTIONS : logs
    
    Tables
	•	Users: Member profiles, goals, and preferences
	•	Chat Interactions: Conversation history and AI responses
	•	Meals/Workouts/Sleep/Mood: Health and fitness tracking data
	•	Custom Plans: AI-generated nutrition and workout plans
	•	Progress Tracker: Weight, photos, and progress metrics
  
  Security Architecture
  
  graph TD
    Request[HTTP Request] --> RateLimit[Rate Limiting]
    RateLimit --> CORS[CORS Protection]
    CORS --> Helmet[Security Headers]
    Helmet --> JSONParser[JSON Body Parser]
    JSONParser --> Validation[Input Validation]
    Validation --> Controllers[Controllers]
    Controllers --> OpenAI_Secure[OpenAI API (Key Auth)]
    Controllers --> Airtable_Secure[Airtable (Bearer Token)]

Security Considerations
	•	API keys are managed through environment variables
	•	Rate limiting is implemented for API protection
	•	User data is validated before storage
	•	Helmet.js provides additional security headers

⸻

Deployment Architecture
	•	Designed for stateless deployment on Heroku or similar PaaS
	•	Uses app.json for app configuration
	•	Environment variables managed in provider
	•	Horizontally scalable
	•	Single OpenAI client reused across requests

⸻

Performance Characteristics
	•	Simple chat: ~200–500 ms
	•	Context-heavy chat: ~500–2000 ms
	•	Data logging: ~100–300 ms

Primary Bottlenecks
	•	OpenAI latency (primary)
	•	Airtable latency (secondary)
	•	Context building CPU load

⸻

Integration Patterns
	•	Circuit Breaker: GPT-4o → GPT-3.5 fallback
	•	Retries: Basic error handling (future: exponential backoff)
	•	Connection Reuse: Singleton clients for OpenAI and Airtable
	•	Structured Errors: Consistent error payloads

⸻

Future Architecture Considerations
	•	Near-Term: Response caching (Redis), background jobs/queues, health checks, APM
	•	Long-Term: Split services into microservices, event streaming, edge deployments, migrate to dedicated DB

⸻

Last Updated: August 2025