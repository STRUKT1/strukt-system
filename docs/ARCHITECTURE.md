# System Architecture

This document provides a high‑level overview of the STRUKT System architecture, including component relationships, data flows, and integration patterns.

## High‑Level System Overview

The STRUKT System is a **stateless Node.js API** that serves as the backend for a conversational AI health coach. It integrates with external services (OpenAI, Airtable) to provide personalized health and fitness guidance.

### Core Architecture Principles

- **Stateless Design**: No local database; relies on external services.
- **Microservice‑Ready**: Modular structure with clear service boundaries.
- **API‑First**: RESTful JSON API designed for mobile and web clients.
- **External Integration**: Uses proven external services for AI and storage.
- **Conversation‑Driven**: AI chat is the primary user interface.

---

## System Components (Component Diagram)

```mermaid
graph TD
    subgraph "Client Applications"
        Mobile[STRUKT Mobile App]
        Web[Web Interface]
        APIClient[3rd‑Party Clients]
    end

    subgraph "STRUKT System API"
        Server[Express Server<br/>server/index.js]

        subgraph "API Layer"
            Routes[Route Handlers<br/>routes/]
            Middleware[Middleware<br/>middleware/]
        end

        subgraph "Business Logic"
            Controllers[Controllers<br/>controllers/]
        end

        subgraph "Service Layer"
            AIService[OpenAI Service<br/>services/openaiService.js]
            MemoryService[Memory Service<br/>services/memoryService.js]
            PersonalizeService[Personalization Service<br/>services/personalisationService.js]
            LoggingUtils[Logging Utils<br/>utils/logging.js]
        end
    end

    subgraph "External Services"
        OpenAI[(OpenAI API<br/>GPT‑4o / GPT‑3.5)]
        Airtable[(Airtable<br/>User Data & Logs)]
    end

    subgraph "Configuration"
        Prompts[System Prompts<br/>utils/prompts/]
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

Request Flow Architecture (Sequence Diagram)

AI Chat Request Sequence

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

    OpenAISvc->>+OpenAI: Chat Completion (GPT‑4o)
    alt Success
        OpenAI-->>-OpenAISvc: AI Response
    else Model Error
        OpenAISvc->>+OpenAI: Fallback (GPT‑3.5‑turbo)
        OpenAI-->>-OpenAISvc: Fallback Response
    end

    OpenAISvc-->>-Controller: AI Reply Text

    Note over Controller: Log conversation
    Controller->>+Airtable: logChatInteraction()
    Airtable-->>-Controller: Log confirmed

    Controller-->>-API: {success: true, reply}
    API-->>-Client: JSON Response

Data Architecture (ER Overview)

erDiagram
    USERS ||--o{ CHAT_INTERACTIONS : has
    USERS ||--o{ MEALS : logs
    USERS ||--o{ WORKOUTS : logs
    USERS ||--o{ SLEEP : logs
    USERS ||--o{ MOOD : logs
    USERS ||--o{ SUPPLEMENTS : logs
    USERS ||--o{ REFLECTIONS : logs

    USERS {
        string id PK
        string email
        string goals
        string dietary_needs
        string medical_considerations
        string preferences
    }

    CHAT_INTERACTIONS {
        string id PK
        string user_id FK
        string message
        string ai_response
        string topic
        datetime created
    }

    MEALS {
        string id PK
        string user_id FK
        string name
        string foods
        number calories
        number protein
        number carbs
        number fat
        datetime created
    }

    WORKOUTS {
        string id PK
        string user_id FK
        string name
        number duration
        string exercises
        string intensity
        string notes
        datetime created
    }

Environment Configuration (Component Diagram)

graph LR
    subgraph "Environment Variables"
        OpenAI_Key[OPENAI_API_KEY]
        OpenAI_Project[OPENAI_PROJECT_ID]
        OpenAI_Model[OPENAI_MODEL]
        Airtable_Base[AIRTABLE_BASE_ID]
        Airtable_Key[AIRTABLE_API_KEY]
        Port[PORT]
        Origins[ALLOWED_ORIGINS]
    end

    subgraph "Service Configuration"
        OpenAI_Client[OpenAI Client]
        Airtable_Client[Airtable Integration]
        Server_Config[Express Server]
        CORS_Config[CORS Middleware]
    end

    OpenAI_Key --> OpenAI_Client
    OpenAI_Project --> OpenAI_Client
    OpenAI_Model --> OpenAI_Client
    Airtable_Base --> Airtable_Client
    Airtable_Key --> Airtable_Client
    Port --> Server_Config
    Origins --> CORS_Config

echnology Stack

Runtime: Node.js, Express.js
Package Manager: npm

External Integrations
	•	OpenAI API: GPT‑4o (primary) and GPT‑3.5‑turbo (fallback)
	•	Airtable: User data, logs, and operational storage
	•	Heroku (example): Deployment target (via app.json)

Core Dependencies
	•	axios (HTTP), joi (validation), helmet (security headers), cors,
express-rate-limit (rate limiting), dotenv (env management)

⸻

Security Architecture (Layers)

graph TD
    subgraph "Client Request"
        Request[HTTP Request]
    end

    subgraph "Security Middleware Stack"
        RateLimit[Rate Limiting<br/>60 req/min per IP]
        CORS[CORS Protection<br/>Configurable origins]
        Helmet[Security Headers<br/>XSS/CSRF]
        JSONParser[JSON Body Parser<br/>Size limits]
        Validation[Input Validation<br/>Joi schemas]
    end

    subgraph "Business Logic"
        Controllers[Controllers]
    end

    subgraph "External Services"
        OpenAI_Secure[OpenAI API<br/>API Key Auth]
        Airtable_Secure[Airtable<br/>Bearer Token Auth]
    end

    Request --> RateLimit --> CORS --> Helmet --> JSONParser --> Validation --> Controllers
    Controllers --> OpenAI_Secure
    Controllers --> Airtable_Secure

Security Considerations
	•	Rate limiting, input validation, and strict CORS.
	•	Secrets via environment variables (no secrets in code).
	•	Public API with email‑based identification (no complex auth in this service).

⸻

Deployment Architecture
	•	Heroku (or similar PaaS) with:
	•	app.json for app config
	•	package.json start script
	•	Env vars managed in provider
	•	Stateless → horizontally scalable.
	•	Single OpenAI client reused across requests.

⸻

Performance Characteristics

Typical Response Times
	•	Simple chat: ~200–500 ms
	•	Context‑heavy chat: ~500–2000 ms
	•	Data logging: ~100–300 ms

Primary Bottlenecks
	•	OpenAI latency (primary), Airtable latency (secondary), context building CPU.

⸻

Integration Patterns
	•	Circuit Breaker: Model fallback (GPT‑4o → GPT‑3.5).
	•	Retries: Basic error handling (recommended to add exponential backoff).
	•	Connection Reuse: Singleton clients for OpenAI and Airtable.
	•	Structured Errors: Consistent error payloads.

⸻

Future Architecture Considerations

Near‑Term
	•	Response caching (e.g., Redis)
	•	Background jobs/queues for non‑critical tasks
	•	Health checks & APM

Long‑Term
	•	Split services (AI, data, user) into microservices
	•	Event streaming for real‑time features
	•	Edge deployments for lower latency
	•	Migrate from Airtable to dedicated DB when needed

⸻

Last Updated: August 2025


