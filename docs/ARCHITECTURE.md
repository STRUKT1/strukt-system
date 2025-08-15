# System Architecture

This document provides a high-level overview of the STRUKT System architecture, including component relationships, data flows, and integration patterns.

## High-Level System Overview

The STRUKT System is a **stateless Node.js API** that serves as the backend for a conversational AI health coach. The system integrates with external services (OpenAI, Airtable) to provide personalized health and fitness guidance.

### Core Architecture Principles

- **Stateless Design**: No local database, relies on external services
- **Microservice-Ready**: Modular structure with clear service boundaries  
- **API-First**: RESTful JSON API designed for mobile and web clients
- **External Integration**: Heavy reliance on best-in-class external services
- **Conversation-Driven**: AI chat as the primary user interface

## System Components

```mermaid
graph TD
    subgraph "Client Applications"
        Mobile[STRUKT Mobile App]
        Web[Web Interface]
        API_Client[3rd Party Clients]
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
            AI_Service[OpenAI Service<br/>services/openaiService.js]
            Memory[Memory Service<br/>services/memoryService.js]
            Personalization[Personalization Service<br/>services/personalisationService.js]
            Logging[Logging Utils<br/>utils/logging.js]
        end
    end
    
    subgraph "External Services"
        OpenAI[(OpenAI API<br/>GPT-4o / GPT-3.5)]
        Airtable[(Airtable<br/>User Data & Logs)]
    end
    
    subgraph "Configuration"
        Prompts[System Prompts<br/>utils/prompts/]
        Env[Environment Variables]
    end
    
    Mobile --> Server
    Web --> Server
    API_Client --> Server
    
    Server --> Routes
    Routes --> Controllers
    Controllers --> AI_Service
    Controllers --> Memory
    Controllers --> Personalization
    Controllers --> Logging
    
    AI_Service --> OpenAI
    Memory --> Airtable
    Personalization --> Airtable
    Logging --> Airtable
    
    AI_Service --> Prompts
    Server --> Env
    
    Server --> Middleware
    Middleware --> Routes
```

## Request Flow Architecture

### AI Chat Request Sequence

```mermaid
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
    
    Note over Controller: Combine: System + Personal + Memory
    Controller->>+OpenAISvc: getAIReply(messagesWithContext)
    
    OpenAISvc->>+OpenAI: GPT-4o chat completion
    alt Success
        OpenAI-->>-OpenAISvc: AI Response
    else Model Error
        OpenAISvc->>+OpenAI: Fallback to GPT-3.5-turbo
        OpenAI-->>-OpenAISvc: Fallback Response
    end
    
    OpenAISvc-->>-Controller: AI Reply Text
    
    Note over Controller: Log conversation
    Controller->>+Airtable: logChatInteraction()
    Airtable-->>-Controller: Log confirmed
    
    Controller-->>-API: {success: true, reply}
    API-->>-Client: JSON Response
```

### Data Logging Flow

```mermaid
sequenceDiagram
    participant Client as Mobile/Web Client
    participant API as Express API
    participant LogController as Log Controller
    participant LoggingUtil as Logging Utils
    participant Airtable as Airtable
    
    Client->>+API: POST /log {email, type, data}
    API->>+LogController: Route to logController
    
    Note over LogController: Validate schema (Joi)
    
    alt Log Type: meal
        LogController->>+LoggingUtil: logMeal(email, data)
    else Log Type: workout
        LogController->>+LoggingUtil: logWorkout(email, data)
    else Log Type: sleep
        LogController->>+LoggingUtil: logSleep(email, data)
    else Other types
        LogController->>+LoggingUtil: log{Type}(email, data)
    end
    
    LoggingUtil->>+Airtable: findUserIdByEmail()
    Airtable-->>-LoggingUtil: User Record ID
    
    LoggingUtil->>+Airtable: Create record in {type} table
    Airtable-->>-LoggingUtil: Record created
    
    LoggingUtil-->>-LogController: Success
    LogController-->>-API: {success: true, message}
    API-->>-Client: 201 Created
```

## Data Architecture

### Airtable Schema Integration

The system integrates with multiple Airtable tables for data persistence:

```mermaid
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
```

### Environment Configuration

```mermaid
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
```

## Technology Stack Details

### Runtime Environment
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **NPM**: Package management

### External Integrations
- **OpenAI API**: GPT-4o and GPT-3.5-turbo models
- **Airtable**: Database and user management
- **Heroku**: Deployment platform (via app.json)

### Core Dependencies
- **axios**: HTTP client for external API calls
- **joi**: Input validation and schema enforcement
- **helmet**: Security headers
- **cors**: Cross-origin resource sharing
- **express-rate-limit**: Rate limiting middleware
- **dotenv**: Environment variable management

## Security Architecture

### Security Layers

```mermaid
graph TD
    subgraph "Client Request"
        Request[HTTP Request]
    end
    
    subgraph "Security Middleware Stack"
        RateLimit[Rate Limiting<br/>60 req/min per IP]
        CORS[CORS Protection<br/>Configurable origins]
        Helmet[Security Headers<br/>XSS, CSRF protection]
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
    
    Request --> RateLimit
    RateLimit --> CORS
    CORS --> Helmet
    Helmet --> JSONParser
    JSONParser --> Validation
    Validation --> Controllers
    Controllers --> OpenAI_Secure
    Controllers --> Airtable_Secure
```

### Security Considerations

- **Rate Limiting**: Protection against abuse and DoS attacks
- **Input Validation**: Prevents injection attacks via Joi schemas
- **No Authentication**: Public API with email-based user identification
- **External API Security**: Secure credential management for OpenAI and Airtable
- **CORS Configuration**: Controlled cross-origin access

## Deployment Architecture

### Heroku Deployment

The system is configured for Heroku deployment with:

- **`app.json`**: Heroku app configuration
- **`package.json`**: Node.js start script configuration
- **Environment Variables**: Managed via Heroku config vars
- **Process Type**: Single web dyno running Express server

### Scaling Considerations

- **Stateless Design**: Horizontal scaling capability
- **External Dependencies**: No local database to manage
- **Memory Usage**: Minimal server-side state
- **Connection Pooling**: Single OpenAI client instance reuse

## Performance Characteristics

### Response Times
- **Simple Chat**: 200-500ms (depends on OpenAI API)
- **Complex Context**: 500-2000ms (user lookup + context building)
- **Data Logging**: 100-300ms (Airtable API calls)
- **Chat History**: 100-500ms (depends on history size)

### Bottlenecks
- **OpenAI API**: Primary latency source
- **Airtable API**: Secondary latency for user data
- **Context Building**: CPU-intensive for large histories
- **Rate Limiting**: 60 req/min ceiling

## Integration Patterns

### External Service Integration
- **Circuit Breaker**: OpenAI fallback model pattern
- **Retry Logic**: Basic error handling (no exponential backoff)
- **Connection Reuse**: Single client instances
- **Error Propagation**: Structured error responses

### Data Flow Patterns
- **Request-Response**: Synchronous API calls
- **No Caching**: Fresh data on every request  
- **No Queuing**: Direct processing of all requests
- **Logging**: Async fire-and-forget to Airtable

## Future Architecture Considerations

### Near-Term Enhancements
- **Response Caching**: Redis for repeated context building
- **Async Processing**: Queue system for non-critical operations
- **Monitoring**: Application performance monitoring (APM)
- **Health Checks**: Structured health endpoint

### Long-Term Evolution
- **Microservices**: Split AI, data, and user services
- **Event Streaming**: Real-time data flows
- **Edge Computing**: Global deployment for reduced latency
- **Database Migration**: Move from Airtable to dedicated database

---

*Last Updated: August 2024*