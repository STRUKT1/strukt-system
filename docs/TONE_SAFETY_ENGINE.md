# STRUKT Tone Safety Engine

## Overview

The Tone Safety Engine is a comprehensive filtering and validation system that ensures every AI Coach response is safe, inclusive, non-judgmental, and contextually appropriate. This system protects users from harmful, triggering, or insensitive content while maintaining STRUKT's values of **Structure, Support, and Respect**.

## Why Tone Safety Matters in STRUKT

STRUKT serves a diverse community with varying backgrounds, identities, and sensitivities:
- Users recovering from eating disorders
- People with mental health challenges
- Individuals with body image concerns
- Members across all gender identities and expressions
- People with chronic conditions or disabilities
- Users experiencing trauma or high stress

A single insensitive or judgmental phrase can:
- Trigger harmful behaviors
- Damage trust in the platform
- Cause emotional distress
- Reinforce negative self-talk
- Discourage continued engagement

The Tone Safety Engine prevents these outcomes by validating every AI response before delivery.

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Coach Flow                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  System Prompt   │
                    │  + Tone Control  │
                    │    Instructions  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  OpenAI API Call │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Safety Validator │
                    │  (Medical/Diet)  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Tone Filter     │◄─── YOU ARE HERE
                    │    Service       │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
         ┌───────────┐              ┌────────────┐
         │  Safe &   │              │  Fallback  │
         │  Passes   │              │  Response  │
         └───────────┘              └────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                    ┌──────────────────┐
                    │   Log to DB      │
                    │ (tone_issues)    │
                    └──────────────────┘
```

### 1. Tone Filter Service (`src/services/toneFilterService.js`)

**Responsibilities:**
- Pattern-based detection of unsafe tone
- Sentiment analysis heuristics
- Severity classification (low/medium/high)
- Detailed issue reporting

**Detection Categories:**
1. **Judgmental & Triggering Phrases**
   - Failure-oriented language
   - Accusatory questioning
   - Regret-inducing statements
   - Derogatory terms

2. **Sarcasm & Passive-Aggression**
   - Dismissive responses
   - Mocking tone
   - Backhanded compliments

3. **Harmful Diet/Fitness Advice**
   - Meal skipping recommendations
   - Starvation promotion
   - Pain tolerance encouragement
   - Rapid weight loss claims

4. **Prescriptive Commands**
   - "Must do" statements
   - Commanding future actions
   - Overly directive tone

5. **Body Shaming & Moral Framing**
   - Weight-based labels
   - Moral assignment to food choices
   - Body-negative language

6. **Non-Inclusive Language**
   - Binary gender assumptions
   - Gendered casual terms
   - Misgendering

7. **Emotional Insensitivity**
   - Dismissing mental health concerns
   - Invalidating feelings
   - Commanding emotional change

8. **Ableist Language**
   - Inappropriate mental health terms
   - Disability-related slurs

**Severity Levels:**
- **Low**: Minor issues (e.g., prescriptive "should" language)
- **Medium**: Problematic but not immediately harmful (e.g., sarcasm, mild judgment)
- **High**: Potentially harmful or triggering (e.g., body shaming, mental health dismissal, harmful advice)

### 2. Tone Control Wrapper (`src/services/promptService.js`)

**Purpose:** Inject tone safety instructions into every OpenAI request.

**Instructions Added:**
```
=== TONE CONTROL ===
Always speak like a respectful, supportive, inclusive coach.
Avoid judgment, sarcasm, or shame.
Adapt tone to user's situation (mood, energy, time).
NEVER offer advice that could cause harm.
Be sensitive to mental health, body image, eating disorders, and trauma.
Use gender-neutral language unless the user's pronouns are known.
Avoid prescriptive commands - offer suggestions and options instead.
Never use failure-oriented, derogatory, or ableist language.
===
```

### 3. Personal Tone Preferences

**User Profile Integration:**
- Fetched from `members.coaching_tone` column
- Options: gentle, direct, cheerleader, brief, friendly
- Dynamically injected into system prompt

**Examples:**
- `gentle` → "The user prefers a gentle and nurturing tone."
- `direct` → "The user prefers a direct and straightforward tone."
- `cheerleader` → "The user prefers an enthusiastic and motivational tone."

**Sensitivity Markers:**
- `high_sensitivity` flag → "User has high sensitivity - be extra gentle and supportive."
- `mental_health_support` flag → Enhanced care instructions

### 4. Integration in Ask Controller (`src/controllers/ask.js`)

**Flow:**
1. Receive user message
2. Build prompt with tone instructions
3. Call OpenAI API
4. Run safety validator (medical/diet)
5. Run tone filter (new!)
6. If unsafe tone detected:
   - Log tone issues
   - Return safe fallback
7. Otherwise, return AI response
8. Log interaction with tone_issues field

### 5. Logging (`src/services/coachLogService.js`)

**New Field:** `tone_issues` (TEXT[])

**Purpose:**
- Track tone safety violations over time
- Identify patterns in unsafe responses
- Audit trail for safety compliance
- Quality monitoring

**Query Examples:**
```sql
-- Find all logs with tone issues
SELECT * FROM ai_coach_logs WHERE tone_issues IS NOT NULL;

-- Count by severity
SELECT tone_issues, COUNT(*) 
FROM ai_coach_logs 
WHERE tone_issues IS NOT NULL 
GROUP BY tone_issues;

-- Recent tone violations
SELECT created_at, tone_issues, ai_response 
FROM ai_coach_logs 
WHERE tone_issues IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

## Examples: Unsafe vs Safe Replies

### Example 1: Judgmental Language

**❌ Unsafe:**
> "You failed to complete your workout plan again. Why didn't you try harder?"

**Issues Detected:**
- Judgmental language: using failure-oriented language
- Judgmental tone: accusatory questioning

**✅ Safe Alternative:**
> "I noticed you didn't complete your workout plan this week. What challenges did you face? Let's work together to find a plan that fits better."

---

### Example 2: Body Shaming

**❌ Unsafe:**
> "You're overweight and need to lose weight fast to reach your goals."

**Issues Detected:**
- Body-negative language: using weight-based labels
- Harmful advice: promoting rapid weight loss

**✅ Safe Alternative:**
> "Let's focus on building sustainable, healthy habits that support your goals. What aspect would you like to work on first?"

---

### Example 3: Harmful Diet Advice

**❌ Unsafe:**
> "Just skip breakfast and don't eat after 6pm. You'll see results quickly."

**Issues Detected:**
- Harmful advice: recommending meal skipping
- Harmful advice: restrictive eating

**✅ Safe Alternative:**
> "Let's find a meal timing pattern that works for your schedule and energy levels. What does your typical day look like?"

---

### Example 4: Emotional Insensitivity

**❌ Unsafe:**
> "Your anxiety is all in your head. Just get over it and focus on your fitness goals."

**Issues Detected:**
- Emotionally insensitive: invalidating feelings
- Emotionally insensitive: dismissing mental health concerns

**✅ Safe Alternative:**
> "I hear that you're dealing with anxiety. That's really valid and important. How can we adjust your fitness routine to support your mental health right now?"

---

### Example 5: Prescriptive Commands

**❌ Unsafe:**
> "You must do 100 push-ups every day. You will eat exactly 1500 calories."

**Issues Detected:**
- Prescriptive tone: using commanding language
- Prescriptive tone: commanding future actions

**✅ Safe Alternative:**
> "Based on your goals, I'd suggest building up to regular push-ups and finding a calorie range that feels sustainable. Would you like specific recommendations?"

---

### Example 6: Non-Inclusive Language

**❌ Unsafe:**
> "Hey guys! Make sure he/she completes their workout!"

**Issues Detected:**
- Non-inclusive language: gendered casual terms
- Non-inclusive language: binary gender assumptions

**✅ Safe Alternative:**
> "Let's make sure you complete your workout today! What time works best for you?"

---

## Testing

### Run All Tests
```bash
npm test
```

### Run Tone Filter Tests Only
```bash
node __tests__/toneFilterService.test.js
```

### Test Coverage

The tone filter test suite includes **33 comprehensive tests** covering:
- ✅ Safe responses pass validation
- ✅ Judgmental phrases detection
- ✅ Sarcasm and passive-aggression detection
- ✅ Harmful diet/fitness advice detection
- ✅ Prescriptive command detection
- ✅ Body shaming and moral framing detection
- ✅ Misgendering and non-inclusive language detection
- ✅ Emotional insensitivity detection
- ✅ Ableist language detection
- ✅ Sentiment analysis
- ✅ Edge cases (null, undefined, empty)
- ✅ Multiple issues in single response
- ✅ Proper structure validation

### Manual Testing

**Test a response:**
```javascript
const { validateTone } = require('./src/services/toneFilterService');

const response = "Your test message here";
const result = validateTone(response);

console.log('Safe:', result.safe);
console.log('Issues:', result.issues);
console.log('Severity:', result.severity);
console.log('Sentiment:', result.sentiment);
```

**Expected output structure:**
```javascript
{
  safe: true/false,
  issues: ['issue 1', 'issue 2', ...],
  severity: 'low' | 'medium' | 'high',
  sentiment: 'positive' | 'neutral' | 'negative',
  details: {
    toneIssuesFound: 0,
    sentimentScore: 0.5
  }
}
```

## Configuration

### Environment Variables

No additional environment variables required. The tone filter works out-of-the-box with the existing STRUKT configuration.

### Tuning Sensitivity

To adjust tone filter sensitivity, modify patterns in `src/services/toneFilterService.js`:

```javascript
// Example: Make pattern more/less strict
{
  pattern: /your_regex_here/i,
  issue: 'Description of issue',
  severity: 'low' | 'medium' | 'high',
}
```

### Adding New Rules

1. Open `src/services/toneFilterService.js`
2. Add new pattern to `TONE_SAFETY_RULES` array
3. Follow existing structure:
   - `pattern`: RegExp to match
   - `issue`: Human-readable description
   - `severity`: low/medium/high
4. Add test case in `__tests__/toneFilterService.test.js`
5. Run tests to verify

## Known Limitations

### 1. Pattern-Based Detection
- **Limitation:** Regex patterns can't understand context or intent
- **Impact:** May miss subtle tone issues or flag false positives
- **Mitigation:** Regular pattern updates based on production logs

### 2. Sarcasm Detection
- **Limitation:** Sarcasm is highly contextual and hard to detect
- **Impact:** Some sarcastic responses may slip through
- **Mitigation:** User feedback mechanism for flagging issues

### 3. Cultural Context
- **Limitation:** Tone appropriateness varies by culture
- **Impact:** Some culturally-specific phrases may be misclassified
- **Mitigation:** Continuous learning from diverse user base

### 4. Language Support
- **Limitation:** Currently English-only
- **Impact:** Non-English responses not validated
- **Mitigation:** Future multi-language support planned

### 5. Sentiment Analysis Accuracy
- **Limitation:** Simple keyword-based sentiment (not ML-based)
- **Impact:** May misclassify complex emotional tone
- **Mitigation:** Combined with pattern matching for better coverage

## Future Enhancements

### Short-Term (Next 1-3 months)
- [ ] User feedback mechanism for flagged responses
- [ ] Admin dashboard for tone issue monitoring
- [ ] A/B testing of tone instruction variants
- [ ] Real-time Sentry alerts for high-severity issues

### Medium-Term (3-6 months)
- [ ] ML-based sentiment analysis
- [ ] Context-aware tone validation
- [ ] Multi-language support
- [ ] Automated pattern learning from user feedback

### Long-Term (6-12 months)
- [ ] Real-time tone coaching for AI model
- [ ] Personalized tone profiles
- [ ] Integration with user satisfaction metrics
- [ ] Advanced context understanding

## Troubleshooting

### Issue: Too many false positives

**Solution:** Adjust severity thresholds in `ask.js`:
```javascript
// Current: Triggers on high severity only
if (!toneCheck.safe || toneCheck.severity === 'high') {
  // Fallback
}

// More permissive: Only trigger on high + multiple medium
if (!toneCheck.safe && (toneCheck.severity === 'high' || 
    (toneCheck.severity === 'medium' && toneCheck.issues.length > 2))) {
  // Fallback
}
```

### Issue: Tone issues not logging to database

**Check:**
1. Migration applied? Run: `psql -f db/migrations/20251023_add_tone_issues_column.sql`
2. Service role permissions correct?
3. Check logs for error messages

### Issue: Fallback responses too frequent

**Investigation:**
```javascript
// Add debug logging in ask.js
console.log('Tone check result:', toneCheck);
```

**Common causes:**
- Overly strict patterns
- Model generating unsafe content (needs prompt tuning)
- User profile causing tone mismatches

## Maintenance

### Regular Tasks

**Weekly:**
- Review `tone_issues` logs
- Check for new patterns to add
- Monitor false positive rate

**Monthly:**
- Update patterns based on production data
- Review user feedback
- Test new edge cases

**Quarterly:**
- Comprehensive audit of all tone rules
- Performance review
- Update documentation

### Monitoring Queries

```sql
-- Weekly tone issue summary
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_logs,
  COUNT(*) FILTER (WHERE tone_issues IS NOT NULL) as logs_with_issues,
  ROUND(100.0 * COUNT(*) FILTER (WHERE tone_issues IS NOT NULL) / COUNT(*), 2) as issue_rate
FROM ai_coach_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY week
ORDER BY week DESC;

-- Most common tone issues
SELECT 
  UNNEST(tone_issues) as issue_type,
  COUNT(*) as frequency
FROM ai_coach_logs
WHERE tone_issues IS NOT NULL
GROUP BY issue_type
ORDER BY frequency DESC;
```

## Support

For questions or issues:
- Technical lead: Review `/docs` directory
- Production issues: Check Sentry alerts
- Feature requests: Open GitHub issue with label `tone-safety`

## References

- [STRUKT System Prompt](/utils/prompts/strukt-system-prompt.txt)
- [Safety Validator](/src/services/safetyValidator.js)
- [Coach Log Service](/src/services/coachLogService.js)
- [Ask Controller](/src/controllers/ask.js)

---

**Last Updated:** 2025-10-23  
**Version:** 1.0.0  
**Maintained by:** STRUKT Engineering Team
