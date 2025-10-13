# STRUKT System Audit Report

**Audit Date:** October 13, 2025

**Purpose:** To establish a ground-truth understanding of the current data backend and API contract for frontend integration.

---

## 1. Environment & Configuration Analysis

The system uses a centralized configuration management approach defined in `src/config.js`. All process.env variables are documented below:

### Key Configuration Variables

**DATA_BACKEND_PRIMARY:**
- **Purpose:** Controls which database backend is used for read/write operations
- **Default Value:** `'supabase'`
- **Source:** `process.env.DATA_BACKEND_PRIMARY || 'supabase'`
- **Usage:** Checked in all service modules to enforce Supabase-primary architecture
- **Code Location:** `src/config.js`, all `src/services/logs/*.js`, `src/services/userProfiles.js`
- **Validation:** System validates this MUST be 'supabase' in Phase 1.5 (error thrown if not)

**DUAL_WRITE:**
- **Purpose:** Enables dual-write mode to write data to both Supabase (primary) and Airtable (legacy) during migration
- **Default Value:** `false`
- **Source:** `process.env.DUAL_WRITE === 'true'`
- **Usage:** When enabled, services write to Supabase first, then attempt non-blocking write to Airtable
- **Code Location:** `src/config.js`, all service modules
- **Behavior:** Dual-write failures are logged but do NOT block the primary Supabase operation

**SUPABASE_URL:**
- **Purpose:** Supabase project URL for database connection
- **Source:** `process.env.SUPABASE_URL`
- **Usage:** Required for all Supabase operations via `supabaseAdmin` client
- **Code Location:** `src/config.js`, `src/lib/supabaseServer.js`
- **Validation:** Warning issued if missing or contains placeholder value

**SUPABASE_SERVICE_ROLE_KEY:**
- **Purpose:** Service role key for admin-level Supabase operations (bypasses Row Level Security)
- **Source:** `process.env.SUPABASE_SERVICE_ROLE_KEY`
- **Usage:** Used to create `supabaseAdmin` client for backend operations
- **Code Location:** `src/config.js`, `src/lib/supabaseServer.js`
- **Validation:** Warning issued if missing or contains placeholder value

**SUPABASE_ANON_KEY:**
- **Purpose:** Anonymous key for client-side Supabase operations (respects Row Level Security)
- **Source:** `process.env.SUPABASE_ANON_KEY`
- **Usage:** Used for JWT authentication middleware
- **Code Location:** `src/config.js`, `src/lib/auth.js`
- **Validation:** Warning issued if missing (JWT auth will be disabled)

**AIRTABLE_BASE_ID:**
- **Purpose:** Airtable base ID for legacy data access and dual-write operations
- **Source:** `process.env.AIRTABLE_BASE_ID`
- **Usage:** Used in legacy controllers (`controllers/*.js`) and dual-write operations
- **Code Location:** Legacy services (`services/personalisationService.js`, `services/memoryService.js`, `utils/logging.js`)
- **Status:** Legacy - used only for backward compatibility and dual-write mode

**AIRTABLE_API_KEY:**
- **Purpose:** Airtable API key for authentication
- **Source:** `process.env.AIRTABLE_API_KEY`
- **Usage:** Used in legacy controllers and dual-write operations
- **Code Location:** Legacy services
- **Status:** Legacy - used only for backward compatibility and dual-write mode

**OPENAI_API_KEY:**
- **Purpose:** OpenAI API key for GPT model access
- **Source:** `process.env.OPENAI_API_KEY`
- **Usage:** Required for AI chat interactions via OpenAI API
- **Code Location:** `services/openaiService.js`
- **Models:** GPT-4o (primary), GPT-3.5-turbo (fallback)

### Additional Configuration Variables

**PORT:**
- **Purpose:** Server port
- **Default:** `4000`
- **Source:** `process.env.PORT || 4000`

**NODE_ENV:**
- **Purpose:** Runtime environment (development, production, test)
- **Default:** `'development'`
- **Source:** `process.env.NODE_ENV || 'development'`

**LOG_LEVEL:**
- **Purpose:** Logging verbosity
- **Default:** `'info'`
- **Source:** `process.env.LOG_LEVEL || 'info'`

**ALLOWED_ORIGINS:**
- **Purpose:** CORS allowed origins (comma-separated list)
- **Default:** `'http://localhost:3000,http://localhost:19006'`
- **Source:** `process.env.ALLOWED_ORIGINS.split(',')`

---

## 2. Data Source Logic Analysis

### Primary Switching Mechanism

**Is the logic controlled by an environment variable?**

**YES.** The primary switching mechanism is controlled by `process.env.DATA_BACKEND_PRIMARY`.

### Key Implementation Details

1. **Service-Level Enforcement:**
   All new services in `src/services/logs/*.js` and `src/services/userProfiles.js` explicitly check and enforce Supabase-primary:

```javascript
// From src/services/userProfiles.js (and all log services)
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';
const DUAL_WRITE = process.env.DUAL_WRITE === 'true';

async function getUserProfile(userId) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }
  // ... Supabase operations
}
```

2. **Dual-Write Pattern:**
   When `DUAL_WRITE=true`, services write to Supabase first, then attempt Airtable write (non-blocking):

```javascript
// From src/services/logs/meals.js
async function logMeal(userId, mealData) {
  // Primary write to Supabase
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error; // Fail if Supabase fails
  }

  // Dual-write to Airtable if enabled (non-blocking)
  if (DUAL_WRITE) {
    try {
      await writeMealToAirtable(userId, sanitizedData);
      console.log('✅ Meal dual-write to Airtable successful');
    } catch (airtableError) {
      console.error('⚠️ Meal dual-write to Airtable failed (non-blocking):', airtableError.message);
      // Don't throw - dual-write failures shouldn't break the primary operation
    }
  }

  return data; // Return Supabase data
}
```

3. **Legacy Controllers Still Use Airtable:**
   The old controllers (`controllers/aiController.js`, `controllers/logController.js`, `controllers/chatController.js`) still use Airtable directly via `utils/logging.js`. These support the legacy endpoints (`/ask`, `/log`, `/chat-history`).

### Code Blocks Implementing Switching Logic

**Location 1: Service-level validation (src/services/userProfiles.js)**
```javascript
async function getUserProfile(userId) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('getUserProfile failed:', error);
    throw error;
  }
}
```

**Location 2: Dual-write logic (src/services/logs/workouts.js)**
```javascript
const DATA_BACKEND_PRIMARY = process.env.DATA_BACKEND_PRIMARY || 'supabase';
const DUAL_WRITE = process.env.DUAL_WRITE === 'true';

async function logWorkout(userId, workoutData) {
  if (DATA_BACKEND_PRIMARY !== 'supabase') {
    throw new Error('Primary backend must be supabase for this service');
  }

  // ... validation ...

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error logging workout:', error.message);
    throw error;
  }

  // Dual-write to Airtable if enabled
  if (DUAL_WRITE) {
    try {
      await writeWorkoutToAirtable(userId, sanitizedData);
      console.log('✅ Workout dual-write to Airtable successful');
    } catch (airtableError) {
      console.error('⚠️ Workout dual-write to Airtable failed (non-blocking):', airtableError.message);
    }
  }

  return data;
}
```

**Location 3: Configuration validation (src/config.js)**
```javascript
function validateConfig() {
  const errors = [];
  const warnings = [];
  
  if (config.dataBackendPrimary !== 'supabase') {
    errors.push('DATA_BACKEND_PRIMARY must be "supabase" for Phase 1.5');
  }
  
  return { errors, warnings };
}
```

---

## 3. Core Service Analysis

### services/personalisationService.js (User Profile Fetching)

**Current Data Source:** **Airtable ONLY** (Legacy)

**Analysis:**
- This is a **legacy service** that still uses Airtable exclusively
- Located at root level (`services/personalisationService.js`)
- Used by the legacy `/ask` endpoint via `controllers/aiController.js`
- Fetches user profile data from Airtable to build personalization prompts

**Code Evidence:**
```javascript
// services/personalisationService.js
const axios = require('axios');
const { AIRTABLE_BASE_ID, AIRTABLE_API_KEY } = process.env;
const { TABLE_IDS } = require('../utils/logging');

async function fetchUserData(email) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return null;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.users}/${userId}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });
  return res.data.fields;
}
```

**Replacement:** `src/services/userProfiles.js` is the Supabase-based replacement

---

### services/memoryService.js (Chat History Fetching)

**Current Data Source:** **Airtable ONLY** (Legacy)

**Analysis:**
- This is a **legacy service** that still uses Airtable exclusively
- Located at root level (`services/memoryService.js`)
- Used by the legacy `/ask` endpoint to fetch recent chat history
- Fetches from Airtable `chat` table

**Code Evidence:**
```javascript
// services/memoryService.js
const axios = require('axios');
const { AIRTABLE_BASE_ID, AIRTABLE_API_KEY } = process.env;
const { TABLE_IDS, FIELD_IDS } = require('../utils/logging');

async function getRecentChatHistory(userEmail, limit = 5) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.chat}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    params: {
      filterByFormula: `{Email Address} = '${userEmail}'`,
      sort: `[{"field":"${FIELD_IDS.chat.Created}","direction":"desc"}]`,
      maxRecords: limit,
    },
  });
  return res.data.records.map(rec => ({
    message: rec.fields['Message'],
    aiResponse: rec.fields['AI Response'],
  }));
}
```

**Replacement:** `src/services/chatService.js` is the Supabase-based replacement

---

### utils/logging.js (Data Logging)

**Current Data Source:** **Airtable ONLY** (Legacy)

**Analysis:**
- This is a **legacy utility** that writes directly to Airtable
- Located at root level (`utils/logging.js`)
- Used by legacy controllers (`controllers/logController.js`, `controllers/chatController.js`)
- Handles logging for meals, workouts, sleep, mood, supplements, reflections, and chat
- Contains hard-coded Airtable table IDs and field IDs

**Code Evidence:**
```javascript
// utils/logging.js
const TABLE_IDS = {
  users: 'tbl87AICCbvbgrLCY',
  chat: 'tblDtOOmahkMYEqmy',
  meals: 'tblWLkTKkxkSEcySD',
  workouts: 'tblgqvIqFetN2s23J',
  // ... etc
};

async function logMeal(email, meal) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;
  try {
    await axios.post(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.meals}`,
      {
        fields: {
          [FIELD_IDS.meals.User]: [userId],
          [FIELD_IDS.meals.Description]: meal.description,
          // ... Airtable fields
        },
      },
      // ... axios config
    );
  } catch (err) {
    console.error('❌ Meal logging failed', err?.response?.data || err.message);
  }
}
```

**Replacement:** `src/services/logs/*.js` are the Supabase-based replacements

---

### Summary Table

| Service/Utility | Location | Data Source | Status |
|----------------|----------|-------------|--------|
| `personalisationService.js` | `services/` | **Airtable** | Legacy (used by `/ask`) |
| `memoryService.js` | `services/` | **Airtable** | Legacy (used by `/ask`) |
| `utils/logging.js` | `utils/` | **Airtable** | Legacy (used by `/log`, `/chat-history`) |
| `src/services/userProfiles.js` | `src/services/` | **Supabase** (+ dual-write) | Active (v1 API) |
| `src/services/chatService.js` | `src/services/` | **Supabase** (+ dual-write) | Active (v1 API) |
| `src/services/logs/*.js` | `src/services/logs/` | **Supabase** (+ dual-write) | Active (v1 API) |

---

## 4. API Endpoint Response Schema Analysis

### System Architecture Note

The system currently maintains **TWO parallel API implementations:**

1. **Legacy API** (Airtable-based): `/ask`, `/log`, `/chat-history`
2. **v1 API** (Supabase-based): `/v1/chat`, `/v1/auto-log`, `/v1/profile`

---

### GET /chat-history (Legacy Airtable Endpoint)

**Controller:** `controllers/chatController.js`  
**Service:** `services/memoryService.js` (Airtable)  
**Response Structure:** Airtable-style

```json
{
  "success": true,
  "records": [
    {
      "id": "recABC123xyz",
      "fields": {
        "Name": "Chat – 10/13/2025, 3:00:00 PM",
        "User": ["recUSER123"],
        "Message": "What should I eat for breakfast?",
        "AI Response": "Here are some healthy breakfast options...",
        "Topic": "nutrition",
        "Created": "2025-10-13T19:00:00.000Z"
      }
    }
  ]
}
```

**Key Characteristics:**
- Returns Airtable's native format with `records` array
- Each record has `id` (Airtable record ID) and `fields` object
- Field names match Airtable field names (not database column names)
- Linked fields like `User` are arrays of Airtable record IDs

---

### GET /v1/chat (New Supabase Endpoint)

**Controller:** `src/routes/chat.js`  
**Service:** `src/services/chatService.js` (Supabase)  
**Response Structure:** Supabase-style (PostgreSQL)

```json
{
  "ok": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "auth-user-uuid-here",
      "message": "What should I eat for breakfast?",
      "response": "Here are some healthy breakfast options...",
      "context": {
        "profile": {...},
        "history": [...]
      },
      "timestamp": "2025-10-13T19:00:00.000Z",
      "created_at": "2025-10-13T19:00:00.000Z",
      "updated_at": "2025-10-13T19:00:00.000Z"
    }
  ]
}
```

**Key Characteristics:**
- Returns flat array in `data` field with `ok: true` wrapper
- Uses PostgreSQL UUIDs for `id` and `user_id`
- Snake_case field names (database column names)
- No nested "fields" object
- Includes metadata fields (`created_at`, `updated_at`)

---

### POST /log (Legacy Airtable Endpoint)

**Controller:** `controllers/logController.js`  
**Service:** `utils/logging.js` (Airtable)  
**Request Format:**
```json
{
  "email": "user@example.com",
  "type": "meal",
  "data": {
    "name": "Breakfast",
    "foods": "Oatmeal with berries",
    "calories": 350,
    "protein": 12,
    "carbs": 45,
    "fat": 15
  }
}
```

**Response Structure:**
```json
{
  "success": true,
  "message": "meal log added"
}
```

**Key Characteristics:**
- Simple success confirmation
- Does NOT return the created record
- Email-based user identification (no JWT)
- Type-based routing to different logging functions

---

### POST /v1/auto-log (New Supabase Endpoint)

**Controller:** `src/routes/autoLog.js`  
**Service:** `src/services/autoLogService.js` (Supabase)  
**Request Format:**
```json
{
  "kind": "meal",
  "data": {
    "description": "Oatmeal with berries",
    "calories": 350,
    "macros": {
      "protein": 12,
      "carbs": 45,
      "fat": 15
    }
  },
  "ts": "2025-10-13T08:00:00.000Z"
}
```

**Response Structure:**
```json
{
  "ok": true,
  "item": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "kind": "meal",
    "created_at": "2025-10-13T19:00:00.000Z"
  },
  "today": {
    "calories": 1450,
    "protein": 85,
    "carbs": 165,
    "fat": 45
  },
  "targets": {
    "calories": 2000,
    "protein": 150,
    "carbs": 200,
    "fat": 60
  }
}
```

**Key Characteristics:**
- Returns created item with UUID
- JWT-based authentication (user from token)
- For meals, includes today's nutrition summary and targets
- Snake_case field names
- Consistent `ok: true` wrapper

---

### POST /ask (Legacy Airtable Endpoint)

**Controller:** `controllers/aiController.js`  
**Services:** `services/openaiService.js`, `services/personalisationService.js`, `services/memoryService.js`  
**Request Format:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What should I eat for breakfast?"
    }
  ],
  "email": "user@example.com",
  "topic": "nutrition"
}
```

**Response Structure:**
```json
{
  "success": true,
  "reply": "Based on your profile and goals, here are some breakfast recommendations...\n\n**Option 1:**\n- Oatmeal with berries\n- Greek yogurt\n- Almonds\n\nThis provides 350 calories, 20g protein..."
}
```

**Key Characteristics:**
- Returns only AI reply text
- Logs interaction to Airtable (non-blocking)
- Fetches personalization from Airtable
- Fetches memory from Airtable
- Email-based user identification

---

### POST /v1/chat (New Supabase Endpoint)

**Controller:** `src/routes/chat.js`  
**Service:** `src/services/chatService.js` (Supabase)  
**Request Format:**
```json
{
  "message": "What should I eat for breakfast?",
  "response": "Based on your profile...",
  "context": {
    "profile": {...},
    "history": [...]
  }
}
```

**Response Structure:**
```json
{
  "ok": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-10-13T19:00:00.000Z"
}
```

**Key Characteristics:**
- Returns created chat interaction ID
- JWT-based authentication
- Logs to Supabase `chat_interactions` table
- Snake_case field names

---

## 5. Dependency Verification

### Analysis of package.json

**Location:** `/home/runner/work/strukt-system/strukt-system/package.json`

### Database Client Libraries

**airtable:**
- **Status:** ❌ **Not Present** in `dependencies` or `devDependencies`
- **Analysis:** The system uses Airtable REST API directly via `axios` instead of the official `airtable` npm package
- **Implementation:** All Airtable operations use `axios.get()` and `axios.post()` with manual URL construction
- **Example:** `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.users}`

**@supabase/supabase-js:**
- **Status:** ✅ **Present**
- **Version:** `^2.55.0`
- **Analysis:** Official Supabase JavaScript client library
- **Usage:** Used in `src/lib/supabaseServer.js` to create `supabaseAdmin` client
- **Implementation:**
  ```javascript
  const { createClient } = require('@supabase/supabase-js');
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  ```

### Full Dependencies List

**Production Dependencies:**
```json
{
  "@supabase/supabase-js": "^2.55.0",
  "axios": "^1.6.0",
  "cors": "^2.8.5",
  "dotenv": "^16.0.0",
  "expo": "^53.0.0",
  "express": "^4.18.2",
  "express-rate-limit": "^6.7.0",
  "helmet": "^7.0.0",
  "joi": "^17.9.2",
  "openai": "^5.10.2",
  "zod": "^3.25.76"
}
```

**Development Dependencies:**
```json
{
  "@expo/cli": "^0.21.0"
}
```

### Key Observations

1. **No official Airtable SDK:** The system implements Airtable integration via REST API calls using `axios`
2. **Supabase client present and current:** Version 2.55.0 is recent and actively maintained
3. **Multiple validation libraries:** Both `joi` (legacy endpoints) and `zod` (may be for future use) are present
4. **OpenAI SDK:** Version 5.10.2 supports latest GPT models
5. **Express ecosystem:** Standard Express middleware stack with security and rate limiting

---

## 6. Summary and Inconsistency Report

### Does the codebase's current logic align with README.md's "Supabase-primary" claim?

**Answer: PARTIALLY - The system is in active migration.**

**Alignment:**
1. ✅ **New v1 API is Supabase-primary:**
   - All `src/services/logs/*.js` enforce Supabase as primary
   - `src/services/userProfiles.js` is Supabase-only
   - Dual-write to Airtable is optional and non-blocking
   - Configuration validates `DATA_BACKEND_PRIMARY='supabase'`

2. ✅ **Infrastructure supports Supabase:**
   - `@supabase/supabase-js` dependency is present and configured
   - Supabase admin client is initialized in `src/lib/supabaseServer.js`
   - Database schema exists in `db/migrations/`

**Non-Alignment:**
1. ❌ **Legacy API still uses Airtable exclusively:**
   - `/ask`, `/log`, `/chat-history` endpoints are 100% Airtable-dependent
   - `services/personalisationService.js` and `services/memoryService.js` are Airtable-only
   - `utils/logging.js` writes only to Airtable
   - These legacy endpoints would fail if Airtable credentials are removed

2. ❌ **System runs TWO parallel implementations:**
   - Old controllers (`controllers/*.js`) → Airtable
   - New routes (`src/routes/*.js`) → Supabase
   - This creates maintenance burden and potential confusion

---

### Are there contradictions between ENDPOINTS.md and actual implementation?

**Answer: YES - Significant contradictions exist.**

**Major Contradictions:**

1. **Response Format Documentation is Misleading:**
   - `ENDPOINTS.md` documents `/chat-history` returning Airtable format (correct for legacy endpoint)
   - BUT does not document the new `/v1/chat` Supabase-based endpoint at all
   - Mobile client following docs would expect Airtable format but may need Supabase format

2. **Missing v1 API Documentation:**
   - `ENDPOINTS.md` only documents legacy endpoints:
     - ✅ `/ask` (documented)
     - ✅ `/log` (documented)
     - ✅ `/chat-history` (documented)
   - Missing new v1 endpoints:
     - ❌ `/v1/chat` (not documented)
     - ❌ `/v1/auto-log` (not documented)
     - ❌ `/v1/profile` (not documented)
     - ❌ `/v1/onboarding` (not documented)
     - ❌ `/v1/nutrition` (not documented)

3. **Authentication Mismatch:**
   - `ENDPOINTS.md` states: "Currently, all endpoints are public and do not require authentication"
   - **REALITY:** All v1 endpoints require JWT authentication via `authenticateJWT` middleware
   - Legacy endpoints are still public (email-based identification)

4. **Data Format Discrepancies:**
   - Legacy `/log` uses different field names than v1 `/v1/auto-log`:
     - Legacy: `"type": "meal"` with free-form `data` object
     - v1: `"kind": "meal"` with structured schema (`macros` object)
   - Field name changes:
     - `foods` → `description`
     - Flat macros (`protein`, `carbs`, `fat`) → Nested `macros: { protein, carbs, fat }`

---

### Potential Integration Risks for New Mobile Client

**CRITICAL RISKS:**

1. **⚠️ DUAL API CONFUSION:**
   - Risk: Mobile app might target legacy endpoints by mistake
   - Impact: Data would go to Airtable instead of Supabase
   - **Mitigation:** Explicitly document that mobile client MUST use `/v1/*` endpoints

2. **⚠️ AUTHENTICATION REQUIREMENTS:**
   - Risk: Mobile app expects public endpoints (per ENDPOINTS.md)
   - Reality: v1 endpoints require JWT token from Supabase Auth
   - Impact: 401 errors if auth not implemented
   - **Mitigation:** Document JWT auth requirement clearly

3. **⚠️ RESPONSE FORMAT DIFFERENCES:**
   - Legacy: `{ "success": true, "records": [{ "id": "rec...", "fields": {...} }] }`
   - v1: `{ "ok": true, "data": [{ "id": "uuid", "field": "value" }] }`
   - Risk: Parsing errors if app expects Airtable format
   - **Mitigation:** Provide clear response schema examples

4. **⚠️ FIELD NAME INCONSISTENCIES:**
   - Airtable uses `PascalCase` field names: `"Full Name"`, `"Email Address"`
   - Supabase uses `snake_case` column names: `"full_name"`, `"email"`
   - Risk: Field mapping errors in mobile app
   - **Mitigation:** Document field name mapping clearly

5. **⚠️ USER IDENTIFICATION METHOD:**
   - Legacy: Email-based (sent in request body)
   - v1: JWT-based (user ID extracted from token)
   - Risk: Mobile app might send email instead of JWT
   - **Mitigation:** Document auth flow: login → JWT → authenticated requests

6. **⚠️ ERROR RESPONSE FORMAT:**
   - Legacy: `{ "success": false, "message": "..." }`
   - v1: `{ "ok": false, "code": "ERR_CODE", "message": "..." }`
   - Risk: Error handling logic might break
   - **Mitigation:** Document v1 error format with error codes

**MODERATE RISKS:**

7. **⚠️ PAGINATION DIFFERENCES:**
   - Legacy chat history uses `offset` parameter
   - v1 might use cursor-based pagination
   - **Mitigation:** Document pagination strategy for v1 endpoints

8. **⚠️ DUAL-WRITE FAILURES:**
   - When `DUAL_WRITE=true`, Airtable failures are logged but ignored
   - Risk: Data inconsistency between Supabase and Airtable during migration
   - **Mitigation:** Monitor dual-write error logs

9. **⚠️ MISSING TYPESCRIPT TYPES:**
   - No TypeScript definitions in codebase
   - Risk: Mobile app (if using TypeScript) has no type safety
   - **Mitigation:** Generate OpenAPI spec or TypeScript types from schemas

**LOW RISKS:**

10. **⚠️ RATE LIMITING:**
    - General limit: 60 req/min per IP
    - AI endpoints: 20 req/min per IP
    - Mobile apps share IP addresses less predictably
    - **Mitigation:** Document rate limits, consider user-based limits

---

### Recommendations for Mobile Client Integration

1. **Use v1 API exclusively** (`/v1/*` endpoints)
2. **Implement Supabase Auth** (JWT token flow)
3. **Expect snake_case** field names (not PascalCase)
4. **Expect UUID** identifiers (not Airtable record IDs)
5. **Handle v1 response format** (`{ ok: true, data: [...] }`)
6. **Handle v1 error format** (`{ ok: false, code: "ERR_*", message: "..." }`)
7. **Do NOT use** legacy endpoints (`/ask`, `/log`, `/chat-history`)
8. **Request updated API documentation** for all v1 endpoints before integration

---

## Appendix: Key Code Locations

### Configuration
- `src/config.js` - Centralized config management
- `.env.example` - Environment variable template

### v1 API (Supabase-based)
- `src/server.js` - Main server entry point
- `src/routes/*.js` - v1 API endpoints
- `src/services/userProfiles.js` - User profile service
- `src/services/logs/*.js` - Logging services (meals, workouts, sleep, mood, supplements, chat)
- `src/services/autoLogService.js` - Auto-log orchestration
- `src/services/chatService.js` - Chat service
- `src/lib/supabaseServer.js` - Supabase client initialization
- `src/lib/auth.js` - JWT authentication middleware

### Legacy API (Airtable-based)
- `server/index.js` - Legacy server entry point
- `routes/*.js` - Legacy endpoints
- `controllers/*.js` - Legacy controllers
- `services/personalisationService.js` - Airtable-based user fetching
- `services/memoryService.js` - Airtable-based chat history
- `utils/logging.js` - Airtable logging utilities

### Database
- `db/migrations/` - Supabase schema migrations
- `docs/airtable_to_supabase_mapping.md` - Field mapping documentation

### Tools
- `tools/etl_airtable_to_supabase.js` - Migration script

---

**End of Audit Report**
