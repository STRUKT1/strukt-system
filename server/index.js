import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ STRUKT Server is live');
});

app.post('/api/ask-coach', async (req, res) => {
  const { email, question } = req.body;

  try {
    const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
    const USERS_TABLE = process.env.AIRTABLE_USER_TABLE_ID;
    const INTERACTIONS_TABLE = 'tblDtOOmahkMYEqmy';
    const MEALS_TABLE = process.env.AIRTABLE_MEALS_TABLE_ID;

    // STEP 1 – Lookup Airtable user
    const userRes = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${USERS_TABLE}?filterByFormula={Email Address}='${email}'`,
      {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
      }
    );

    const user = userRes.data.records?.[0];
    if (!user) throw new Error('❌ No user found');

    const f = user.fields;

    // STEP 2 – Build user context
    const context = `
Name: ${f['Full Name'] || 'Not set'}
Pronouns: ${f['Pronouns'] || 'Not set'}
Main Goal(s): ${f['Main Goal']?.join(', ') || 'Not set'}
Workout Preferences: ${f['Workout Preferences']?.join(', ') || 'Not set'}
Nutrition Style: ${f['Current Nutrition Style']?.join(', ') || 'Not set'}
Allergies: ${f['Allergies & Food Intolerances'] || 'None listed'}
Tone: ${f['Preferred Coaching Tone']?.join(', ') || 'Default'}
`;

    // STEP 3 – Create AI prompt with structured nutrition extraction
    const systemPrompt = `
You are the STRUKT Coach — a structured, inclusive, fitness and nutrition assistant.

Always reply clearly and respectfully, with helpful tone and emojis where useful.

If the question is about **logging a meal**, first extract the following:
- Meal Type (Breakfast, Lunch, Dinner, Snack)
- Description of the food
- Calories
- Protein (grams)
- Carbs (grams)
- Fats (grams)
- Meal Source (Homemade, Branded, Restaurant, AI-Estimated)

If not all values are provided, use AI estimation.

REPLY TO THE USER:

1. ✅ Friendly confirmation of what was logged  
2. 📊 Nutritional estimate (bullet points)  
3. 🔁 Invite to log more or ask a question  

ALSO RETURN THIS JSON AFTER YOUR MESSAGE:
\`\`\`json
{
  "logType": "meal",
  "meal": {
    "mealType": "Snack",
    "description": "Misfits protein bar",
    "calories": 180,
    "protein": 15,
    "carbs": 16,
    "fats": 7,
    "mealSource": "AI-Estimated"
  }
}
\`\`\`

User info:
${context}

User input:
“${question}”
`;

    // STEP 4 – Ask OpenAI
    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const responseRaw = aiRes.data.choices[0]?.message?.content || 'No response generated.';

    // Extract JSON block if present
    const jsonMatch = responseRaw.match(/```json([\s\S]*?)```/);
    let mealData = null;

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.logType === 'meal' && parsed.meal) {
          mealData = parsed.meal;
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse meal JSON block');
      }
    }

    // STEP 5 – Log to Chat Interactions
    try {
      await axios.post(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${INTERACTIONS_TABLE}`,
        {
          records: [
            {
              fields: {
                fldDtbxnE1PyTleqo: [user.id], // User
                fld2eLzWRUnKNR7Im: detectTopic(question), // Topic
                fldgNRKet3scJ8PIe: question, // Message
                fld3vU9nKXNmu6OZV: responseRaw, // AI Response
                fldcHOwNiQlFpwuly: `Chat – ${new Date().toLocaleString()}`, // Name
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ Interaction logged for ${email}`);
    } catch (logErr) {
      console.error('🔥 Airtable interaction logging error:', logErr?.response?.data || logErr.message);
    }

    // STEP 6 – If meal detected, log it
    if (mealData) {
      try {
        await axios.post(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/${MEALS_TABLE}`,
          {
            records: [
              {
                fields: {
                  fldWvzars92kZ6fZu: [user.id], // User
                  fld9KC4EDsgjsMAPa: new Date().toISOString().split('T')[0], // Date
                  fldmvAbVSaBGVNzqS: mealData.mealType, // Meal Type
                  fldtWww1qbE9yJWte: mealData.description, // Description
                  fldQXr3rOcMaBYjOC: mealData.calories, // Calories
                  fldhts0NWA2ekG60o: mealData.protein, // Protein
                  fldOZFMZG8tekyglr: mealData.carbs, // Carbs
                  fldtH1QNiyM8ZaX4V: mealData.fats, // Fats
                  flda7m7J31O2KqV2T: mealData.mealSource, // Meal Source
                },
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log(`✅ Meal logged for ${email}`);
      } catch (mealErr) {
        console.error('🔥 Airtable meal logging error:', mealErr?.response?.data || mealErr.message);
      }
    }

    // Respond to frontend
    res.json({ success: true, email, response: responseRaw });
  } catch (err) {
    console.error('🔥 Main error:', err.message);
    res.json({
      success: false,
      email,
      response: 'Something went wrong. Please try again shortly.',
    });
  }
});

// Topic detection
function detectTopic(text) {
  const t = text.toLowerCase();
  if (t.includes('meal') || t.includes('calories') || t.includes('food')) return 'Nutrition';
  if (t.includes('workout') || t.includes('gym')) return 'Workout';
  if (t.includes('sleep')) return 'Sleep';
  if (t.includes('mood') || t.includes('feeling')) return 'Mindset';
  if (t.includes('help') || t.includes('confused')) return 'Support';
  return 'Other';
}

app.listen(PORT, () => console.log(`🚀 STRUKT server running on port ${PORT}`));
