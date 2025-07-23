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
    const INTERACTIONS_TABLE = 'tblDtOOmahkMYEqmy'; // Chat Interactions table

    // STEP 1 – Lookup Airtable user
    const userRes = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${USERS_TABLE}?filterByFormula={Email Address}='${email}'`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        },
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

    // STEP 5 – Log to Chat Interactions table
    try {
      await axios.post(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${INTERACTIONS_TABLE}`,
        {
          records: [
            {
              fields: {
                User: [user.id], // Airtable record ID of the user
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
      console.log(`✅ Interaction logged for ${email}`);
    } catch (logErr) {
      console.error('🔥 Airtable LOGGING ERROR:', logErr.response?.data || logErr.message);
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

// Utility: Quick topic tagging
function detectTopic(text) {
  const t = text.toLowerCase();
  if (t.includes('meal') || t.includes('calories') || t.includes('food')) return 'Nutrition';
  if (t.includes('workout') || t.includes('gym') || t.includes('exercise')) return 'Workout';
  if (t.includes('motivation') || t.includes('mind') || t.includes('feel')) return 'Mindset';
  if (t.includes('help') || t.includes('confused') || t.includes('don’t know')) return 'Support';
  return 'Other';
}

app.listen(PORT, () => console.log(`🚀 STRUKT Server running on ${PORT}`));
