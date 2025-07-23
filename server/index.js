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
    const CHAT_TABLE = 'tblDtOOmahkMYEqmy';

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

    // STEP 3 – AI system prompt
    const systemPrompt = `
You are the STRUKT Coach — a warm, structured, intelligent fitness and lifestyle assistant.

Speak like a world-class coach: clear, kind, confident, and data-driven. Always be non-judgmental, inclusive, and motivational.

Use this user context:
${context}

Answer the question: "${question}"
`;

    // STEP 4 – Ask OpenAI
    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.75,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const response = aiRes.data.choices[0]?.message?.content || 'No response generated.';

    // STEP 5 – Log chat interaction
    try {
      await axios.post(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${CHAT_TABLE}`,
        {
          records: [
            {
              fields: {
                fldDtbxnE1PyTleqo: [user.id], // User (linked)
                fld2eLzWRUnKNR7Im: detectTopic(question), // Topic
                fldgNRKet3scJ8PIe: question, // Message
                fld3vU9nKXNmu6OZV: response, // AI Response
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
      console.error('🔥 Airtable LOGGING ERROR:', logErr?.response?.data || logErr.message);
    }

    // (Optional) STEP 6 – Future: auto-log to Meals, Workouts, etc.
    // Placeholder for now, ready to activate logging triggers below:
    // await autoLogToMealsIfApplicable(question, user.id);
    // await autoLogToWorkoutsIfApplicable(question, user.id);
    // ... etc.

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

// Topic detection for tagging
function detectTopic(text) {
  const t = text.toLowerCase();
  if (t.includes('meal') || t.includes('calories') || t.includes('food')) return 'Nutrition';
  if (t.includes('workout') || t.includes('gym') || t.includes('exercise')) return 'Workout';
  if (t.includes('sleep')) return 'Sleep';
  if (t.includes('supplement') || t.includes('creatine') || t.includes('vitamin')) return 'Supplements';
  if (t.includes('mood') || t.includes('emotion') || t.includes('feel')) return 'Mindset';
  if (t.includes('reflect') || t.includes('review')) return 'Support';
  return 'Other';
}

app.listen(PORT, () => console.log(`🚀 STRUKT Server running on ${PORT}`));
