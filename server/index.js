import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('🚀 STRUKT Server is live');
});

app.post('/api/ask-coach', async (req, res) => {
  const { email, question } = req.body;

  try {
    // ENV vars
    const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
    const USERS_TABLE = process.env.AIRTABLE_USER_TABLE_ID;
    const CHAT_TABLE = 'tblDtOOmahkMYEqmy';

    // Step 1 – Look up user
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

    // Step 2 – Build prompt
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

    // Step 3 – Get OpenAI response
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

    const reply = aiRes.data.choices?.[0]?.message?.content || 'No reply generated.';

    // Step 4 – Log interaction to Airtable using field IDs
    try {
      await axios.post(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${CHAT_TABLE}`,
        {
          records: [
            {
              fields: {
                fldcHOwNiQlFpwuly: `Chat – ${new Date().toLocaleString()}`, // Name
                fldDtbxnE1PyTleqo: [user.id], // User
                fldkDFXOrqWv8t9Sx: [f['Email Address']], // User Email
                fld2eLzWRUnKNR7Im: detectTopic(question), // Topic
                fldgNRKet3scJ8PIe: question, // Message
                fld3vU9nKXNmu6OZV: reply, // AI Response
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
      console.log(`✅ Chat interaction logged for ${email}`);
    } catch (err) {
      console.error('⚠️ Could not log chat interaction:', err.message);
    }

    // Step 5 – Return response to frontend
    res.json({ success: true, email, response: reply });
  } catch (err) {
    console.error('🔥 ERROR:', err.message);
    res.json({
      success: false,
      email,
      response: 'Sorry, something went wrong. Please try again later.',
    });
  }
});

// Utility: topic detection
function detectTopic(text) {
  const t = text.toLowerCase();
  if (t.includes('meal') || t.includes('calories') || t.includes('food')) return 'Nutrition';
  if (t.includes('workout') || t.includes('gym') || t.includes('exercise')) return 'Workout';
  if (t.includes('motivation') || t.includes('mind') || t.includes('feel')) return 'Mindset';
  if (t.includes('help') || t.includes('confused') || t.includes('don’t know')) return 'Support';
  return 'Other';
}

app.listen(PORT, () => console.log(`🧠 STRUKT Coach API running on port ${PORT}`));
