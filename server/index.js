import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('STRUKT Server is live 💪');
});

app.post('/api/ask-coach', async (req, res) => {
  const { email, question } = req.body;

  try {
    const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
    const USERS_TABLE = process.env.AIRTABLE_USER_TABLE_ID;

    // Table IDs
    const INTERACTIONS_TABLE = 'tblDtOOmahkMYEqmy';
    const MEALS_TABLE = 'tblkYvKY9ZcmzpYh8';
    const WORKOUTS_TABLE = 'tbl0p3sNf6Fc2iGkM';
    const SUPPLEMENTS_TABLE = 'tblMiBUPYbIYZU3he';
    const SLEEP_TABLE = 'tblOWX9q9jBRWve2j';
    const MOOD_TABLE = 'tblFrNgZZIgsd0ZoC';
    const REFLECTIONS_TABLE = 'tblswZwN7rc66Tbpw';

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
    const userId = user.id;

    // STEP 2 – Build context
    const context = `
Name: ${f['Full Name'] || 'Not set'}
Pronouns: ${f['Pronouns'] || 'Not set'}
Gender Identity: ${f['Gender Identity'] || 'Not set'}
Main Goal(s): ${f['Main Goal']?.join(', ') || 'Not set'}
Workout Preferences: ${f['Workout Preferences']?.join(', ') || 'Not set'}
Equipment Access: ${f['Equipment Access'] || 'Not set'}
Injuries / Limitations: ${f['Do you have any injuries or movement limitations we should be aware of?'] || 'None noted'}
Nutrition Style: ${f['Current Nutrition Style']?.join(', ') || 'Not set'}
Allergies: ${f['Allergies & Food Intolerances'] || 'None listed'}
Preferred Tone: ${f['Preferred Coaching Tone']?.join(', ') || 'Default'}
Vision of Success: ${f['Vision of Success'] || ''}
`;

    // STEP 3 – Coach Instructions
    const systemPrompt = `
You are the STRUKT Coach — a warm, smart, structured fitness and mindset AI.

Use inclusive, supportive tone. Speak like a top-tier coach: clear, focused, practical, non-judgmental.

Use emojis where helpful: 
✅ confirmation, 💡 tips, 📊 insights, 💬 prompts, 🏋️ workouts, 🍽️ meals, 🧠 mindset, 🌙 sleep, 🔁 tracking.

User Context:
${context}

Give the best possible reply to this question:
“${question}”
`;

    // STEP 4 – Ask OpenAI
    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.8,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const response = aiRes.data.choices[0]?.message?.content || 'No response generated.';

    // STEP 5 – Log to Chat Interactions
    try {
      await axios.post(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${INTERACTIONS_TABLE}`,
        {
          records: [
            {
              fields: {
                Name: `Chat – ${new Date().toLocaleString()}`,
                User: [userId],
                'User Email': [f['Email Address']],
                Topic: detectTopic(question),
                Message: question,
                'AI Response': response,
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
    } catch (err) {
      console.error('⚠️ Could not log chat interaction:', err.message);
    }

    // STEP 6 – Try Auto Logging
    try {
      const today = new Date().toISOString().split('T')[0];
      const autoLogPayload = {
        records: [
          {
            fields: {
              Name: question,
              User: [userId],
              'User Email': [f['Email Address']],
              Date: today,
              Description: response,
              Notes: response,
            },
          },
        ],
      };

      const logTable = detectLogTable(question);
      const tableMap = {
        Meal: MEALS_TABLE,
        Workout: WORKOUTS_TABLE,
        Supplement: SUPPLEMENTS_TABLE,
        Sleep: SLEEP_TABLE,
        Mood: MOOD_TABLE,
        Reflection: REFLECTIONS_TABLE,
      };

      const tableId = tableMap[logTable];
      if (tableId) {
        await axios.post(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/${tableId}`,
          autoLogPayload,
          {
            headers: {
              Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log(`✅ Auto-logged to ${logTable} table`);
      }
    } catch (err) {
      console.error('⚠️ Auto-log failed:', err.message);
    }

    res.json({ success: true, email, response });
  } catch (err) {
    console.error('🔥 ERROR:', err.message);
    res.json({
      success: false,
      email,
      response: 'Sorry, something went wrong. Please try again later.',
    });
  }
});

// Utility – Topic tagging
function detectTopic(text) {
  const t = text.toLowerCase();
  if (t.includes('meal') || t.includes('calories') || t.includes('food')) return 'Nutrition';
  if (t.includes('workout') || t.includes('gym') || t.includes('exercise')) return 'Workout';
  if (t.includes('motivation') || t.includes('mind') || t.includes('feel')) return 'Mindset';
  if (t.includes('help') || t.includes('confused') || t.includes('don’t know')) return 'Support';
  return 'Other';
}

// Utility – Logging category routing
function detectLogTable(text) {
  const t = text.toLowerCase();
  if (t.includes('meal') || t.includes('breakfast') || t.includes('lunch') || t.includes('dinner')) return 'Meal';
  if (t.includes('gym') || t.includes('workout') || t.includes('exercise')) return 'Workout';
  if (t.includes('creatine') || t.includes('vitamin') || t.includes('supplement')) return 'Supplement';
  if (t.includes('sleep') || t.includes('bed') || t.includes('wake')) return 'Sleep';
  if (t.includes('mood') || t.includes('energy') || t.includes('feeling')) return 'Mood';
  if (t.includes('reflection') || t.includes('review') || t.includes('check-in')) return 'Reflection';
  return null;
}

app.listen(PORT, () => console.log(`🚀 STRUKT Server running on ${PORT}`));
