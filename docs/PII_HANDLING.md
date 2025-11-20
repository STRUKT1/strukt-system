# PII Handling in OpenAI Integration

**Security Audit: HIGH-005 - PII Minimization for OpenAI Requests**

This document describes how STRUKT minimizes Personally Identifiable Information (PII) sent to third-party AI services like OpenAI while maintaining high-quality fitness coaching functionality.

## Overview

STRUKT uses OpenAI's GPT-4 models for various AI coaching features. To protect user privacy, we implement strict PII minimization - sending only the minimum data necessary for effective coaching, and never sending identifiable personal information.

## What We Send to OpenAI

### ✅ Data We SEND (Fitness-Relevant)

The following data is necessary for personalized fitness coaching and is sent to OpenAI:

#### Personalization
- **First name only** (e.g., "John" not "John Smith")
  - Used for friendly, personalized coaching tone
  - Extracted from full name using `getFirstNameOnly()`

#### Demographics (Fitness-Relevant)
- **Age** - Essential for appropriate exercise recommendations
- **Gender** - Relevant for fitness calculations and recommendations
- **Weight/Height** - Necessary for calorie and macro calculations

#### Goals & Motivation
- **Primary goal** (e.g., "lose weight", "build muscle")
- **Why statement** - User's deep motivation
- **Target event** and date (e.g., "marathon on 2024-06-15")
- **Success definition** - How user defines success
- **Experience level** - Beginner, intermediate, advanced

#### Medical & Safety (Critical for Safe Coaching)
- **Medical conditions** - Necessary to avoid contraindicated exercises
- **Injuries** - Must be aware to recommend safe modifications
- **Pregnancy/breastfeeding status** - Critical for safety
- **Post-surgery recovery status** - Must provide appropriate guidance
- **Allergies** - For nutrition recommendations

#### Dietary Preferences
- **Diet pattern** (e.g., "vegetarian", "keto")
- **Faith-based dietary restrictions** (e.g., "halal", "kosher")
- **Dietary restrictions** - For meal planning
- **Calorie and macro targets** - For nutrition tracking

#### Training Preferences
- **Days per week** available for training
- **Session duration** preferences
- **Equipment access** (e.g., "gym", "home bodyweight")
- **Workout location** preference

#### Coaching Preferences
- **Coaching persona** (e.g., "motivator", "strategist", "nurturer")
- **Coaching tone** preference
- **Relationship with exercise** - For empathetic coaching
- **Relationship with food** - For nutrition guidance

### ❌ Data We DO NOT SEND (Unnecessary PII)

The following data is **NEVER** sent to OpenAI:

- ❌ **Email address** - Not needed for coaching
- ❌ **Full name** - Only first name is sent
- ❌ **User ID** - Not needed for AI context
- ❌ **Phone number** - Not needed
- ❌ **Address** - Not needed
- ❌ **Payment information** - Never sent
- ❌ **Authentication tokens** - Never sent
- ❌ **Any other contact information**

## Implementation

### Core Utility: `piiMask.js`

Location: `src/lib/piiMask.js`

This module provides utilities for PII sanitization:

```javascript
const { sanitizeProfileForAI, getFirstNameOnly } = require('../lib/piiMask');

// Example usage
const rawProfile = {
  user_id: '123',
  email: 'john@example.com',
  full_name: 'John Smith',
  age: 35,
  primary_goal: 'lose_weight'
};

const sanitized = sanitizeProfileForAI(rawProfile);
// Result: { firstName: 'John', age: 35, primary_goal: 'lose_weight' }
// email, user_id, and full_name are removed
```

### Services Using PII Sanitization

All services that call OpenAI have been updated to sanitize profiles:

1. **`src/services/planGenerationService.js`**
   - Generates personalized training/nutrition plans
   - Uses `sanitizeProfileForAI()` before building prompts
   - Only sends first name, goals, and fitness-relevant data

2. **`src/services/aiExtensions.js`**
   - Intent recognition, plan generation, daily focus, weekly reviews
   - All functions sanitize profiles before use
   - Functions: `generateInitialPlans()`, `generateDailyFocus()`, `generateWeeklyReview()`

3. **`src/services/chatService.js`**
   - Conversational AI chat interface
   - Sanitizes profile before passing to `getStruktSystemPrompt()`
   - Ensures no PII in system prompts

4. **`src/ai/struktSystem.js`**
   - Builds system prompts with user context
   - **Defense-in-depth**: Double-checks sanitization even if caller forgets
   - Enforces PII minimization at the prompt-building layer

5. **`src/services/photoAnalysisService.js`**
   - ✅ Already PII-safe: Only sends images, no user data
   - No changes needed

6. **`src/services/foodParsingService.js`**
   - ✅ Already PII-safe: Only sends food text, no user data
   - No changes needed

## Security Architecture

### Defense-in-Depth Approach

We implement multiple layers of protection:

1. **Layer 1: Caller Sanitization**
   - Services sanitize profiles before passing to OpenAI functions
   - Example: `chatService.js` sanitizes before calling `getStruktSystemPrompt()`

2. **Layer 2: Function-Level Sanitization**
   - Individual AI functions (e.g., `generateInitialPlans()`) sanitize inputs
   - Prevents accidental PII leaks if caller forgets

3. **Layer 3: Prompt-Builder Sanitization**
   - `struktSystem.js` sanitizes profiles as a final safety check
   - Last line of defense before OpenAI API call

### Validation

The `piiMask.js` module includes a `validateNoPII()` function for testing:

```javascript
const { validateNoPII } = require('../lib/piiMask');

const result = validateNoPII(sanitizedProfile);
// Returns: { isClean: true, violations: [] }

// Or if PII is found:
// Returns: { isClean: false, violations: ['email', 'full_name'] }
```

## Rationale

### Why We Send First Names

First names provide a friendly, personalized coaching experience without revealing full identity:
- "Great job, Sarah!" vs "Great job, User!"
- Common first names provide minimal identifiability
- Significantly improves user experience

### Why We Send Medical/Health Data

This data is **essential for user safety**:
- Must avoid exercises contraindicated for medical conditions
- Must provide pregnancy-safe modifications
- Must respect injuries and recovery needs
- Prioritizing safety over privacy minimization

### Why We Don't Send Emails

Email addresses are:
- Not necessary for coaching context
- Highly identifiable
- Potential security risk if OpenAI systems are compromised
- Can be used to correlate data across systems

## Testing

To verify PII minimization:

1. **Automated Testing**
   ```javascript
   const { validateNoPII } = require('./src/lib/piiMask');

   // In tests
   it('should not send PII to OpenAI', () => {
     const sanitized = sanitizeProfileForAI(rawProfile);
     const validation = validateNoPII(sanitized);
     expect(validation.isClean).toBe(true);
   });
   ```

2. **Manual Testing**
   - Enable `DEBUG_LLM=true` to log OpenAI requests
   - Search logs for email patterns: `grep -E "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" logs/*`
   - Verify only first names appear, not full names

3. **Code Review Checklist**
   - [ ] All OpenAI calls use `sanitizeProfileForAI()`
   - [ ] No direct use of `profile.email` in prompt building
   - [ ] No direct use of `profile.full_name` (use `profile.firstName`)
   - [ ] No `user_id` in prompts

## Compliance

This implementation supports compliance with:

- **GDPR (EU)** - Data minimization principle (Article 5)
- **CCPA (California)** - Privacy by design
- **HIPAA considerations** - While STRUKT is not HIPAA-covered, we follow similar privacy principles

## Future Improvements

Potential enhancements for even stronger privacy:

1. **User Control**: Allow users to opt out of AI features entirely
2. **Anonymization**: Use pseudonyms instead of first names
3. **Local Processing**: Explore on-device AI models for sensitive operations
4. **Differential Privacy**: Add noise to aggregate data sent to OpenAI
5. **Audit Logging**: Log what data was sent to OpenAI for each request

## References

- Security Audit: `HIGH-005`
- Implementation: `src/lib/piiMask.js`
- Code owners: Engineering team
- Last updated: 2025-11-20

## Questions?

For questions about PII handling:
- Review this document first
- Check implementation in `src/lib/piiMask.js`
- Search codebase for `sanitizeProfileForAI` usage examples
- Contact security team for clarification

---

**Remember:** When in doubt, don't send it. Only send data that is truly necessary for coaching functionality.
