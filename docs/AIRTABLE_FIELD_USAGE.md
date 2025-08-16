# Airtable Field Usage Documentation

This document provides a comprehensive file-by-file listing of all Airtable field usage in the STRUKT backend system, including line numbers and specific field references.

## Environment Variable Usage

### AIRTABLE_BASE_ID Usage
| File | Line | Context | Purpose |
|------|------|---------|---------|
| `utils/logging.js` | 16 | `const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;` | Global configuration |
| `utils/logging.js` | 108 | `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.users}` | User lookup URL |
| `utils/logging.js` | 127 | `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.chat}` | Chat logging URL |
| `utils/logging.js` | 158 | `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.meals}` | Meal logging URL |
| `utils/logging.js` | 192 | `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.workouts}` | Workout logging URL |
| `utils/logging.js` | 225 | `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.supplements}` | Supplement logging URL |
| `utils/logging.js` | 258 | `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.sleep}` | Sleep logging URL |
| `utils/logging.js` | 291 | `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.mood}` | Mood logging URL |
| `utils/logging.js` | 323 | `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_IDS.reflections}` | Reflection logging URL |
| `services/memoryService.js` | 12 | `const { AIRTABLE_BASE_ID, AIRTABLE_API_KEY } = process.env;` | Environment variable import |
| `services/memoryService.js` | 28 | `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CHAT_TABLE_ID}` | Chat history URL |
| `services/personalisationService.js` | 12 | `const { AIRTABLE_BASE_ID, AIRTABLE_API_KEY } = process.env;` | Environment variable import |
| `services/personalisationService.js` | 27 | `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USER_TABLE_ID}/${userId}` | User data fetch URL |
| `controllers/chatController.js` | 35 | `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${TABLE_IDS.chat}` | Chat history endpoint |

### AIRTABLE_API_KEY Usage
| File | Line | Context | Purpose |
|------|------|---------|---------|
| `utils/logging.js` | 17 | `const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;` | Global configuration |
| `utils/logging.js` | 111 | `Authorization: \`Bearer ${AIRTABLE_API_KEY}\`` | User lookup auth |
| `utils/logging.js` | 139 | `Authorization: \`Bearer ${AIRTABLE_API_KEY}\`` | Chat logging auth |
| `utils/logging.js` | 173 | `Authorization: \`Bearer ${AIRTABLE_API_KEY}\`` | Meal logging auth |
| `utils/logging.js` | 206 | `Authorization: \`Bearer ${AIRTABLE_API_KEY}\`` | Workout logging auth |
| `utils/logging.js` | 239 | `Authorization: \`Bearer ${AIRTABLE_API_KEY}\`` | Supplement logging auth |
| `utils/logging.js` | 272 | `Authorization: \`Bearer ${AIRTABLE_API_KEY}\`` | Sleep logging auth |
| `utils/logging.js` | 304 | `Authorization: \`Bearer ${AIRTABLE_API_KEY}\`` | Mood logging auth |
| `utils/logging.js` | 336 | `Authorization: \`Bearer ${AIRTABLE_API_KEY}\`` | Reflection logging auth |
| `services/memoryService.js` | 12 | `const { AIRTABLE_BASE_ID, AIRTABLE_API_KEY } = process.env;` | Environment variable import |
| `services/memoryService.js` | 30 | `Authorization: \`Bearer ${AIRTABLE_API_KEY}\`` | Chat history auth |
| `services/personalisationService.js` | 12 | `const { AIRTABLE_BASE_ID, AIRTABLE_API_KEY } = process.env;` | Environment variable import |
| `services/personalisationService.js` | 29 | `Authorization: \`Bearer ${AIRTABLE_API_KEY}\`` | User data auth |
| `controllers/chatController.js` | 40 | `Authorization: \`Bearer ${process.env.AIRTABLE_API_KEY}\`` | Chat history auth |

## Table ID Usage

### utils/logging.js - Table ID Definitions
| Line | Table | ID | Purpose |
|------|-------|-----|---------|
| 23 | users | tbl87AICCbvbgrLCY | User profiles and onboarding |
| 24 | chat | tblDtOOmahkMYEqmy | Chat interactions |
| 25 | meals | tblWLkTKkxkSEcySD | Meal logging |
| 26 | workouts | tblgqvIqFetN2s23J | Workout logging |
| 27 | supplements | tblZ8F0Z8ZcMDYdej | Supplement logging |
| 28 | sleep | tblFepeTBkng3zDSY | Sleep logging |
| 29 | mood | tbltkNq7OSUcu4Xpp | Mood logging |
| 30 | reflections | tblDrFwiJTYGjOfEv | Reflection logging |

### Hard-coded Table IDs
| File | Line | Table ID | Context |
|------|------|----------|---------|
| `services/memoryService.js` | 15 | tblDtOOmahkMYEqmy | `const CHAT_TABLE_ID = 'tblDtOOmahkMYEqmy';` |
| `services/personalisationService.js` | 13 | tbl87AICCbvbgrLCY | `const USER_TABLE_ID = 'tbl87AICCbvbgrLCY';` |

## Field ID Usage by Table

### Users Table Fields

#### User Email Lookup Field (fldgyVjQJc389lqNA)
| File | Line | Usage | Context |
|------|------|-------|---------|
| `utils/logging.js` | 109 | `LOWER({fldgyVjQJc389lqNA}) = '${email.toLowerCase()}'` | Case-insensitive email lookup filter |

#### User Profile Fields (services/personalisationService.js)
| Line | Field Name | Usage | Context |
|------|------------|-------|---------|
| 47 | Full Name | `fields['Full Name']` | User identification |
| 48 | Gender Identity | `fields['Gender Identity']` | Personalization context |
| 49 | Pronouns | `fields['Pronouns']` | Respectful communication |
| 50 | Body Type | `fields['Body Type']` | Fitness recommendations |
| 51 | Main Goal | `fields['Main Goal']` | Primary objectives (array) |
| 52 | Dietary Needs/Allergies | `fields['Dietary Needs/Allergies']` | Nutrition constraints |
| 53 | Medical Considerations | `fields['Medical Considerations']` | Safety context |
| 54 | Preferred Coaching Tone | `fields['Preferred Coaching Tone']` | Communication style (array) |
| 55 | Vision of Success | `fields['Vision of Success']` | Motivation context |

### Chat Table Fields

#### Field ID Definitions (utils/logging.js)
| Line | Field | ID | Purpose |
|------|-------|-----|---------|
| 36 | Name | fldcHOwNiQlFpwuly | Chat session identifier |
| 37 | User | fldDtbxnE1PyTleqo | Linked user record |
| 38 | Message | fldgNRKet3scJ8PIe | User's message |
| 39 | AI_Response | fld3vU9nKXNmu6OZV | AI assistant's reply |
| 40 | Topic | fld2eLzWRUnKNR7Im | Conversation topic |

#### Field Usage in Chat Logging (utils/logging.js)
| Line | Field | Usage | Context |
|------|-------|-------|---------|
| 130 | Name | `[FIELD_IDS.chat.Name]: \`Chat – ${new Date().toLocaleString()}\`` | Auto-generated name |
| 131 | User | `[FIELD_IDS.chat.User]: [userId]` | User record link |
| 132 | Message | `[FIELD_IDS.chat.Message]: message` | User message content |
| 133 | AI_Response | `[FIELD_IDS.chat.AI_Response]: aiReply` | AI response content |
| 134 | Topic | `[FIELD_IDS.chat.Topic]: topic \|\| 'Other'` | Topic with default |

#### Field Usage in Chat History (controllers/chatController.js)
| Line | Field | Usage | Context |
|------|-------|-------|---------|
| 38 | User | `SEARCH('${userId}', ARRAYJOIN({${FIELD_IDS.chat.User}}, ','))` | Filter by user |

#### Field Usage in Memory Service (services/memoryService.js)
| Line | Field | Usage | Context |
|------|-------|-------|---------|
| 32 | Message | `rec.fields['Message']` | Extract user message |
| 34 | AI Response | `rec.fields['AI Response']` | Extract AI response |
| 31 | Email Address | `{Email Address} = '${userEmail}'` | Email filter |
| 32 | Created | `"field":"fld1WNv8Oj0PU0ODt","direction":"desc"` | Sort by creation time |

### Meals Table Fields

#### Field ID Definitions (utils/logging.js)
| Line | Field | ID | Purpose |
|------|-------|-----|---------|
| 43 | User | fldaTFIo8vKLoQYhS | Linked user record |
| 44 | Description | fldLJXOsnTDqfp9mJ | Meal description |
| 45 | Calories | fldUOPuN6n39Aj1v7 | Calorie count |
| 46 | Protein | fldbqKkHfEqmStvbn | Protein grams |
| 47 | Carbs | fld8EvDjPVmY5vfhR | Carbohydrate grams |
| 48 | Fats | fldLnl83bsw9ZSCka | Fat grams |
| 49 | MealType | fldoN35qBpJ2y7OFS | Meal category |
| 50 | MealSource | fld5DuMMbBBnYbCnS | Data source |

#### Field Usage in Meal Logging (utils/logging.js)
| Line | Field | Usage | Context |
|------|-------|-------|---------|
| 161 | User | `[FIELD_IDS.meals.User]: [userId]` | User record link |
| 162 | Description | `[FIELD_IDS.meals.Description]: meal.description` | Meal details |
| 163 | Calories | `[FIELD_IDS.meals.Calories]: meal.calories` | Nutritional data |
| 164 | Protein | `[FIELD_IDS.meals.Protein]: meal.protein` | Nutritional data |
| 165 | Carbs | `[FIELD_IDS.meals.Carbs]: meal.carbs` | Nutritional data |
| 166 | Fats | `[FIELD_IDS.meals.Fats]: meal.fats` | Nutritional data |
| 167 | MealType | `[FIELD_IDS.meals.MealType]: meal.mealType` | Meal category |
| 168 | MealSource | `[FIELD_IDS.meals.MealSource]: meal.mealSource \|\| 'AI-Estimated'` | Source with default |

### Workouts Table Fields

#### Field ID Definitions (utils/logging.js)
| Line | Field | ID | Purpose |
|------|-------|-----|---------|
| 53 | User | fldUuYZtmkiycOVnb | Linked user record |
| 54 | Date | fldzVeaYTUHMxMDd9 | Workout date |
| 55 | Type | fld9xRDtOz1mBkDQ5 | Exercise type |
| 56 | Description | fldKkhKomMg3Cf108 | Workout details |
| 57 | Duration | fldaij5HlQKv8gMcT | Duration in minutes |
| 58 | Calories | fld2muGFVrfM0xHmI | Calories burned |
| 59 | Notes | fld1aEpGu5H8DWPxY | Additional notes |

#### Field Usage in Workout Logging (utils/logging.js)
| Line | Field | Usage | Context |
|------|-------|-------|---------|
| 195 | User | `[FIELD_IDS.workouts.User]: [userId]` | User record link |
| 196 | Date | `[FIELD_IDS.workouts.Date]: workout.date` | Workout date |
| 197 | Type | `[FIELD_IDS.workouts.Type]: workout.type` | Exercise category |
| 198 | Description | `[FIELD_IDS.workouts.Description]: workout.description` | Workout details |
| 199 | Duration | `[FIELD_IDS.workouts.Duration]: workout.duration` | Duration data |
| 200 | Calories | `[FIELD_IDS.workouts.Calories]: workout.calories` | Calorie data |
| 201 | Notes | `[FIELD_IDS.workouts.Notes]: workout.notes` | Additional notes |

### Supplements Table Fields

#### Field ID Definitions (utils/logging.js)
| Line | Field | ID | Purpose |
|------|-------|-----|---------|
| 62 | User | fldzShNTWJornIZnP | Linked user record |
| 63 | Date | fldQfsrapotczQaCY | Supplement date |
| 64 | Time | fldSherUQZmn2ts73 | Time taken |
| 65 | SupplementName | fldad6mLDsXYMks5A | Supplement name |
| 66 | Notes | fldEoF1lbZoj3wPhO | Additional notes |
| 67 | LogType | fldzGOKvw0IF0Rbmn | Log source type |
| 68 | Confirmed | fldiqJbsxO4yx4JvB | Confirmation status |

#### Field Usage in Supplement Logging (utils/logging.js)
| Line | Field | Usage | Context |
|------|-------|-------|---------|
| 228 | User | `[FIELD_IDS.supplements.User]: [userId]` | User record link |
| 229 | Date | `[FIELD_IDS.supplements.Date]: supplement.date` | Date taken |
| 230 | Time | `[FIELD_IDS.supplements.Time]: supplement.time` | Time taken |
| 231 | SupplementName | `[FIELD_IDS.supplements.SupplementName]: supplement.name` | Supplement name |
| 232 | Notes | `[FIELD_IDS.supplements.Notes]: supplement.notes` | Notes |
| 233 | LogType | `[FIELD_IDS.supplements.LogType]: supplement.logType \|\| 'AI'` | Type with default |
| 234 | Confirmed | `[FIELD_IDS.supplements.Confirmed]: true` | Auto-confirmed |

### Sleep Table Fields

#### Field ID Definitions (utils/logging.js)
| Line | Field | ID | Purpose |
|------|-------|-----|---------|
| 71 | User | fldabdr3bNgGqBawm | Linked user record |
| 72 | Date | fldTvCL5QQ9g7fXfw | Sleep date |
| 73 | Duration | fldt7AKiAq2qfHs89 | Sleep duration |
| 74 | Quality | fldfdd8WYqyWx6Ckc | Sleep quality |
| 75 | Bedtime | fldu544VmBsGIvEuw | Bedtime |
| 76 | WakeTime | fld43mo9Z09vYzoGb | Wake time |
| 77 | Notes | fldzLiz85up5WqPAq | Sleep notes |

#### Field Usage in Sleep Logging (utils/logging.js)
| Line | Field | Usage | Context |
|------|-------|-------|---------|
| 261 | User | `[FIELD_IDS.sleep.User]: [userId]` | User record link |
| 262 | Date | `[FIELD_IDS.sleep.Date]: sleep.date` | Sleep date |
| 263 | Duration | `[FIELD_IDS.sleep.Duration]: sleep.duration` | Duration in hours |
| 264 | Quality | `[FIELD_IDS.sleep.Quality]: sleep.quality` | Quality rating |
| 265 | Bedtime | `[FIELD_IDS.sleep.Bedtime]: sleep.bedtime` | Bedtime |
| 266 | WakeTime | `[FIELD_IDS.sleep.WakeTime]: sleep.wakeTime` | Wake time |
| 267 | Notes | `[FIELD_IDS.sleep.Notes]: sleep.notes` | Sleep notes |

### Mood Table Fields

#### Field ID Definitions (utils/logging.js)
| Line | Field | ID | Purpose |
|------|-------|-----|---------|
| 80 | User | flddOxxse2QJe6DMk | Linked user record |
| 81 | Date | fldKVcXqCXvabybIb | Mood date |
| 82 | Mood | fldUpnuuJRYIBy4mL | Mood rating |
| 83 | Notes | fldFMbuWMrBlhScua | Mood notes |
| 84 | Energy | fld6isxdyHYfjqsQM | Energy level |
| 85 | Stress | fldmLOpTwpzUc0F4Y | Stress level |

#### Field Usage in Mood Logging (utils/logging.js)
| Line | Field | Usage | Context |
|------|-------|-------|---------|
| 294 | User | `[FIELD_IDS.mood.User]: [userId]` | User record link |
| 295 | Date | `[FIELD_IDS.mood.Date]: mood.date` | Mood date |
| 296 | Mood | `[FIELD_IDS.mood.Mood]: mood.rating` | Mood rating (note: field mapping) |
| 297 | Notes | `[FIELD_IDS.mood.Notes]: mood.notes` | Mood notes |
| 298 | Energy | `[FIELD_IDS.mood.Energy]: mood.energy` | Energy level |
| 299 | Stress | `[FIELD_IDS.mood.Stress]: mood.stress` | Stress level |

### Reflections Table Fields

#### Field ID Definitions (utils/logging.js)
| Line | Field | ID | Purpose |
|------|-------|-----|---------|
| 88 | User | fldub69oCFo7ruloF | Linked user record |
| 89 | Date | fldZibMunrMSu8iRC | Reflection date |
| 90 | WentWell | fldYpH7CM04KeDuT4 | What went well |
| 91 | Challenge | fldMeD609rZU7w8pI | Daily challenges |
| 92 | Tomorrow | fldmDUQ8fkYCYwCUG | Tomorrow's focus |
| 93 | Highlight | fldmfnusmD5b4C6Dn | Day's highlight |

#### Field Usage in Reflection Logging (utils/logging.js)
| Line | Field | Usage | Context |
|------|-------|-------|---------|
| 326 | User | `[FIELD_IDS.reflections.User]: [userId]` | User record link |
| 327 | Date | `[FIELD_IDS.reflections.Date]: reflection.date` | Reflection date |
| 328 | WentWell | `[FIELD_IDS.reflections.WentWell]: reflection.wentWell` | Positive reflection |
| 329 | Challenge | `[FIELD_IDS.reflections.Challenge]: reflection.challenge` | Challenge notes |
| 330 | Tomorrow | `[FIELD_IDS.reflections.Tomorrow]: reflection.tomorrow` | Tomorrow's plan |
| 331 | Highlight | `[FIELD_IDS.reflections.Highlight]: reflection.highlight` | Day highlight |

## Controller Usage

### controllers/aiController.js
| Line | Function | Purpose |
|------|----------|---------|
| 29 | `findUserIdByEmail(normalisedEmail)` | User lookup for personalization |
| 65 | `logChatInteraction(normalisedEmail, topic, userMessage, reply)` | Log conversation |

### controllers/chatController.js
| Line | Function | Purpose |
|------|----------|---------|
| 5-8 | Import TABLE_IDS, FIELD_IDS | Table/field references |
| 31 | `findUserIdByEmail(email)` | User lookup |
| 35-45 | Airtable API call | Fetch chat history |

### controllers/logController.js
| Line | Function | Purpose |
|------|----------|---------|
| 4-11 | Import logging functions | All log type handlers |
| 34-51 | Log dispatch | Route to appropriate log function |

## Services Usage

### services/memoryService.js
| Line | Function | Purpose |
|------|----------|---------|
| 28-36 | `getRecentChatHistory()` | Fetch recent chat for memory |
| 31 | Email filter | Filter by user email |
| 32 | Sort by creation time | Chronological order |

### services/personalisationService.js
| Line | Function | Purpose |
|------|----------|---------|
| 24-31 | `fetchUserData()` | Get user profile data |
| 44-59 | `buildPersonalisationPrompt()` | Create personalization context |

## Field Mapping Inconsistencies

### Potential Issues Identified

1. **Hard-coded Table IDs**: Some services use hard-coded table IDs instead of the centralized TABLE_IDS object
   - `services/memoryService.js:15` - Should use `TABLE_IDS.chat`
   - `services/personalisationService.js:13` - Should use `TABLE_IDS.users`

2. **Field Name vs Field ID Mixing**: Some services use field names instead of field IDs
   - `services/memoryService.js:31-34` - Uses field names instead of FIELD_IDS
   - `services/personalisationService.js:47-55` - Uses field names for user profile

3. **Mood Field Mapping**: In mood logging, `mood.rating` maps to `FIELD_IDS.mood.Mood`
   - `utils/logging.js:296` - Should verify field name consistency

4. **Missing Field ID**: Some fields referenced don't have corresponding FIELD_IDS entries
   - `services/memoryService.js:32` - `fld1WNv8Oj0PU0ODt` (Created field) not in FIELD_IDS

## Summary

- **Total Files with Airtable Usage**: 6 files
- **Total Table References**: 8 tables
- **Total Field ID Mappings**: 40+ field IDs defined
- **Environment Variables**: 2 required (AIRTABLE_BASE_ID, AIRTABLE_API_KEY)
- **Hard-coded IDs Found**: 2 instances needing centralization
- **Field Name Usage**: Some services use field names instead of centralized FIELD_IDS